package com.edusphere.agent.domain.rule

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.edusphere.agent.data.remote.model.ViolationRequest
import com.edusphere.agent.domain.repository.DeviceRepository
import com.edusphere.agent.domain.action.DeviceActionManager
import com.edusphere.agent.data.local.SharedPreferencesManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class RuleDetector @Inject constructor(
    @ApplicationContext private val context: Context,
    private val deviceRepository: DeviceRepository,
    private val actionManager: DeviceActionManager,
    private val sharedPreferencesManager: SharedPreferencesManager
) {
    // In a real scenario, these lists would be fetched from the server and cached locally
    private var whitelist: List<String> = emptyList()
    private var blacklist: List<String> = emptyList()
    private var isWhitelistMode = false

    private var violatingPackage: String? = null
    private var lastViolationSentTime: Long = 0L

    fun updatePolicies(whitelist: List<String>, blacklist: List<String>, isWhitelistMode: Boolean) {
        this.whitelist = whitelist
        this.blacklist = blacklist
        this.isWhitelistMode = isWhitelistMode
    }

    suspend fun checkForegroundApp(currentApp: com.edusphere.agent.data.remote.model.CurrentApp?) {
        if (sharedPreferencesManager.isMdmPaused()) {
            return // Skip checks if paused
        }

        val packageName = currentApp?.packageName
        val appName = currentApp?.appName ?: packageName

        if (packageName == null || packageName.isEmpty()) return

        // Ignore system UI, launchers, and device manufacturer packages (Home screens)
        val isLauncherOrSystem = packageName.contains("launcher") || 
            packageName.contains("home") || 
            packageName.contains("trebuchet") ||
            packageName.contains("systemui") ||
            packageName.startsWith("com.android.") ||
            packageName.startsWith("com.sec.") ||
            packageName.startsWith("com.samsung.") ||
            packageName.startsWith("com.miui.")

        if (isLauncherOrSystem) {
            violatingPackage = null
            lastViolationSentTime = 0L
            return
        }

        var isViolated = false
        var details = ""

        // Cách 1: Đọc Category trực tiếp từ hệ điều hành Android (Android 8.0+)
        var isCategoryBlocked = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val appInfo = context.packageManager.getApplicationInfo(packageName, 0)
                when (appInfo.category) {
                    ApplicationInfo.CATEGORY_GAME -> {
                        isCategoryBlocked = true
                        details = "App $packageName is a Game (CATEGORY_GAME)."
                    }
                    ApplicationInfo.CATEGORY_SOCIAL -> {
                        isCategoryBlocked = true
                        details = "App $packageName is Social Media (CATEGORY_SOCIAL)."
                    }
                    ApplicationInfo.CATEGORY_VIDEO -> {
                        isCategoryBlocked = true
                        details = "App $packageName is Video Entertainment (CATEGORY_VIDEO)."
                    }
                    ApplicationInfo.CATEGORY_AUDIO -> {
                        isCategoryBlocked = true
                        details = "App $packageName is Audio Entertainment (CATEGORY_AUDIO)."
                    }
                }
            } catch (e: PackageManager.NameNotFoundException) {
                // Ignore if package not found
            }
        }

        if (isCategoryBlocked) {
            isViolated = true
        }
        // Check hardcoded forbidden apps (Fallback)
        else if (packageName == "com.facebook.katana" || 
            packageName == "com.google.android.youtube" ||
            packageName == "com.zhiliaoapp.musically" || 
            packageName == "com.ss.android.ugc.trill") {
            isViolated = true
            details = "App $packageName is explicitly forbidden for studying."
        } else if (isWhitelistMode) {
            if (!whitelist.contains(packageName)) {
                isViolated = true
                details = "App $packageName is not in the whitelist."
            }
        } else {
            if (blacklist.contains(packageName)) {
                isViolated = true
                details = "App $packageName is blacklisted."
            }
        }

        if (isViolated) {
            Log.w("RuleDetector", "Violation detected: $details")
            
            // LUÔN LUÔN khoá/đẩy học sinh ra khỏi app NGAY LẬP TỨC
            actionManager.clearRecents()
            val alertMsg = if (appName != null) "Bị chặn do dùng ứng dụng giải trí: $appName!" else "Ứng dụng bị khóa do vi phạm nội quy!"
            actionManager.showAlert("Cảnh Báo Vi Phạm!", alertMsg, "WARNING")

            // Gửi log lên server, có chống spam (chỉ gửi mỗi 10 giây cho cùng 1 app)
            val now = System.currentTimeMillis()
            if (violatingPackage != packageName || (now - lastViolationSentTime > 10_000)) {
                violatingPackage = packageName
                lastViolationSentTime = now
                
                val deviceInfo = deviceRepository.getDeviceInfo()
                if (deviceInfo != null) {
                    val request = ViolationRequest(
                        deviceId = deviceInfo.deviceId,
                        eventType = "BLACKLIST_APP_DETECTED",
                        timestamp = now,
                        payload = mapOf(
                            "packageName" to packageName,
                            "details" to details
                        )
                    )
                    deviceRepository.sendViolation(request)
                }
            }
        } else {
            // Không vi phạm (mở app hợp lệ), reset trạng thái
            violatingPackage = null
            lastViolationSentTime = 0L
        }
    }
}

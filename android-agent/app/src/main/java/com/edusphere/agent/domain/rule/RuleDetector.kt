package com.edusphere.agent.domain.rule

import android.util.Log
import com.edusphere.agent.data.remote.model.ViolationRequest
import com.edusphere.agent.domain.repository.DeviceRepository
import com.edusphere.agent.domain.action.DeviceActionManager
import com.edusphere.agent.data.local.SharedPreferencesManager
import javax.inject.Inject

class RuleDetector @Inject constructor(
    private val deviceRepository: DeviceRepository,
    private val actionManager: DeviceActionManager,
    private val sharedPreferencesManager: SharedPreferencesManager
) {
    // In a real scenario, these lists would be fetched from the server and cached locally
    private var whitelist: List<String> = emptyList()
    private var blacklist: List<String> = emptyList()
    private var isWhitelistMode = false

    private var violatingPackage: String? = null
    private var violationStartTime: Long = 0L

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
            // Nếu đang ở màn hình chính thì reset bộ đếm vi phạm
            violatingPackage = null
            violationStartTime = 0L
            return
        }

        var isViolated = false
        var details = ""

        // Check hardcoded forbidden apps
        if (packageName == "com.facebook.katana" || packageName == "com.google.android.youtube") {
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
            if (violatingPackage != packageName) {
                // Bắt đầu đếm thời gian vi phạm mới
                violatingPackage = packageName
                violationStartTime = System.currentTimeMillis()
                Log.d("RuleDetector", "Bắt đầu tính giờ vi phạm: $packageName")
            } else {
                // Đang tiếp tục vi phạm, kiểm tra xem đã quá 20s chưa
                val duration = System.currentTimeMillis() - violationStartTime
                if (duration >= 20_000) {
                    Log.w("RuleDetector", "Violation detected for over 20 seconds: $details")
                    
                    // Khoá / đẩy học sinh ra khỏi app
                    actionManager.clearRecents()
                    val alertMsg = if (appName != null) "Bị chặn do dùng ứng dụng: $appName quá 20 giây!" else "Ứng dụng bị khóa do dùng quá 20 giây trong giờ học!"
                    actionManager.showAlert("Cảnh Báo Vi Phạm!", alertMsg, "WARNING")

                    // Gửi log lên server
                    val deviceInfo = deviceRepository.getDeviceInfo()
                    if (deviceInfo != null) {
                        val request = ViolationRequest(
                            deviceId = deviceInfo.deviceId,
                            eventType = "BLACKLIST_APP_DETECTED",
                            timestamp = System.currentTimeMillis(),
                            payload = mapOf(
                                "packageName" to packageName,
                                "details" to details,
                                "duration" to duration
                            )
                        )
                        deviceRepository.sendViolation(request)
                    }

                    // Reset lại để nếu học sinh lại cố tình vào, nó sẽ cho thêm 20s nữa rồi mới khoá tiếp.
                    violatingPackage = null
                    violationStartTime = 0L
                }
            }
        } else {
            // Không vi phạm (mở app hợp lệ), reset bộ đếm
            violatingPackage = null
            violationStartTime = 0L
        }
    }
}

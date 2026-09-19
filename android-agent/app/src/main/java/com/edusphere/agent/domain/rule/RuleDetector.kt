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
        // Ignore system UI, launchers, and device manufacturer packages
        if (packageName.contains("android.systemui") || 
            packageName.contains("launcher") || 
            packageName.startsWith("com.android.") ||
            packageName.startsWith("com.sec.") ||
            packageName.startsWith("com.samsung.")) return

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
            Log.w("RuleDetector", "Violation detected: $details")
            
            // Push student out of the forbidden app immediately
            actionManager.clearRecents()
            val alertMsg = if (appName != null) "Bị chặn tự động do dùng ứng dụng: $appName" else "Ứng dụng này đã bị khóa do vi phạm nội quy học tập!"
            actionManager.showAlert(alertMsg)

            val deviceInfo = deviceRepository.getDeviceInfo()
            if (deviceInfo != null) {
                val request = ViolationRequest(
                    deviceId = deviceInfo.deviceId,
                    eventType = "BLACKLIST_APP_DETECTED",
                    timestamp = System.currentTimeMillis(),
                    payload = mapOf(
                        "packageName" to packageName,
                        "details" to details
                    )
                )
                deviceRepository.sendViolation(request)
            }
        }
    }
}

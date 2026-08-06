package com.edusphere.agent.domain.rule

import android.util.Log
import com.edusphere.agent.data.remote.model.ViolationRequest
import com.edusphere.agent.domain.repository.DeviceRepository
import javax.inject.Inject

class RuleDetector @Inject constructor(
    private val deviceRepository: DeviceRepository
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

    suspend fun checkForegroundApp(packageName: String?) {
        if (packageName == null) return
        // Ignore system UI and launcher
        if (packageName.contains("android.systemui") || packageName.contains("launcher")) return

        var isViolated = false
        var details = ""

        if (isWhitelistMode) {
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
            val deviceInfo = deviceRepository.getDeviceInfo()
            if (deviceInfo != null) {
                val request = ViolationRequest(
                    deviceId = deviceInfo.deviceId,
                    violationType = "UNAUTHORIZED_APP",
                    details = details,
                    timestamp = System.currentTimeMillis()
                )
                deviceRepository.sendViolation(request)
            }
        }
    }
}

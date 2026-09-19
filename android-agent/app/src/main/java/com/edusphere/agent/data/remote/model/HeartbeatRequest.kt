package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class HeartbeatRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("metrics") val metrics: DeviceMetrics,
    @SerializedName("currentApp") val currentApp: CurrentApp? = null
)

data class DeviceMetrics(
    @SerializedName("ramTotalMb") val ramTotalMb: Int,
    @SerializedName("ramUsedMb") val ramUsedMb: Int,
    @SerializedName("ramUsagePct") val ramUsagePct: Double,
    @SerializedName("cpuUsagePct") val cpuUsagePct: Double,
    @SerializedName("storageTotalGb") val storageTotalGb: Double,
    @SerializedName("storageUsedGb") val storageUsedGb: Double,
    @SerializedName("batteryLevel") val batteryLevel: Int,
    @SerializedName("batteryCharging") val batteryCharging: Boolean,
    @SerializedName("wifiSsid") val wifiSsid: String?,
    @SerializedName("wifiSignal") val wifiSignal: Int,
    @SerializedName("ipAddress") val ipAddress: String?
)

data class CurrentApp(
    @SerializedName("packageName") val packageName: String,
    @SerializedName("appName") val appName: String,
    @SerializedName("appIconBase64") val appIconBase64: String? = null
)

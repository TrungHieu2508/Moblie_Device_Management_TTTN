package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class HeartbeatRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("metrics") val metrics: DeviceMetrics
)

data class DeviceMetrics(
    @SerializedName("cpuUsage") val cpuUsage: Float,
    @SerializedName("ramUsage") val ramUsage: Float,
    @SerializedName("storageUsage") val storageUsage: Float,
    @SerializedName("batteryLevel") val batteryLevel: Int,
    @SerializedName("wifiSsid") val wifiSsid: String?,
    @SerializedName("currentForegroundApp") val currentForegroundApp: String?
)

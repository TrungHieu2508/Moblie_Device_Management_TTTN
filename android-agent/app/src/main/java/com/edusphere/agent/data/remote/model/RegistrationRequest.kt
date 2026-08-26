package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class RegistrationRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("serialNumber") val serialNumber: String,
    @SerializedName("model") val model: String,
    @SerializedName("androidVersion") val androidVersion: String,
    @SerializedName("agentVersion") val agentVersion: String,
    @SerializedName("macAddress") val macAddress: String? = null,
    @SerializedName("enrollmentCode") val enrollmentCode: String? = null
)

package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class ViolationRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("violationType") val violationType: String,
    @SerializedName("details") val details: String,
    @SerializedName("timestamp") val timestamp: Long
)

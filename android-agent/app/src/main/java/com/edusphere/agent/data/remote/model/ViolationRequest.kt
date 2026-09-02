package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class ViolationRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("eventType") val eventType: String,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("payload") val payload: Map<String, Any>
)

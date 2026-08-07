package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class CommandDto(
    @SerializedName("id") val id: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("commandType") val commandType: String, // LOCK_SCREEN, WIPE_DATA, RING_ALARM, etc.
    @SerializedName("payload") val payload: Map<String, Any>?,
    @SerializedName("status") val status: String,
    @SerializedName("errorMessage") val errorMessage: String?,
    @SerializedName("createdAt") val createdAt: String?,
    @SerializedName("sentAt") val sentAt: String?,
    @SerializedName("acknowledgedAt") val acknowledgedAt: String?,
    @SerializedName("executedAt") val executedAt: String?,
    @SerializedName("createdBy") val createdBy: String?
)

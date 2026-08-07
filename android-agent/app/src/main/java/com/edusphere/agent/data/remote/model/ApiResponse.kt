package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("status") val status: Int,
    @SerializedName("message") val message: String?,
    @SerializedName("data") val data: T?,
    @SerializedName("timestamp") val timestamp: String?
)

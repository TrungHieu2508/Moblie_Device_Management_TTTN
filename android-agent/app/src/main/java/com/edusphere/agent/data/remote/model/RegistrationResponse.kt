package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class RegistrationResponse(
    @SerializedName("deviceUuid") val deviceUuid: String,
    @SerializedName("registrationToken") val registrationToken: String,
    @SerializedName("tokenExpiresAt") val tokenExpiresAt: String,
    @SerializedName("campusName") val campusName: String?,
    @SerializedName("schoolName") val schoolName: String?,
    @SerializedName("classroomName") val classroomName: String?,
    @SerializedName("serverConfig") val serverConfig: ServerConfig
)

data class ServerConfig(
    @SerializedName("heartbeatIntervalSeconds") val heartbeatIntervalSeconds: Int,
    @SerializedName("websocketUrl") val websocketUrl: String
)

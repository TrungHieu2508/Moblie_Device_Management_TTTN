package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class HeartbeatResponse(
    @SerializedName("nextHeartbeatSeconds") val nextHeartbeatSeconds: Int,
    @SerializedName("pendingCommands") val pendingCommands: Int
)

package com.edusphere.agent.data.remote.model

import com.google.gson.annotations.SerializedName

data class CommandAckRequest(
    @SerializedName("status") val status: String, // ACKNOWLEDGED, EXECUTED, FAILED
    @SerializedName("errorMessage") val errorMessage: String? = null
)

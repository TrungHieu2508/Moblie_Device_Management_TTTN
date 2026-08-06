package com.edusphere.agent.data.remote

import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.data.remote.model.HeartbeatResponse
import com.edusphere.agent.data.remote.model.RegistrationRequest
import com.edusphere.agent.data.remote.model.RegistrationResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface MdmApiService {
    @POST("api/v1/devices/register")
    suspend fun registerDevice(@Body request: RegistrationRequest): Response<RegistrationResponse>

    @POST("api/v1/devices/heartbeat")
    suspend fun sendHeartbeat(
        @Header("Authorization") token: String,
        @Body request: HeartbeatRequest
    ): Response<HeartbeatResponse>
}

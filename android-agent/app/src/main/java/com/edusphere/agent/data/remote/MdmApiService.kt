package com.edusphere.agent.data.remote

import com.edusphere.agent.data.remote.model.ApiResponse
import com.edusphere.agent.data.remote.model.CommandAckRequest
import com.edusphere.agent.data.remote.model.CommandDto
import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.data.remote.model.HeartbeatResponse
import com.edusphere.agent.data.remote.model.RegistrationRequest
import com.edusphere.agent.data.remote.model.RegistrationResponse
import com.edusphere.agent.data.remote.model.ViolationRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface MdmApiService {
    @POST("api/devices/register")
    suspend fun registerDevice(@Body request: RegistrationRequest): Response<ApiResponse<RegistrationResponse>>

    @POST("api/devices/heartbeat")
    suspend fun sendHeartbeat(
        @Header("Authorization") token: String,
        @Body request: HeartbeatRequest
    ): Response<ApiResponse<HeartbeatResponse>>

    @POST("api/devices/event")
    suspend fun sendEvent(
        @Header("Authorization") token: String,
        @Body request: ViolationRequest // Note: Mapped to DeviceEventRequest in backend
    ): Response<ApiResponse<Void>>

    // --- PHASE 5: COMMAND QUEUE ---
    @GET("api/agent/commands/pending")
    suspend fun getPendingCommands(
        @Header("Authorization") token: String
    ): Response<ApiResponse<List<CommandDto>>>

    @POST("api/agent/commands/{commandId}/ack")
    suspend fun acknowledgeCommand(
        @Header("Authorization") token: String,
        @Path("commandId") commandId: String,
        @Body request: CommandAckRequest
    ): Response<ApiResponse<Void>>
}

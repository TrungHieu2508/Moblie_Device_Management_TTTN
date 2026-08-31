package com.edusphere.agent.domain.repository

import com.edusphere.agent.data.local.DeviceEntity
import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.data.remote.model.RegistrationRequest
import com.edusphere.agent.data.remote.model.ViolationRequest

import com.edusphere.agent.data.remote.model.CommandDto

interface DeviceRepository {
    suspend fun getDeviceInfo(): DeviceEntity?
    suspend fun registerDevice(request: RegistrationRequest): Result<Boolean>
    suspend fun sendHeartbeat(request: HeartbeatRequest): Int
    suspend fun sendViolation(request: ViolationRequest): Boolean
    suspend fun fetchPendingCommands(): List<CommandDto>
    suspend fun acknowledgeCommand(commandId: String, status: String, errorMessage: String? = null): Boolean
    suspend fun clearDeviceInfo()
}

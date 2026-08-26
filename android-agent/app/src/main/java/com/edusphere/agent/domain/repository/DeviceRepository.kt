package com.edusphere.agent.domain.repository

import com.edusphere.agent.data.local.DeviceEntity
import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.data.remote.model.RegistrationRequest
import com.edusphere.agent.data.remote.model.ViolationRequest

interface DeviceRepository {
    suspend fun getDeviceInfo(): DeviceEntity?
    suspend fun registerDevice(request: RegistrationRequest): Result<Boolean>
    suspend fun sendHeartbeat(request: HeartbeatRequest): Boolean
    suspend fun sendViolation(request: ViolationRequest): Boolean
}

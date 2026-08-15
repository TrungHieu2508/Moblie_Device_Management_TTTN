package com.edusphere.agent.data.repository

import android.util.Log
import com.edusphere.agent.data.local.DeviceDao
import com.edusphere.agent.data.local.DeviceEntity
import com.edusphere.agent.data.remote.MdmApiService
import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.data.remote.model.RegistrationRequest
import com.edusphere.agent.data.remote.model.ViolationRequest
import com.edusphere.agent.domain.repository.DeviceRepository
import javax.inject.Inject

class DeviceRepositoryImpl @Inject constructor(
    private val apiService: MdmApiService,
    private val deviceDao: DeviceDao
) : DeviceRepository {

    override suspend fun getDeviceInfo(): DeviceEntity? {
        return deviceDao.getDeviceInfo()
    }

    override suspend fun registerDevice(request: RegistrationRequest): Boolean {
        return try {
            val response = apiService.registerDevice(request)
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.data != null) {
                    val data = body.data
                    val entity = DeviceEntity(
                        deviceId = request.deviceId,
                        deviceName = request.deviceName,
                        registrationToken = data.registrationToken,
                        serverUrl = data.serverConfig.websocketUrl,
                        isRegistered = true
                    )
                    deviceDao.insertDeviceInfo(entity)
                    true
                } else {
                    false
                }
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Registration failed", e)
            false
        }
    }

    override suspend fun sendHeartbeat(request: HeartbeatRequest): Boolean {
        return try {
            val deviceInfo = getDeviceInfo() ?: return false
            val token = "Bearer ${deviceInfo.registrationToken}"
            val response = apiService.sendHeartbeat(token, request)
            response.isSuccessful
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Heartbeat failed", e)
            false
        }
    }

    override suspend fun sendViolation(request: ViolationRequest): Boolean {
        return try {
            val deviceInfo = getDeviceInfo() ?: return false
            val token = "Bearer ${deviceInfo.registrationToken}"
            val response = apiService.sendEvent(token, request)
            response.isSuccessful
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Send violation failed", e)
            false
        }
    }
}

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

    override suspend fun clearDeviceInfo() {
        deviceDao.clearDeviceInfo()
    }

    override suspend fun registerDevice(request: RegistrationRequest): Result<Boolean> {
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
                        campusName = data.campusName,
                        schoolName = data.schoolName,
                        isRegistered = true
                    )
                    deviceDao.insertDeviceInfo(entity)
                    Result.success(true)
                } else {
                    Log.e("DeviceRepositoryImpl", "Registration failed with response body null")
                    Result.failure(Exception("Lỗi phản hồi từ máy chủ (Dữ liệu rỗng)."))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                Log.e("DeviceRepositoryImpl", "Registration failed with code: ${response.code()}, error: $errorBody")
                val errorMessage = if (response.code() == 400 || response.code() == 403) {
                    "Đăng ký thất bại. Mã Enrollment không hợp lệ hoặc thiết bị đã tồn tại."
                } else {
                    "Lỗi máy chủ (${response.code()}). Vui lòng thử lại sau."
                }
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Registration failed", e)
            Result.failure(Exception("Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối mạng."))
        }
    }

    override suspend fun sendHeartbeat(request: HeartbeatRequest): Int {
        return try {
            val deviceInfo = getDeviceInfo() ?: return -1
            val token = "Device ${deviceInfo.registrationToken}"
            val response = apiService.sendHeartbeat(token, request)
            if (response.isSuccessful) {
                response.body()?.data?.pendingCommands ?: 0
            } else {
                -1
            }
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Heartbeat failed", e)
            -1
        }
    }

    override suspend fun sendViolation(request: ViolationRequest): Boolean {
        return try {
            val deviceInfo = getDeviceInfo() ?: return false
            val token = "Device ${deviceInfo.registrationToken}"
            val response = apiService.sendEvent(token, request)
            response.isSuccessful
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Send violation failed", e)
            false
        }
    }

    override suspend fun fetchPendingCommands(): List<com.edusphere.agent.data.remote.model.CommandDto> {
        return try {
            val deviceInfo = getDeviceInfo() ?: return emptyList()
            val token = "Device ${deviceInfo.registrationToken}"
            val response = apiService.getPendingCommands(token)
            if (response.isSuccessful) {
                response.body()?.data ?: emptyList()
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Fetch pending commands failed", e)
            emptyList()
        }
    }

    override suspend fun acknowledgeCommand(commandId: String, status: String, errorMessage: String?): Boolean {
        return try {
            val deviceInfo = getDeviceInfo() ?: return false
            val token = "Device ${deviceInfo.registrationToken}"
            val request = com.edusphere.agent.data.remote.model.CommandAckRequest(status, errorMessage)
            val response = apiService.acknowledgeCommand(token, commandId, request)
            response.isSuccessful
        } catch (e: Exception) {
            Log.e("DeviceRepositoryImpl", "Acknowledge command failed", e)
            false
        }
    }
}

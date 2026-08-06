package com.edusphere.agent.data.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.edusphere.agent.data.remote.model.DeviceMetrics
import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.domain.repository.DeviceRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class HeartbeatWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val deviceRepository: DeviceRepository
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val deviceInfo = deviceRepository.getDeviceInfo()
        if (deviceInfo == null || !deviceInfo.isRegistered) {
            return Result.failure()
        }

        // Gather metrics (mock for now, will implement in Phase 3)
        val metrics = DeviceMetrics(
            cpuUsage = 0f,
            ramUsage = 0f,
            storageUsage = 0f,
            batteryLevel = 100,
            wifiSsid = null,
            currentForegroundApp = null
        )

        val request = HeartbeatRequest(
            deviceId = deviceInfo.deviceId,
            metrics = metrics
        )

        val success = deviceRepository.sendHeartbeat(request)
        return if (success) {
            Result.success()
        } else {
            Result.retry()
        }
    }
}

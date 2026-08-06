package com.edusphere.agent.data.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.edusphere.agent.data.remote.model.DeviceMetrics
import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.domain.repository.DeviceRepository
import com.edusphere.agent.domain.monitor.DeviceMonitor
import com.edusphere.agent.domain.rule.RuleDetector
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class HeartbeatWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val deviceRepository: DeviceRepository,
    private val deviceMonitor: DeviceMonitor,
    private val ruleDetector: RuleDetector
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val deviceInfo = deviceRepository.getDeviceInfo()
        if (deviceInfo == null || !deviceInfo.isRegistered) {
            return Result.failure()
        }

        // Gather metrics using DeviceMonitor
        val metrics = deviceMonitor.getDeviceMetrics()
        
        // Enforce rules on foreground app
        ruleDetector.checkForegroundApp(metrics.currentForegroundApp)

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

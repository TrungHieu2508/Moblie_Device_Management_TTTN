package com.edusphere.agent.presentation.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.edusphere.agent.data.remote.model.HeartbeatRequest
import com.edusphere.agent.data.remote.websocket.CommandReceiver
import com.edusphere.agent.domain.repository.DeviceRepository
import com.edusphere.agent.domain.monitor.DeviceMonitor
import com.edusphere.agent.domain.rule.RuleDetector
import com.edusphere.agent.data.local.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@AndroidEntryPoint
class HeartbeatService : Service() {

    @Inject
    lateinit var commandReceiver: CommandReceiver

    @Inject
    lateinit var deviceRepository: DeviceRepository

    @Inject
    lateinit var deviceMonitor: DeviceMonitor
    
    @Inject
    lateinit var ruleDetector: RuleDetector

    @Inject
    lateinit var sharedPreferencesManager: SharedPreferencesManager

    private val serviceScope = CoroutineScope(Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        startForegroundService()
        
        serviceScope.launch {
            val deviceInfo = deviceRepository.getDeviceInfo()
            if (deviceInfo != null && deviceInfo.isRegistered) {
                commandReceiver.connect(
                    serverUrl = deviceInfo.serverUrl,
                    token = deviceInfo.registrationToken,
                    deviceId = deviceInfo.deviceId
                )
                startHeartbeatLoop(deviceInfo.deviceId)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // This service runs continuously. Try to reconnect if dropped.
        serviceScope.launch {
            val deviceInfo = deviceRepository.getDeviceInfo()
            if (deviceInfo != null && deviceInfo.isRegistered) {
                if (!commandReceiver.isConnected.value) {
                    commandReceiver.connect(
                        serverUrl = deviceInfo.serverUrl,
                        token = deviceInfo.registrationToken,
                        deviceId = deviceInfo.deviceId
                    )
                }
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun startForegroundService() {
        val channelId = "mdm_heartbeat_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "MDM Heartbeat Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("EduSphere Agent")
            .setContentText("Thiết bị đang được quản lý bởi nhà trường")
            .setSmallIcon(android.R.drawable.ic_secure) // TODO: Use real app icon
            .build()

        startForeground(1, notification)
    }

    private fun startHeartbeatLoop(deviceId: String) {
        serviceScope.launch {
            while (isActive) {
                try {
                    val isPaused = sharedPreferencesManager.isMdmPaused()
                    
                    if (!isPaused) {
                        // Attempt reconnect if backend restarted or connection dropped
                        if (!commandReceiver.isConnected.value) {
                            val deviceInfo = deviceRepository.getDeviceInfo()
                            if (deviceInfo != null && deviceInfo.isRegistered) {
                                commandReceiver.connect(
                                    serverUrl = deviceInfo.serverUrl,
                                    token = deviceInfo.registrationToken,
                                    deviceId = deviceInfo.deviceId
                                )
                            }
                        }

                        val metrics = deviceMonitor.getDeviceMetrics()
                        val currentApp = deviceMonitor.getCurrentApp()
                        
                        ruleDetector.checkForegroundApp(currentApp?.packageName)
                        
                        val request = HeartbeatRequest(
                            deviceId = deviceId,
                            timestamp = System.currentTimeMillis(),
                            metrics = metrics,
                            currentApp = currentApp
                        )
                        
                        val pendingCount = deviceRepository.sendHeartbeat(request)
                        
                        if (pendingCount > 0) {
                            val pendingCommands = deviceRepository.fetchPendingCommands()
                            pendingCommands.forEach { cmd ->
                                val payloadJson = if (cmd.payload != null) org.json.JSONObject(cmd.payload as Map<*, *>) else null
                                commandReceiver.executeCommand(cmd.commandType, payloadJson)
                                deviceRepository.acknowledgeCommand(cmd.id, "EXECUTED")
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                delay(30000) // Send heartbeat every 30 seconds
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        commandReceiver.disconnect()
    }
}

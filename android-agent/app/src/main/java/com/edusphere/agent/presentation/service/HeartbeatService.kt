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
    lateinit var actionManager: com.edusphere.agent.domain.action.DeviceActionManager

    @Inject
    lateinit var sharedPreferencesManager: SharedPreferencesManager

    private val serviceScope = CoroutineScope(Dispatchers.IO)
    private var heartbeatJob: kotlinx.coroutines.Job? = null
    private var appBlockerJob: kotlinx.coroutines.Job? = null

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
                ensureLoopsRunning(deviceInfo.deviceId)
            }
        }
    }

    private fun ensureLoopsRunning(deviceId: String) {
        if (heartbeatJob == null || heartbeatJob?.isActive != true) {
            heartbeatJob = startHeartbeatLoop(deviceId)
        }
        if (appBlockerJob == null || appBlockerJob?.isActive != true) {
            appBlockerJob = startAppBlockerLoop()
        }
    }

    private suspend fun sendCurrentTelemetry(deviceId: String) {
        val gson = com.google.gson.Gson()
        val metrics = deviceMonitor.getDeviceMetrics()
        val currentApp = deviceMonitor.getCurrentApp()
        
        val metricsJson = org.json.JSONObject(gson.toJson(metrics))
        metricsJson.put("deviceId", deviceId)
        commandReceiver.sendMetrics(metricsJson)
        
        if (currentApp != null) {
            val currentAppJson = org.json.JSONObject(gson.toJson(currentApp))
            currentAppJson.put("deviceId", deviceId)
            commandReceiver.sendCurrentApp(currentAppJson)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "FORCE_HEARTBEAT") {
            serviceScope.launch {
                val deviceInfo = deviceRepository.getDeviceInfo()
                if (deviceInfo != null && deviceInfo.isRegistered) {
                    if (!commandReceiver.isConnected.value) {
                        commandReceiver.connect(
                            serverUrl = deviceInfo.serverUrl,
                            token = deviceInfo.registrationToken,
                            deviceId = deviceInfo.deviceId
                        )
                        var waited = 0
                        while (!commandReceiver.isConnected.value && waited < 3000) {
                            delay(200)
                            waited += 200
                        }
                    }
                    ensureLoopsRunning(deviceInfo.deviceId)
                    if (commandReceiver.isConnected.value) {
                        sendCurrentTelemetry(deviceInfo.deviceId)
                    }
                }
            }
            return START_STICKY
        }

        // This service runs continuously. Try to reconnect and ensure loops are running.
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
                ensureLoopsRunning(deviceInfo.deviceId)
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

    private fun startHeartbeatLoop(deviceId: String): kotlinx.coroutines.Job {
        return serviceScope.launch {
            while (isActive) {
                try {
                    val isPaused = sharedPreferencesManager.isMdmPaused()
                    
                    if (!isPaused) {
                        if (!commandReceiver.isConnected.value) {
                            val deviceInfo = deviceRepository.getDeviceInfo()
                            if (deviceInfo != null && deviceInfo.isRegistered) {
                                commandReceiver.connect(
                                    serverUrl = deviceInfo.serverUrl,
                                    token = deviceInfo.registrationToken,
                                    deviceId = deviceInfo.deviceId
                                )
                                var waited = 0
                                while (!commandReceiver.isConnected.value && waited < 3000) {
                                    delay(200)
                                    waited += 200
                                }
                            }
                        }
                        if (commandReceiver.isConnected.value) {
                            sendCurrentTelemetry(deviceId)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                delay(30000) // Send heartbeat every 30 seconds
            }
        }
    }

    private fun startAppBlockerLoop(): kotlinx.coroutines.Job {
        return serviceScope.launch {
            while (isActive) {
                try {
                    val isPaused = sharedPreferencesManager.isMdmPaused()
                    if (!isPaused) {
                        val currentApp = deviceMonitor.getCurrentApp(includeIcon = false)
                        if (sharedPreferencesManager.isDeviceLocked()) {
                            val pkg = currentApp?.packageName
                            if (pkg != null && pkg != packageName && pkg != "com.edusphere.agent") {
                                actionManager.lockScreen(sharedPreferencesManager.getLockMessage())
                            }
                        } else {
                            ruleDetector.checkForegroundApp(currentApp)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                delay(1500) // Check foreground app every 1.5 seconds
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        commandReceiver.disconnect()
    }
}

package com.edusphere.agent.presentation.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.edusphere.agent.data.worker.HeartbeatWorker
import dagger.hilt.android.AndroidEntryPoint
import java.util.concurrent.TimeUnit

@AndroidEntryPoint
class HeartbeatService : Service() {

    override fun onCreate() {
        super.onCreate()
        startForegroundService()
        scheduleHeartbeatWorker()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // This service runs continuously
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

    private fun scheduleHeartbeatWorker() {
        val workRequest = PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(this).enqueue(workRequest)
    }
}

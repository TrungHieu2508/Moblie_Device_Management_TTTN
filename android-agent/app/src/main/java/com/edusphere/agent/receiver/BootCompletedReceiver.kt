package com.edusphere.agent.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import com.edusphere.agent.presentation.service.HeartbeatService

class BootCompletedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootCompletedReceiver", "Device booted. Starting HeartbeatService.")
            
            // Note: In Android 8.0+, startForegroundService must be called, and the service
            // must call startForeground() within 5 seconds. Our HeartbeatService does this.
            val serviceIntent = Intent(context, HeartbeatService::class.java)
            try {
                ContextCompat.startForegroundService(context, serviceIntent)
            } catch (e: Exception) {
                Log.e("BootCompletedReceiver", "Failed to start HeartbeatService on boot", e)
            }
        }
    }
}

package com.edusphere.agent.presentation.main

import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.edusphere.agent.R
import com.edusphere.agent.data.local.SharedPreferencesManager
import com.edusphere.agent.data.remote.websocket.CommandReceiver
import com.edusphere.agent.domain.repository.DeviceRepository
import com.edusphere.agent.receiver.MDMAdminReceiver
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class LockActivity : AppCompatActivity() {

    @Inject
    lateinit var deviceRepository: DeviceRepository

    @Inject
    lateinit var commandReceiver: CommandReceiver

    @Inject
    lateinit var sharedPreferencesManager: SharedPreferencesManager

    private val unlockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.edusphere.agent.ACTION_UNLOCK_DEVICE") {
                sharedPreferencesManager.setDeviceLocked(false)
                try {
                    stopLockTask()
                } catch (_: Exception) {}
                finish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        // Hide System UI
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
        
        setContentView(R.layout.activity_lock)

        updateLockMessage(intent)

        ContextCompat.registerReceiver(
            this,
            unlockReceiver,
            IntentFilter("com.edusphere.agent.ACTION_UNLOCK_DEVICE"),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, MDMAdminReceiver::class.java)
        
        // Whitelist this activity for LockTask mode dynamically
        if (dpm.isDeviceOwnerApp(packageName)) {
            try {
                val packages = dpm.getLockTaskPackages(adminComponent)
                if (!packages.contains(packageName)) {
                    val newPackages = packages.toMutableList()
                    newPackages.add(packageName)
                    dpm.setLockTaskPackages(adminComponent, newPackages.toTypedArray())
                }
            } catch (_: Exception) {}
        }
        
        findViewById<android.widget.Button>(R.id.btnUnlock).setOnClickListener {
            val code = findViewById<android.widget.EditText>(R.id.etUnlockCode).text.toString()
            onUnlockCodeEntered(code)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        updateLockMessage(intent)
    }

    private fun updateLockMessage(intent: Intent?) {
        val message = intent?.getStringExtra("LOCK_MESSAGE") ?: sharedPreferencesManager.getLockMessage()
        if (!message.isNullOrEmpty()) {
            findViewById<TextView>(R.id.tvLockMessage)?.text = message
        }
    }

    override fun onResume() {
        super.onResume()
        if (!sharedPreferencesManager.isDeviceLocked()) {
            try { stopLockTask() } catch (_: Exception) {}
            finish()
            return
        }
        // Enter Kiosk Mode if permitted
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        if (dpm.isLockTaskPermitted(packageName)) {
            try {
                startLockTask()
            } catch (_: Exception) {}
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(unlockReceiver)
        } catch (_: Exception) {}
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent back button
    }

    // Emergency unlock logic for demo
    fun onUnlockCodeEntered(code: String) {
        if (code == "1234") {
            sharedPreferencesManager.setDeviceLocked(false)
            try {
                stopLockTask()
            } catch (e: Exception) {
                e.printStackTrace()
            }
            
            Toast.makeText(this, "Đã mở khóa thiết bị", Toast.LENGTH_SHORT).show()
            
            // Báo cáo lên server là đã mở khóa thủ công
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val deviceInfo = deviceRepository.getDeviceInfo()
                    if (deviceInfo != null) {
                        val eventJson = org.json.JSONObject().apply {
                            put("deviceId", deviceInfo.deviceId)
                            put("eventType", "DEVICE_UNLOCKED_MANUALLY")
                            put("timestamp", System.currentTimeMillis())
                            val payload = org.json.JSONObject().apply {
                                put("method", "PIN_CODE")
                            }
                            put("payload", payload)
                        }
                        commandReceiver.sendEvent(eventJson)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            
            finish()
        } else {
            Toast.makeText(this, "Mã mở khóa không chính xác!", Toast.LENGTH_SHORT).show()
        }
    }
}

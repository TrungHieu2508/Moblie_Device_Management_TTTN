package com.edusphere.agent.presentation.main

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.edusphere.agent.R
import dagger.hilt.android.AndroidEntryPoint
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import com.edusphere.agent.receiver.MDMAdminReceiver

@AndroidEntryPoint
class LockActivity : AppCompatActivity() {

    private val unlockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.edusphere.agent.ACTION_UNLOCK_DEVICE") {
                stopLockTask()
                finish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Hide System UI
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
        
        setContentView(R.layout.activity_lock)

        val message = intent.getStringExtra("LOCK_MESSAGE")
        if (!message.isNullOrEmpty()) {
            findViewById<TextView>(R.id.tvLockMessage).text = message
        }

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
            val packages = dpm.getLockTaskPackages(adminComponent)
            if (!packages.contains(packageName)) {
                val newPackages = packages.toMutableList()
                newPackages.add(packageName)
                dpm.setLockTaskPackages(adminComponent, newPackages.toTypedArray())
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Enter Kiosk Mode
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        if (dpm.isLockTaskPermitted(packageName)) {
            startLockTask()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(unlockReceiver)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Prevent back button
        // Do nothing
    }
}

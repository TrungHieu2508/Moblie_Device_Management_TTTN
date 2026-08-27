package com.edusphere.agent.domain.action

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.RingtoneManager
import android.net.Uri
import android.os.UserManager
import android.util.Log
import com.edusphere.agent.receiver.MDMAdminReceiver
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class DeviceActionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent = ComponentName(context, MDMAdminReceiver::class.java)

    private fun isAdminActive(): Boolean = dpm.isAdminActive(adminComponent)
    private fun isDeviceOwner(): Boolean = dpm.isDeviceOwnerApp(context.packageName)

    fun lockScreen() {
        if (isAdminActive()) {
            dpm.lockNow()
            Log.d("DeviceActionManager", "Screen locked")
        } else {
            Log.e("DeviceActionManager", "Cannot lock screen: Admin not active")
        }
    }

    fun reboot() {
        if (isDeviceOwner()) {
            dpm.reboot(adminComponent)
            Log.d("DeviceActionManager", "Device rebooting")
        } else {
            Log.e("DeviceActionManager", "Cannot reboot: Not Device Owner")
        }
    }

    fun openApp(packageName: String) {
        val intent = context.packageManager.getLaunchIntentForPackage(packageName)
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            Log.d("DeviceActionManager", "Opened app: $packageName")
        } else {
            Log.e("DeviceActionManager", "Cannot open app: $packageName not found")
        }
    }
    
    fun openUrl(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        Log.d("DeviceActionManager", "Opened URL: $url")
    }

    fun setKioskMode(packageName: String, enable: Boolean) {
        if (isDeviceOwner()) {
            val packages = if (enable) arrayOf(packageName) else emptyArray()
            dpm.setLockTaskPackages(adminComponent, packages)
            Log.d("DeviceActionManager", "Kiosk mode for $packageName set to $enable")
        } else {
            Log.e("DeviceActionManager", "Cannot set Kiosk Mode: Not Device Owner")
        }
    }

    fun clearRecents() {
        // Clearing recents usually requires Accessibility Service or root.
        // As a Device Owner, there isn't a direct API to clear recents.
        // We can simulate pressing the home button to minimize everything.
        val startMain = Intent(Intent.ACTION_MAIN)
        startMain.addCategory(Intent.CATEGORY_HOME)
        startMain.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(startMain)
        Log.d("DeviceActionManager", "Navigated to Home (simulate clear recents)")
    }

    fun setAppHidden(packageName: String, hidden: Boolean) {
        if (isDeviceOwner()) {
            dpm.setApplicationHidden(adminComponent, packageName, hidden)
            Log.d("DeviceActionManager", "App $packageName hidden: $hidden")
        } else {
            Log.e("DeviceActionManager", "Cannot hide app: Not Device Owner")
        }
    }

    fun setUninstallBlocked(packageName: String, blocked: Boolean) {
        if (isDeviceOwner()) {
            dpm.setUninstallBlocked(adminComponent, packageName, blocked)
            Log.d("DeviceActionManager", "App $packageName uninstall blocked: $blocked")
        } else {
            Log.e("DeviceActionManager", "Cannot block uninstall: Not Device Owner")
        }
    }

    fun setCameraDisabled(disabled: Boolean) {
        if (isDeviceOwner()) {
            dpm.setCameraDisabled(adminComponent, disabled)
            Log.d("DeviceActionManager", "Camera disabled: $disabled")
        } else {
            Log.e("DeviceActionManager", "Cannot disable camera: Not Device Owner")
        }
    }

    fun setFactoryResetDisabled(disabled: Boolean) {
        if (isDeviceOwner()) {
            if (disabled) {
                dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            } else {
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            }
            Log.d("DeviceActionManager", "Factory reset disabled: $disabled")
        } else {
            Log.e("DeviceActionManager", "Cannot disable factory reset: Not Device Owner")
        }
    }

    fun ringAlarm() {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)

            var alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
            val ringtone = RingtoneManager.getRingtone(context, alarmUri)
            ringtone.play()
            Log.d("DeviceActionManager", "Playing alarm sound at max volume")
        } catch (e: Exception) {
            Log.e("DeviceActionManager", "Failed to play alarm", e)
        }
    }

    fun wipeData() {
        if (isDeviceOwner()) {
            Log.d("DeviceActionManager", "Wiping device data (Factory Reset)...")
            dpm.wipeData(0)
        } else {
            Log.e("DeviceActionManager", "Cannot wipe data: Not Device Owner")
        }
    }

    fun showAlert(message: String) {
        // Run on main thread to show Toast
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            android.widget.Toast.makeText(context, message, android.widget.Toast.LENGTH_LONG).show()
        }
        Log.d("DeviceActionManager", "Showing alert: $message")
    }
}

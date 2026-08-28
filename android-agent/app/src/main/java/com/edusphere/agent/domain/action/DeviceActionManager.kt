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
        
        // Hiện thông báo khóa màn hình
        val intent = Intent(context, com.edusphere.agent.presentation.main.LockActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        intent.putExtra("LOCK_MESSAGE", "Sử dụng điện thoại ngoài việc học nha")
        context.startActivity(intent)
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
            
            try {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
            } catch (e: SecurityException) {
                Log.w("DeviceActionManager", "Cannot set volume due to DND, ignoring...")
            }

            var alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
            
            val mediaPlayer = android.media.MediaPlayer()
            mediaPlayer.setDataSource(context, alarmUri)
            mediaPlayer.setAudioAttributes(
                android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            mediaPlayer.isLooping = true
            mediaPlayer.prepare()
            mediaPlayer.start()
            
            Log.d("DeviceActionManager", "Playing alarm sound at max volume")
            showAlert("Sử dụng điện thoại ngoài việc học nha")
            
            // Auto stop after 10 seconds
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    if (mediaPlayer.isPlaying) {
                        mediaPlayer.stop()
                        mediaPlayer.release()
                    }
                } catch (e: Exception) {}
            }, 10000)
            
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
        val intent = Intent(context, com.edusphere.agent.presentation.main.AlertActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        intent.putExtra("ALERT_MESSAGE", message)
        context.startActivity(intent)
        Log.d("DeviceActionManager", "Showing alert: $message")
    }
}

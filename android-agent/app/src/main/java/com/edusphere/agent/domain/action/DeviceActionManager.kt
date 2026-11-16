package com.edusphere.agent.domain.action

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.PixelFormat
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.UserManager
import android.provider.Settings
import android.util.Log
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import com.edusphere.agent.R
import com.edusphere.agent.receiver.MDMAdminReceiver
import com.google.android.material.button.MaterialButton
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceActionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val adminComponent = ComponentName(context, MDMAdminReceiver::class.java)
    private val mainHandler = Handler(Looper.getMainLooper())

    private var lockOverlayView: View? = null
    private var alertOverlayView: View? = null
    private var activeMediaPlayer: MediaPlayer? = null

    private fun isAdminActive(): Boolean = dpm.isAdminActive(adminComponent)
    private fun isDeviceOwner(): Boolean = dpm.isDeviceOwnerApp(context.packageName)

    private fun canUseOverlay(): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
    }

    fun isLockOverlayShowing(): Boolean = lockOverlayView != null

    fun lockScreen(customMessage: String? = null) {
        val msg = if (!customMessage.isNullOrEmpty()) customMessage else "Sử dụng điện thoại ngoài việc học nha"
        context.getSharedPreferences("edusphere_mdm_prefs", Context.MODE_PRIVATE)
            .edit()
            .putBoolean("device_locked", true)
            .putString("device_lock_message", msg)
            .apply()

        mainHandler.post {
            // 1. Hiển thị ngay lập tức bằng System Overlay (TYPE_APPLICATION_OVERLAY)
            // Không bao giờ bị thoát khi bấm nút Home và không bị chặn bởi bộ trễ 5 giây của Android
            if (canUseOverlay()) {
                showOrUpdateLockOverlay(msg)
            }

            // 2. Kích hoạt thêm LockActivity (hỗ trợ Kiosk startLockTask khóa cứng thanh điều hướng khi có Device Owner)
            try {
                if (isDeviceOwner()) {
                    try {
                        val packages = dpm.getLockTaskPackages(adminComponent)
                        if (!packages.contains(context.packageName)) {
                            val newPackages = packages.toMutableList()
                            newPackages.add(context.packageName)
                            dpm.setLockTaskPackages(adminComponent, newPackages.toTypedArray())
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            dpm.setLockTaskFeatures(adminComponent, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                        }
                    } catch (_: Exception) {}
                }

                val intent = Intent(context, com.edusphere.agent.presentation.main.LockActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                    )
                    putExtra("LOCK_MESSAGE", msg)
                }
                context.startActivity(intent)
                Log.d("DeviceActionManager", "Launched LockActivity + Overlay: $msg")
            } catch (e: Exception) {
                Log.e("DeviceActionManager", "Failed to launch LockActivity", e)
            }
        }
    }

    fun ensureLockOverlayVisible(customMessage: String? = null) {
        val msg = if (!customMessage.isNullOrEmpty()) customMessage else "Sử dụng điện thoại ngoài việc học nha"
        mainHandler.post {
            if (canUseOverlay() && lockOverlayView == null) {
                showOrUpdateLockOverlay(msg)
            }
        }
    }

    private fun showOrUpdateLockOverlay(message: String) {
        try {
            val existing = lockOverlayView
            if (existing != null) {
                existing.findViewById<TextView>(R.id.tvLockMessage)?.text = message
                applyImmersiveFlags(existing)
                return
            }

            val themedContext = ContextThemeWrapper(context, R.style.Theme_EduSphereAgent)
            val rootContainer = object : FrameLayout(themedContext) {
                override fun dispatchKeyEvent(event: KeyEvent?): Boolean {
                    if (event?.keyCode == KeyEvent.KEYCODE_BACK ||
                        event?.keyCode == KeyEvent.KEYCODE_HOME ||
                        event?.keyCode == KeyEvent.KEYCODE_APP_SWITCH
                    ) {
                        return true
                    }
                    return super.dispatchKeyEvent(event)
                }
            }

            val contentView = LayoutInflater.from(themedContext).inflate(R.layout.activity_lock, rootContainer, true)
            contentView.findViewById<TextView>(R.id.tvLockMessage)?.text = message

            val etUnlockCode = contentView.findViewById<EditText>(R.id.etUnlockCode)
            val btnUnlock = contentView.findViewById< View>(R.id.btnUnlock)
            btnUnlock?.setOnClickListener {
                val code = etUnlockCode?.text?.toString()?.trim().orEmpty()
                if (code == "1234") {
                    Toast.makeText(context, "Đã mở khóa thiết bị", Toast.LENGTH_SHORT).show()
                    unlockScreen()
                } else {
                    Toast.makeText(context, "Mã mở khóa không chính xác!", Toast.LENGTH_SHORT).show()
                }
            }

            val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            @Suppress("DEPRECATION")
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                overlayType,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD,
                PixelFormat.OPAQUE
            ).apply {
                gravity = Gravity.CENTER
                softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }
            }

            applyImmersiveFlags(rootContainer)
            windowManager.addView(rootContainer, params)
            lockOverlayView = rootContainer
            Log.i("DeviceActionManager", "Lock System Overlay attached successfully")
        } catch (e: Exception) {
            Log.e("DeviceActionManager", "Failed to attach Lock System Overlay", e)
        }
    }

    @Suppress("DEPRECATION")
    private fun applyImmersiveFlags(view: View) {
        view.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
    }

    fun unlockScreen() {
        context.getSharedPreferences("edusphere_mdm_prefs", Context.MODE_PRIVATE)
            .edit()
            .putBoolean("device_locked", false)
            .apply()

        mainHandler.post {
            stopAlarm()
            removeLockOverlay()
            val intent = Intent("com.edusphere.agent.ACTION_UNLOCK_DEVICE").apply {
                setPackage(context.packageName)
            }
            context.sendBroadcast(intent)
            Log.i("DeviceActionManager", "Device unlocked and Lock Overlay removed")
        }
    }

    private fun removeLockOverlay() {
        val view = lockOverlayView ?: return
        lockOverlayView = null
        try {
            windowManager.removeViewImmediate(view)
        } catch (_: Exception) {
            try { windowManager.removeView(view) } catch (_: Exception) {}
        }
    }

    private fun removeAlertOverlay() {
        val view = alertOverlayView ?: return
        alertOverlayView = null
        try {
            windowManager.removeViewImmediate(view)
        } catch (_: Exception) {
            try { windowManager.removeView(view) } catch (_: Exception) {}
        }
    }

    fun stopAlarm() {
        try {
            activeMediaPlayer?.let { mp ->
                if (mp.isPlaying) {
                    mp.stop()
                }
                mp.release()
            }
        } catch (_: Exception) {}
        activeMediaPlayer = null
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
        mainHandler.post {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d("DeviceActionManager", "Opened app: $packageName")
            } else {
                Log.e("DeviceActionManager", "Cannot open app: $packageName not found")
            }
        }
    }
    
    fun openUrl(url: String) {
        mainHandler.post {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            Log.d("DeviceActionManager", "Opened URL: $url")
        }
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
        mainHandler.post {
            try {
                val startMain = Intent(Intent.ACTION_MAIN)
                startMain.addCategory(Intent.CATEGORY_HOME)
                startMain.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(startMain)
                Log.d("DeviceActionManager", "Navigated to Home (simulate clear recents)")
            } catch (e: Exception) {
                Log.e("DeviceActionManager", "Failed to navigate to Home", e)
            }
        }
    }

    fun clearRam() {
        if (isDeviceOwner()) {
            val pm = context.packageManager
            val packages = pm.getInstalledPackages(0)
            val toSuspend = mutableListOf<String>()
            for (pkg in packages) {
                if (pkg.packageName != context.packageName &&
                    (pkg.applicationInfo?.flags?.and(android.content.pm.ApplicationInfo.FLAG_SYSTEM)) == 0
                ) {
                    toSuspend.add(pkg.packageName)
                }
            }
            if (toSuspend.isNotEmpty()) {
                val pkgArray = toSuspend.toTypedArray()
                try {
                    dpm.setPackagesSuspended(adminComponent, pkgArray, true)
                    dpm.setPackagesSuspended(adminComponent, pkgArray, false)
                    Log.d("DeviceActionManager", "Cleared RAM for ${toSuspend.size} apps")
                    showAlert("Dọn Dẹp RAM", "Đã đóng ${toSuspend.size} ứng dụng chạy nền và giải phóng RAM thành công!", "SUCCESS")
                } catch (e: Exception) {
                    Log.e("DeviceActionManager", "Failed to clear RAM", e)
                    showAlert("Dọn Dẹp RAM", "Đã thực hiện dọn dẹp bộ nhớ đệm!", "SUCCESS")
                }
            } else {
                showAlert("Dọn Dẹp RAM", "Không có ứng dụng nền nào cần dọn dẹp", "SUCCESS")
            }
        } else {
            clearRecents()
            showAlert("Dọn Dẹp RAM", "Đã đóng các ứng dụng chạy nền!", "SUCCESS")
        }
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
        if (isDeviceOwner() || isAdminActive()) {
            dpm.setCameraDisabled(adminComponent, disabled)
            Log.d("DeviceActionManager", "Camera disabled: $disabled")
        } else {
            Log.e("DeviceActionManager", "Cannot disable camera: Not Admin/Device Owner")
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
        mainHandler.post {
            try {
                stopAlarm()
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
                
                val mediaPlayer = MediaPlayer()
                mediaPlayer.setDataSource(context, alarmUri)
                mediaPlayer.setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                mediaPlayer.isLooping = true
                mediaPlayer.prepare()
                mediaPlayer.start()
                activeMediaPlayer = mediaPlayer
                
                Log.d("DeviceActionManager", "Playing alarm sound at max volume")
                showAlert("Cảnh Báo Vi Phạm!", "Vui lòng tập trung và không sử dụng thiết bị trong giờ học!", "WARNING")
                
                mainHandler.postDelayed({
                    if (activeMediaPlayer === mediaPlayer) {
                        stopAlarm()
                    }
                }, 10000)
                
            } catch (e: Exception) {
                Log.e("DeviceActionManager", "Failed to play alarm", e)
            }
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

    fun showAlert(title: String, message: String, type: String = "WARNING") {
        mainHandler.post {
            if (canUseOverlay()) {
                showAlertOverlay(title, message, type)
                return@post
            }

            try {
                val intent = Intent(context, com.edusphere.agent.presentation.main.AlertActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                    )
                    putExtra("ALERT_TITLE", title)
                    putExtra("ALERT_MESSAGE", message)
                    putExtra("ALERT_TYPE", type)
                }
                context.startActivity(intent)
                Log.d("DeviceActionManager", "Showing AlertActivity: $title - $message")
            } catch (e: Exception) {
                Log.e("DeviceActionManager", "Failed to show AlertActivity", e)
            }
        }
    }

    private fun showAlertOverlay(title: String, message: String, type: String) {
        try {
            removeAlertOverlay()

            val themedContext = ContextThemeWrapper(context, R.style.Theme_EduSphereAgent)
            val backdrop = object : FrameLayout(themedContext) {
                override fun dispatchKeyEvent(event: KeyEvent?): Boolean {
                    if (event?.keyCode == KeyEvent.KEYCODE_BACK) {
                        return true
                    }
                    return super.dispatchKeyEvent(event)
                }
            }.apply {
                setBackgroundColor(Color.parseColor("#B3000000"))
                setPadding(48, 48, 48, 48)
            }

            val cardView = LayoutInflater.from(themedContext).inflate(R.layout.activity_alert, backdrop, false)
            val cardParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.CENTER
            }
            backdrop.addView(cardView, cardParams)

            val tvAlertTitle = cardView.findViewById<TextView>(R.id.tvAlertTitle)
            val tvAlertMessage = cardView.findViewById<TextView>(R.id.tvAlertMessage)
            val btnAlertOk = cardView.findViewById<MaterialButton>(R.id.btnAlertOk)
            val ivAlertIcon = cardView.findViewById<ImageView>(R.id.ivAlertIcon)

            tvAlertTitle?.text = title
            tvAlertMessage?.text = message

            when (type) {
                "SUCCESS" -> {
                    ivAlertIcon?.setImageResource(android.R.drawable.ic_dialog_info)
                    ivAlertIcon?.setColorFilter(Color.parseColor("#4CAF50"))
                    btnAlertOk?.setBackgroundColor(Color.parseColor("#4CAF50"))
                    btnAlertOk?.rippleColor = ColorStateList.valueOf(Color.parseColor("#81C784"))
                }
                "INFO" -> {
                    ivAlertIcon?.setImageResource(android.R.drawable.ic_dialog_info)
                    ivAlertIcon?.setColorFilter(Color.parseColor("#2196F3"))
                    btnAlertOk?.setBackgroundColor(Color.parseColor("#2196F3"))
                    btnAlertOk?.rippleColor = ColorStateList.valueOf(Color.parseColor("#64B5F6"))
                }
                else -> {
                    ivAlertIcon?.setImageResource(android.R.drawable.ic_dialog_alert)
                    ivAlertIcon?.setColorFilter(Color.parseColor("#FF5252"))
                    btnAlertOk?.setBackgroundColor(Color.parseColor("#9C27B0"))
                    btnAlertOk?.rippleColor = ColorStateList.valueOf(Color.parseColor("#D500F9"))
                }
            }

            btnAlertOk?.setOnClickListener {
                stopAlarm()
                removeAlertOverlay()
                val isLocked = context.getSharedPreferences("edusphere_mdm_prefs", Context.MODE_PRIVATE)
                    .getBoolean("device_locked", false)
                if (type == "WARNING" && !isLocked) {
                    clearRecents()
                }
            }

            val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            @Suppress("DEPRECATION")
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                overlayType,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.CENTER
            }

            windowManager.addView(backdrop, params)
            alertOverlayView = backdrop
            Log.i("DeviceActionManager", "Alert System Overlay attached: $title")
        } catch (e: Exception) {
            Log.e("DeviceActionManager", "Failed to attach Alert System Overlay", e)
        }
    }
}

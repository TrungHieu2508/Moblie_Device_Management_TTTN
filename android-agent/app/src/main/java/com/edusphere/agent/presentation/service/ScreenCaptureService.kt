package com.edusphere.agent.presentation.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Base64
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.edusphere.agent.R
import com.edusphere.agent.data.remote.websocket.CommandReceiver
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import javax.inject.Inject

@AndroidEntryPoint
class ScreenCaptureService : Service() {

    @Inject
    lateinit var commandReceiver: CommandReceiver

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var captureJob: Job? = null
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile
    private var isCapturing = false
    @Volatile
    private var isStreamingPaused = false
    @Volatile
    private var forceSendImmediate = false

    private val projectionCallback = object : MediaProjection.Callback() {
        override fun onStop() {
            super.onStop()
            Log.i("ScreenCapture", "MediaProjection stopped by system")
            stopCaptureResources()
            stopSelf()
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun promoteToForeground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )
        } else {
            startForeground(NOTIFICATION_ID, createNotification())
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") {
            // Tạm dừng gửi frame nhưng giữ nguyên phiên MediaProjection để lần bấm Xem màn hình tiếp theo mở ngay lập tức
            if (isCapturing && mediaProjection != null) {
                isStreamingPaused = true
                Log.i("ScreenCapture", "Screen stream paused (MediaProjection kept alive)")
                return START_STICKY
            }
            stopCaptureResources()
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == "RESUME_OR_RESEND") {
            try {
                promoteToForeground()
                if (isCapturing && mediaProjection != null && captureJob?.isActive == true) {
                    isStreamingPaused = false
                    forceSendImmediate = true
                    Log.i("ScreenCapture", "Resumed existing screen stream immediately")
                    return START_STICKY
                }
                val savedCode = cachedResultCode
                val savedData = cachedResultData
                if (savedCode != 0 && savedData != null) {
                    isStreamingPaused = false
                    forceSendImmediate = true
                    startCapture(savedCode, Intent(savedData))
                    return START_STICKY
                }
            } catch (e: Exception) {
                Log.e("ScreenCapture", "Direct resume failed, falling back to activity", e)
            }
            // Fallback: mở ScreenCaptureActivity nếu chưa có phiên hoặc bị thu hồi
            try {
                val actIntent = Intent(this, com.edusphere.agent.presentation.main.ScreenCaptureActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION)
                }
                startActivity(actIntent)
            } catch (e: Exception) {
                Log.e("ScreenCapture", "Fallback launch ScreenCaptureActivity failed", e)
            }
            return START_NOT_STICKY
        }

        val resultCode = intent?.getIntExtra("RESULT_CODE", 0) ?: 0
        val resultData: Intent? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent?.getParcelableExtra("RESULT_DATA", Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent?.getParcelableExtra("RESULT_DATA")
        }

        if (resultCode != 0 && resultData != null) {
            try {
                saveGrant(resultCode, resultData)
                promoteToForeground()
                val isPrewarm = intent?.action == "PREWARM"
                isStreamingPaused = isPrewarm
                forceSendImmediate = !isPrewarm
                startCapture(resultCode, resultData)
            } catch (e: Exception) {
                Log.e("ScreenCapture", "Failed to start foreground screen capture", e)
                stopSelf()
            }
        } else {
            stopSelf()
        }

        return START_STICKY
    }

    private fun startCapture(resultCode: Int, resultData: Intent) {
        stopCaptureResources()

        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = mpm.getMediaProjection(resultCode, resultData)
        if (mediaProjection == null) {
            Log.e("ScreenCapture", "MediaProjection is null")
            hasActiveProjection = false
            stopSelf()
            return
        }

        // Bắt buộc trên Android 14+ (targetSdk >= 34): phải đăng ký callback trước khi createVirtualDisplay
        mediaProjection?.registerCallback(projectionCallback, mainHandler)

        val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(metrics)
        
        val density = metrics.densityDpi
        val originalWidth = metrics.widthPixels.coerceAtLeast(360)
        val originalHeight = metrics.heightPixels.coerceAtLeast(640)
        
        // Tối ưu độ phân giải ~432p (scale 0.40f) để đạt ~18-20 FPS siêu mượt qua WebSocket
        val scale = 0.40f
        val width = ((originalWidth * scale).toInt() / 2) * 2
        val height = ((originalHeight * scale).toInt() / 2) * 2

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 3)
        
        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "EduSphereLiveScreen",
            width, height, density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface, null, mainHandler
        )

        isCapturing = true
        hasActiveProjection = true
        Log.i("ScreenCapture", "Started live screen capture: ${width}x${height}")

        captureJob = scope.launch {
            var lastBase64Frame: String? = null
            var lastSentTime = 0L
            var reusableBitmap: Bitmap? = null
            var reusableBitmapWidth = 0
            val reusableBaos = ByteArrayOutputStream(65536)
            val targetIntervalMs = 50L // ~20 FPS tối đa

            try {
                while (isCapturing && isActive) {
                    try {
                        if (isStreamingPaused) {
                            // Xả bớt frame tồn trong hàng đợi khi đang tạm dừng
                            try { imageReader?.acquireLatestImage()?.close() } catch (_: Exception) {}
                            delay(150)
                            continue
                        }

                        val frameStart = System.currentTimeMillis()
                        val image = imageReader?.acquireLatestImage()
                        if (image != null) {
                            val base64 = try {
                                val planes = image.planes
                                val buffer = planes[0].buffer
                                val pixelStride = planes[0].pixelStride
                                val rowStride = planes[0].rowStride
                                val rowPadding = rowStride - pixelStride * width
                                val bufferWidth = width + rowPadding / pixelStride

                                buffer.rewind()
                                if (reusableBitmap == null || reusableBitmapWidth != bufferWidth) {
                                    reusableBitmap?.recycle()
                                    reusableBitmap = Bitmap.createBitmap(bufferWidth, height, Bitmap.Config.ARGB_8888)
                                    reusableBitmapWidth = bufferWidth
                                }
                                val bmp = reusableBitmap!!
                                bmp.copyPixelsFromBuffer(buffer)

                                reusableBaos.reset()
                                if (rowPadding > 0) {
                                    val cropped = Bitmap.createBitmap(bmp, 0, 0, width, height)
                                    cropped.compress(Bitmap.CompressFormat.JPEG, 38, reusableBaos)
                                    cropped.recycle()
                                } else {
                                    bmp.compress(Bitmap.CompressFormat.JPEG, 38, reusableBaos)
                                }

                                Base64.encodeToString(reusableBaos.toByteArray(), Base64.NO_WRAP)
                            } finally {
                                try { image.close() } catch (_: Exception) {}
                            }

                            lastBase64Frame = base64
                            lastSentTime = System.currentTimeMillis()
                            forceSendImmediate = false

                            commandReceiver.sendScreenFrame(base64)
                            val elapsed = System.currentTimeMillis() - frameStart
                            val waitMs = (targetIntervalMs - elapsed).coerceAtLeast(12L)
                            delay(waitMs)
                        } else {
                            // Nếu màn hình đang đứng yên không đổi pixel, gửi lại frame cuối mỗi 500ms
                            val now = System.currentTimeMillis()
                            if (lastBase64Frame != null && (forceSendImmediate || now - lastSentTime >= 500L)) {
                                forceSendImmediate = false
                                lastSentTime = now
                                commandReceiver.sendScreenFrame(lastBase64Frame!!)
                            }
                            delay(18)
                        }
                    } catch (e: Exception) {
                        Log.e("ScreenCapture", "Error capturing frame", e)
                        delay(50)
                    }
                }
            } finally {
                try { reusableBitmap?.recycle() } catch (_: Exception) {}
            }
        }
    }

    private fun stopCaptureResources() {
        isCapturing = false
        hasActiveProjection = false
        captureJob?.cancel()
        captureJob = null
        try { virtualDisplay?.release() } catch (_: Exception) {}
        virtualDisplay = null
        try { imageReader?.close() } catch (_: Exception) {}
        imageReader = null
        try {
            mediaProjection?.unregisterCallback(projectionCallback)
            mediaProjection?.stop()
        } catch (_: Exception) {}
        mediaProjection = null
    }

    override fun onDestroy() {
        stopCaptureResources()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Screen Capture Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("EduSphere Agent")
            .setContentText("Đang truyền trực tiếp màn hình lên hệ thống...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "ScreenCaptureChannel"
        private const val NOTIFICATION_ID = 200

        @Volatile
        private var hasActiveProjection = false

        @Volatile
        private var cachedResultCode: Int = 0

        @Volatile
        private var cachedResultData: Intent? = null

        fun saveGrant(resultCode: Int, resultData: Intent) {
            cachedResultCode = resultCode
            cachedResultData = Intent(resultData)
        }

        fun canStartDirectly(): Boolean {
            return hasActiveProjection ||
                (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE &&
                    cachedResultCode != 0 &&
                    cachedResultData != null)
        }
    }
}

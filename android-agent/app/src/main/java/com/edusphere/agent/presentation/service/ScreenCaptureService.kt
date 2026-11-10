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

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") {
            stopCaptureResources()
            stopSelf()
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        createNotification(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                    )
                } else {
                    startForeground(NOTIFICATION_ID, createNotification())
                }
                startCapture(resultCode, resultData)
            } catch (e: Exception) {
                Log.e("ScreenCapture", "Failed to start foreground screen capture", e)
                stopSelf()
            }
        } else {
            stopSelf()
        }

        return START_NOT_STICKY
    }

    private fun startCapture(resultCode: Int, resultData: Intent) {
        stopCaptureResources()

        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = mpm.getMediaProjection(resultCode, resultData)
        if (mediaProjection == null) {
            Log.e("ScreenCapture", "MediaProjection is null")
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
        
        // Giảm độ phân giải về ~480p (chiều ngang chẵn) để mượt và rõ nét qua WebSocket
        val scale = 0.45f
        val width = ((originalWidth * scale).toInt() / 2) * 2
        val height = ((originalHeight * scale).toInt() / 2) * 2

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        
        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "EduSphereLiveScreen",
            width, height, density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface, null, mainHandler
        )

        isCapturing = true
        Log.i("ScreenCapture", "Started live screen capture: ${width}x${height}")

        captureJob = scope.launch {
            var lastBase64Frame: String? = null
            var lastSentTime = 0L

            while (isCapturing && isActive) {
                try {
                    val image = imageReader?.acquireLatestImage()
                    if (image != null) {
                        val planes = image.planes
                        val buffer = planes[0].buffer
                        val pixelStride = planes[0].pixelStride
                        val rowStride = planes[0].rowStride
                        val rowPadding = rowStride - pixelStride * width

                        val bitmap = Bitmap.createBitmap(
                            width + rowPadding / pixelStride,
                            height,
                            Bitmap.Config.ARGB_8888
                        )
                        bitmap.copyPixelsFromBuffer(buffer)
                        image.close()

                        val croppedBitmap = if (rowPadding > 0) {
                            val cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height)
                            bitmap.recycle()
                            cropped
                        } else {
                            bitmap
                        }

                        val baos = ByteArrayOutputStream()
                        croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 45, baos)
                        croppedBitmap.recycle()

                        val base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                        lastBase64Frame = base64
                        lastSentTime = System.currentTimeMillis()

                        commandReceiver.sendScreenFrame(base64)
                        delay(150) // ~6-7 FPS
                    } else {
                        // Nếu màn hình điện thoại đang đứng yên không đổi pixel, gửi lại frame cuối mỗi 1 giây
                        // để Web Dashboard luôn hiển thị hình ngay lập tức
                        val now = System.currentTimeMillis()
                        if (lastBase64Frame != null && now - lastSentTime >= 1000L) {
                            lastSentTime = now
                            commandReceiver.sendScreenFrame(lastBase64Frame)
                        }
                        delay(80)
                    }
                } catch (e: Exception) {
                    Log.e("ScreenCapture", "Error capturing frame", e)
                    delay(150)
                }
            }
        }
    }

    private fun stopCaptureResources() {
        isCapturing = false
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
    }
}

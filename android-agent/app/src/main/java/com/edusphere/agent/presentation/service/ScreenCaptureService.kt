package com.edusphere.agent.presentation.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import android.util.Base64
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.edusphere.agent.R
import com.edusphere.agent.data.local.MediaProjectionHolder
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
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isCapturing = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "STOP" -> {
                stopCapture()
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                // Support legacy resultCode/resultData from ScreenCaptureActivity
                val resultCode = intent?.getIntExtra("RESULT_CODE", -1) ?: -1
                @Suppress("DEPRECATION")
                val resultData: Intent? = intent?.getParcelableExtra("RESULT_DATA")
                if (resultCode != -1 && resultData != null) {
                    MediaProjectionHolder.resultCode = resultCode
                    MediaProjectionHolder.resultData = resultData
                }
                if (!isCapturing) {
                    startCaptureFromHolder()
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun startCaptureFromHolder() {
        if (!MediaProjectionHolder.isGranted) {
            Log.e(TAG, "MediaProjection permission not granted. Open the app first.")
            stopSelf()
            return
        }

        try {
            val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjection = mpm.getMediaProjection(
                MediaProjectionHolder.resultCode,
                MediaProjectionHolder.resultData!!
            )

            if (mediaProjection == null) {
                Log.e(TAG, "Failed to create MediaProjection from stored token")
                stopSelf()
                return
            }

            val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val metrics = DisplayMetrics()
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.getMetrics(metrics)

            val density = metrics.densityDpi
            val scale = 0.4f
            val width = (metrics.widthPixels * scale).toInt()
            val height = (metrics.heightPixels * scale).toInt()

            imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)

            virtualDisplay = mediaProjection?.createVirtualDisplay(
                "MDMScreenCapture",
                width, height, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader?.surface, null, null
            )

            isCapturing = true
            Log.i(TAG, "Screen capture started: ${width}x${height}")

            scope.launch {
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
                                Bitmap.createBitmap(bitmap, 0, 0, width, height)
                            } else {
                                bitmap
                            }

                            val baos = ByteArrayOutputStream()
                            croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 25, baos)
                            val base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)

                            commandReceiver.sendScreenFrame(base64)

                            delay(130) // ~7-8 FPS
                        } else {
                            delay(50)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Frame capture error", e)
                        delay(200)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start screen capture", e)
            stopSelf()
        }
    }

    private fun stopCapture() {
        isCapturing = false
        scope.coroutineContext.cancelChildren()
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        mediaProjection?.stop()
        mediaProjection = null
        Log.i(TAG, "Screen capture stopped")
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCapture()
        scope.cancel()
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
            .setContentTitle("MDM Agent")
            .setContentText("Đang chia sẻ màn hình với quản trị viên...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .build()
    }

    companion object {
        private const val TAG = "ScreenCaptureService"
        private const val CHANNEL_ID = "ScreenCaptureChannel"
        private const val NOTIFICATION_ID = 200
    }
}

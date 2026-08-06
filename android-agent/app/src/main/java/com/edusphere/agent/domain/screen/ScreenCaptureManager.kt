package com.edusphere.agent.domain.screen

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class ScreenCaptureManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val projectionManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

    /**
     * Request intent for MediaProjection. Needs to be called from an Activity.
     */
    fun getScreenCaptureIntent(): Intent {
        return projectionManager.createScreenCaptureIntent()
    }

    /**
     * Called with the result from the Activity to start actual screen capture/streaming
     */
    fun startScreenCapture(resultCode: Int, data: Intent) {
        if (resultCode != Activity.RESULT_OK) {
            Log.e("ScreenCaptureManager", "User denied screen capture")
            return
        }

        val mediaProjection = projectionManager.getMediaProjection(resultCode, data)
        // TODO: Setup ImageReader, VirtualDisplay to capture frames and stream via WebSocket
        Log.d("ScreenCaptureManager", "Screen capture started with projection: $mediaProjection")
    }

    fun stopScreenCapture() {
        Log.d("ScreenCaptureManager", "Screen capture stopped")
        // TODO: Release MediaProjection and VirtualDisplay resources
    }
}

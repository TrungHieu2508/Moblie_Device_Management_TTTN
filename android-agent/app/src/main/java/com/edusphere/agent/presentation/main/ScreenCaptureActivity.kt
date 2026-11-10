package com.edusphere.agent.presentation.main

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import com.edusphere.agent.presentation.service.ScreenCaptureService

class ScreenCaptureActivity : Activity() {

    private lateinit var mediaProjectionManager: MediaProjectionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
        
        try {
            mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            startActivityForResult(mediaProjectionManager.createScreenCaptureIntent(), REQUEST_CODE_SCREEN_CAPTURE)
        } catch (e: Exception) {
            Log.e("ScreenCaptureActivity", "Failed to request screen capture", e)
            finish()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == RESULT_OK && data != null) {
                val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                    action = "START"
                    putExtra("RESULT_CODE", resultCode)
                    putExtra("RESULT_DATA", data)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
            } else {
                Log.w("ScreenCaptureActivity", "Screen capture permission denied or cancelled")
            }
        }
        finish()
    }

    companion object {
        const val REQUEST_CODE_SCREEN_CAPTURE = 1000
    }
}

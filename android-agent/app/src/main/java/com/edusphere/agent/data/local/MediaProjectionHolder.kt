package com.edusphere.agent.data.local

import android.content.Intent

/**
 * Singleton to hold the MediaProjection permission grant (resultCode + resultData)
 * obtained once during MainActivity launch.
 * This allows ScreenCaptureService to start streaming at any time without
 * showing the user dialog again.
 */
object MediaProjectionHolder {
    var resultCode: Int = -1
    var resultData: Intent? = null

    val isGranted: Boolean
        get() = resultCode != -1 && resultData != null
}

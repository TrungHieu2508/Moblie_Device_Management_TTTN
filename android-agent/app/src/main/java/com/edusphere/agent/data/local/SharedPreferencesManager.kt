package com.edusphere.agent.data.local

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SharedPreferencesManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveServerUrl(url: String) {
        prefs.edit().putString(KEY_SERVER_URL, url).apply()
    }

    fun getServerUrl(): String? {
        return prefs.getString(KEY_SERVER_URL, null)
    }

    fun setMdmPaused(isPaused: Boolean) {
        prefs.edit().putBoolean(KEY_MDM_PAUSED, isPaused).apply()
    }

    fun isMdmPaused(): Boolean {
        return prefs.getBoolean(KEY_MDM_PAUSED, false)
    }

    fun setDeviceLocked(isLocked: Boolean, message: String? = null) {
        val editor = prefs.edit().putBoolean(KEY_DEVICE_LOCKED, isLocked)
        if (message != null) {
            editor.putString(KEY_LOCK_MESSAGE, message)
        }
        editor.apply()
    }

    fun isDeviceLocked(): Boolean {
        return prefs.getBoolean(KEY_DEVICE_LOCKED, false)
    }

    fun getLockMessage(): String? {
        return prefs.getString(KEY_LOCK_MESSAGE, "Sử dụng điện thoại ngoài việc học nha")
    }

    companion object {
        private const val PREFS_NAME = "edusphere_mdm_prefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_MDM_PAUSED = "mdm_paused"
        private const val KEY_DEVICE_LOCKED = "device_locked"
        private const val KEY_LOCK_MESSAGE = "device_lock_message"
    }
}

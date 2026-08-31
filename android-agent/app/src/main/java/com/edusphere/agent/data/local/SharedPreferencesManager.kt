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

    companion object {
        private const val PREFS_NAME = "edusphere_mdm_prefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_MDM_PAUSED = "mdm_paused"
    }
}

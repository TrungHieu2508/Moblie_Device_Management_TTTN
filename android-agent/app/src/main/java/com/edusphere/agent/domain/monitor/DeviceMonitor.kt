package com.edusphere.agent.domain.monitor

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Environment
import android.os.StatFs
import com.edusphere.agent.data.remote.model.DeviceMetrics
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class DeviceMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) {

    fun getDeviceMetrics(): DeviceMetrics {
        return DeviceMetrics(
            cpuUsage = getCpuUsage(),
            ramUsage = getRamUsage(),
            storageUsage = getStorageUsage(),
            batteryLevel = getBatteryLevel(),
            wifiSsid = getWifiSsid(),
            currentForegroundApp = getCurrentForegroundApp()
        )
    }

    private fun getBatteryLevel(): Int {
        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { ifilter ->
            context.registerReceiver(null, ifilter)
        }
        val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level != -1 && scale != -1) {
            (level * 100 / scale.toFloat()).toInt()
        } else {
            -1
        }
    }

    private fun getRamUsage(): Float {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        
        val totalRam = memoryInfo.totalMem
        val availableRam = memoryInfo.availMem
        val usedRam = totalRam - availableRam
        
        return if (totalRam > 0) {
            (usedRam.toFloat() / totalRam.toFloat()) * 100f
        } else {
            0f
        }
    }

    private fun getStorageUsage(): Float {
        val path = Environment.getDataDirectory()
        val stat = StatFs(path.path)
        val blockSize = stat.blockSizeLong
        val totalBlocks = stat.blockCountLong
        val availableBlocks = stat.availableBlocksLong
        
        val totalSpace = totalBlocks * blockSize
        val availableSpace = availableBlocks * blockSize
        val usedSpace = totalSpace - availableSpace
        
        return if (totalSpace > 0) {
            (usedSpace.toFloat() / totalSpace.toFloat()) * 100f
        } else {
            0f
        }
    }

    private fun getCpuUsage(): Float {
        // CPU usage requires reading /proc/stat or similar which is heavily restricted in modern Android.
        // Returning a placeholder or 0f for now.
        return 0f
    }

    private fun getWifiSsid(): String? {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val info = wifiManager.connectionInfo
        var ssid = info.ssid
        if (ssid.startsWith("\"") && ssid.endsWith("\"")) {
            ssid = ssid.substring(1, ssid.length - 1)
        }
        return if (ssid == "<unknown ssid>" || ssid == "0x") null else ssid
    }

    private fun getCurrentForegroundApp(): String? {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val time = System.currentTimeMillis()
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            time - 1000 * 10,
            time
        )
        
        var currentApp: String? = null
        if (stats != null && stats.isNotEmpty()) {
            var latestTime = 0L
            for (usageStats in stats) {
                if (usageStats.lastTimeUsed > latestTime) {
                    latestTime = usageStats.lastTimeUsed
                    currentApp = usageStats.packageName
                }
            }
        }
        return currentApp
    }
}

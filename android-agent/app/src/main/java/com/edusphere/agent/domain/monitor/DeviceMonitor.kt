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
import com.edusphere.agent.data.remote.model.CurrentApp
import com.edusphere.agent.data.remote.model.DeviceMetrics
import dagger.hilt.android.qualifiers.ApplicationContext
import java.net.InetAddress
import java.net.NetworkInterface
import javax.inject.Inject

class DeviceMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) {

    fun getDeviceMetrics(): DeviceMetrics {
        val ramStats = try { getRamStats() } catch (e: Exception) { Triple(0, 0, 0.0) }
        val storageStats = try { getStorageStats() } catch (e: Exception) { Pair(0.0, 0.0) }
        val batteryStats = try { getBatteryStats() } catch (e: Exception) { Pair(-1, false) }
        val wifiStats = try { getWifiStats() } catch (e: Exception) { Pair<String?, Int>(null, 0) }

        return DeviceMetrics(
            ramTotalMb = ramStats.first,
            ramUsedMb = ramStats.second,
            ramUsagePct = ramStats.third,
            cpuUsagePct = try { getCpuUsage() } catch (e: Exception) { 0.0 },
            storageTotalGb = storageStats.first,
            storageUsedGb = storageStats.second,
            batteryLevel = batteryStats.first,
            batteryCharging = batteryStats.second,
            wifiSsid = wifiStats.first,
            wifiSignal = wifiStats.second,
            ipAddress = try { getLocalIpAddress() } catch (e: Exception) { null }
        )
    }

    fun getCurrentApp(): CurrentApp? {
        try {
            val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val time = System.currentTimeMillis()
            val stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                time - 1000 * 10,
                time
            )
            
            var currentPackageName: String? = null
            if (stats != null && stats.isNotEmpty()) {
                var latestTime = 0L
                for (usageStats in stats) {
                    if (usageStats.lastTimeUsed > latestTime) {
                        latestTime = usageStats.lastTimeUsed
                        currentPackageName = usageStats.packageName
                    }
                }
            }
            
            if (currentPackageName != null) {
                val appName = try {
                    val packageManager = context.packageManager
                    val applicationInfo = packageManager.getApplicationInfo(currentPackageName, 0)
                    packageManager.getApplicationLabel(applicationInfo).toString()
                } catch (e: Exception) {
                    currentPackageName
                }
                return CurrentApp(currentPackageName, appName)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }

    private fun getBatteryStats(): Pair<Int, Boolean> {
        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { ifilter ->
            context.registerReceiver(null, ifilter)
        }
        val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        
        val status: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging: Boolean = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                  status == BatteryManager.BATTERY_STATUS_FULL

        val percentage = if (level != -1 && scale != -1) {
            (level * 100 / scale.toFloat()).toInt()
        } else {
            -1
        }
        
        return Pair(percentage, isCharging)
    }

    private fun getRamStats(): Triple<Int, Int, Double> {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        
        val totalRamMb = (memoryInfo.totalMem / (1024 * 1024)).toInt()
        val availableRamMb = (memoryInfo.availMem / (1024 * 1024)).toInt()
        val usedRamMb = totalRamMb - availableRamMb
        
        val usagePct = if (totalRamMb > 0) {
            (usedRamMb.toDouble() / totalRamMb.toDouble()) * 100.0
        } else {
            0.0
        }
        
        return Triple(totalRamMb, usedRamMb, usagePct)
    }

    private fun getStorageStats(): Pair<Double, Double> {
        val path = Environment.getDataDirectory()
        val stat = StatFs(path.path)
        val blockSize = stat.blockSizeLong
        val totalBlocks = stat.blockCountLong
        val availableBlocks = stat.availableBlocksLong
        
        val totalSpaceGb = (totalBlocks * blockSize).toDouble() / (1024 * 1024 * 1024)
        val availableSpaceGb = (availableBlocks * blockSize).toDouble() / (1024 * 1024 * 1024)
        val usedSpaceGb = totalSpaceGb - availableSpaceGb
        
        return Pair(totalSpaceGb, usedSpaceGb)
    }

    private fun getCpuUsage(): Double {
        // Placeholder
        return 0.0
    }

    private fun getWifiStats(): Pair<String?, Int> {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val info = wifiManager.connectionInfo
        var ssid = info.ssid
        if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) {
            ssid = ssid.substring(1, ssid.length - 1)
        }
        val finalSsid = if (ssid == "<unknown ssid>" || ssid == "0x") null else ssid
        val rssi = info.rssi
        val signalLevel = WifiManager.calculateSignalLevel(rssi, 5) // 0 to 4 usually, backend might expect 0-100 though, let's just send the raw rssi or level.
        return Pair(finalSsid, signalLevel)
    }
    
    private fun getLocalIpAddress(): String? {
        try {
            val en = NetworkInterface.getNetworkInterfaces()
            while (en.hasMoreElements()) {
                val intf = en.nextElement()
                val enumIpAddr = intf.inetAddresses
                while (enumIpAddr.hasMoreElements()) {
                    val inetAddress = enumIpAddr.nextElement()
                    if (!inetAddress.isLoopbackAddress && inetAddress is java.net.Inet4Address) {
                        return inetAddress.hostAddress
                    }
                }
            }
        } catch (ex: Exception) {
            ex.printStackTrace()
        }
        return null
    }
}

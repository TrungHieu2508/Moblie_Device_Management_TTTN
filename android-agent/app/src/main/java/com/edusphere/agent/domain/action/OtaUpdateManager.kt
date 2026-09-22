package com.edusphere.agent.domain.action

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Handler
import android.os.Looper
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.concurrent.thread

@Singleton
class OtaUpdateManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val actionManager: DeviceActionManager
) {
    companion object {
        private const val TAG = "OtaUpdateManager"
        const val ACTION_INSTALL_COMPLETE = "com.edusphere.agent.INSTALL_COMPLETE"
    }

    fun downloadAndInstallApk(apkUrl: String) {
        actionManager.showAlert("Cập Nhật Hệ Thống", "Đang tải bản cập nhật mới. Vui lòng không tắt máy...", "INFO")
        
        thread {
            try {
                Log.d(TAG, "Bắt đầu tải APK từ: $apkUrl")
                val url = URL(apkUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 15000
                connection.readTimeout = 60000
                connection.connect()

                if (connection.responseCode != HttpURLConnection.HTTP_OK) {
                    throw Exception("Lỗi tải file: HTTP ${connection.responseCode}")
                }

                val apkFile = File(context.cacheDir, "update.apk")
                if (apkFile.exists()) {
                    apkFile.delete()
                }

                val inputStream: InputStream = connection.inputStream
                val outputStream = FileOutputStream(apkFile)
                val buffer = ByteArray(4096)
                var bytesRead: Int

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                }

                outputStream.close()
                inputStream.close()
                connection.disconnect()

                Log.d(TAG, "Tải file hoàn tất: ${apkFile.absolutePath}, Size: ${apkFile.length()}")
                
                Handler(Looper.getMainLooper()).post {
                    actionManager.showAlert("Cập Nhật Hệ Thống", "Tải xong! Đang tiến hành cài đặt ngầm...", "SUCCESS")
                }
                
                installApkSilently(apkFile)

            } catch (e: Exception) {
                Log.e(TAG, "Lỗi quá trình tải/cài đặt APK", e)
                Handler(Looper.getMainLooper()).post {
                    actionManager.showAlert("Lỗi Cập Nhật", "Lỗi tải bản cập nhật: ${e.message}", "WARNING")
                }
            }
        }
    }

    private fun installApkSilently(apkFile: File) {
        val packageInstaller = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        var sessionId = -1

        try {
            sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)

            val out = session.openWrite("package", 0, -1)
            val input = apkFile.inputStream()
            val buffer = ByteArray(65536)
            var c: Int
            while (input.read(buffer).also { c = it } != -1) {
                out.write(buffer, 0, c)
            }
            session.fsync(out)
            input.close()
            out.close()

            // Tạo PendingIntent để nhận kết quả cài đặt
            val intent = Intent(ACTION_INSTALL_COMPLETE)
            intent.setPackage(context.packageName)
            
            // Xử lý cờ PendingIntent dựa theo phiên bản Android
            val flags = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                intent,
                flags
            )
            
            val statusReceiver = pendingIntent.intentSender
            Log.d(TAG, "Bắt đầu commit session cài đặt ngầm...")
            session.commit(statusReceiver)
            session.close()

        } catch (e: Exception) {
            Log.e(TAG, "Lỗi khi cài đặt APK ngầm", e)
            if (sessionId != -1) {
                packageInstaller.abandonSession(sessionId)
            }
            Handler(Looper.getMainLooper()).post {
                actionManager.showAlert("Lỗi Cài Đặt", "Không thể cài đặt bản cập nhật: ${e.message}", "WARNING")
            }
        }
    }
}

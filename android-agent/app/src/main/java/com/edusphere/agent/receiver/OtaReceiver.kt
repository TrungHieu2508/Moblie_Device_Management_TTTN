package com.edusphere.agent.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log
import android.widget.Toast

class OtaReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_INSTALL_COMPLETE = "com.edusphere.agent.INSTALL_COMPLETE"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_INSTALL_COMPLETE) {
            val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
            val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
            
            Log.d("OtaReceiver", "Install status: $status, message: $message")
            
            when (status) {
                PackageInstaller.STATUS_SUCCESS -> {
                    // Update success - device usually restarts the app, but log it just in case
                    Log.i("OtaReceiver", "Update installed successfully")
                    Toast.makeText(context, "Cập nhật ứng dụng thành công!", Toast.LENGTH_LONG).show()
                }
                PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                    Log.i("OtaReceiver", "Requesting user confirmation for install")
                    val confirmationIntent = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                    if (confirmationIntent != null) {
                        confirmationIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        context.startActivity(confirmationIntent)
                    }
                }
                else -> {
                    Log.e("OtaReceiver", "Install failed. Status: $status, Message: $message")
                    Toast.makeText(context, "Cập nhật thất bại: $message", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}

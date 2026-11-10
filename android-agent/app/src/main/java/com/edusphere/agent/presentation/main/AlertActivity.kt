package com.edusphere.agent.presentation.main

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.edusphere.agent.R

class AlertActivity : AppCompatActivity() {

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
        
        setContentView(R.layout.activity_alert)
        bindAlertData(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        bindAlertData(intent)
    }

    private fun bindAlertData(intent: Intent?) {
        val title = intent?.getStringExtra("ALERT_TITLE") ?: "Cảnh Báo Vi Phạm!"
        val message = intent?.getStringExtra("ALERT_MESSAGE") ?: "Có thông báo mới từ hệ thống!"
        val type = intent?.getStringExtra("ALERT_TYPE") ?: "WARNING" // "SUCCESS", "WARNING", "INFO"
        
        val tvAlertTitle = findViewById<TextView>(R.id.tvAlertTitle)
        val tvAlertMessage = findViewById<TextView>(R.id.tvAlertMessage)
        val btnAlertOk = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnAlertOk)
        val ivAlertIcon = findViewById<ImageView>(R.id.ivAlertIcon)
        
        tvAlertTitle.text = title
        tvAlertMessage.text = message
        
        when (type) {
            "SUCCESS" -> {
                ivAlertIcon.setImageResource(android.R.drawable.ic_dialog_info)
                ivAlertIcon.setColorFilter(Color.parseColor("#4CAF50"))
                btnAlertOk.setBackgroundColor(Color.parseColor("#4CAF50"))
                btnAlertOk.rippleColor = android.content.res.ColorStateList.valueOf(Color.parseColor("#81C784"))
            }
            "INFO" -> {
                ivAlertIcon.setImageResource(android.R.drawable.ic_dialog_info)
                ivAlertIcon.setColorFilter(Color.parseColor("#2196F3"))
                btnAlertOk.setBackgroundColor(Color.parseColor("#2196F3"))
                btnAlertOk.rippleColor = android.content.res.ColorStateList.valueOf(Color.parseColor("#64B5F6"))
            }
            else -> { // WARNING
                ivAlertIcon.setImageResource(android.R.drawable.ic_dialog_alert)
                ivAlertIcon.setColorFilter(Color.parseColor("#FF5252"))
                btnAlertOk.setBackgroundColor(Color.parseColor("#9C27B0"))
                btnAlertOk.rippleColor = android.content.res.ColorStateList.valueOf(Color.parseColor("#D500F9"))
            }
        }
        
        btnAlertOk.setOnClickListener {
            if (type == "WARNING") {
                try {
                    val startMain = Intent(Intent.ACTION_MAIN)
                    startMain.addCategory(Intent.CATEGORY_HOME)
                    startMain.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    startActivity(startMain)
                } catch (_: Exception) {}
            }
            finish()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Không cho bấm nút Back để quay lại app bị cấm
    }
}

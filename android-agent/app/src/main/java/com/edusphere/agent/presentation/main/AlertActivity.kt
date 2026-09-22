package com.edusphere.agent.presentation.main

import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.edusphere.agent.R

class AlertActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Ensure dialog window styling if needed, or rely on manifest theme
        setContentView(R.layout.activity_alert)

        val title = intent.getStringExtra("ALERT_TITLE") ?: "Cảnh Báo Vi Phạm!"
        val message = intent.getStringExtra("ALERT_MESSAGE") ?: "Có thông báo mới từ hệ thống!"
        val type = intent.getStringExtra("ALERT_TYPE") ?: "WARNING" // "SUCCESS", "WARNING", "INFO"
        
        val tvAlertTitle = findViewById<TextView>(R.id.tvAlertTitle)
        val tvAlertMessage = findViewById<TextView>(R.id.tvAlertMessage)
        val btnAlertOk = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnAlertOk)
        val ivAlertIcon = findViewById<ImageView>(R.id.ivAlertIcon) // Need to add this ID in XML
        
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
                btnAlertOk.setBackgroundColor(Color.parseColor("#9C27B0")) // Purple as requested
                btnAlertOk.rippleColor = android.content.res.ColorStateList.valueOf(Color.parseColor("#D500F9"))
            }
        }
        
        btnAlertOk.setOnClickListener {
            finish()
        }
    }
}

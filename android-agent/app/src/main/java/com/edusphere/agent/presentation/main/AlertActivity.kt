package com.edusphere.agent.presentation.main

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.edusphere.agent.R

class AlertActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Ensure dialog window styling if needed, or rely on manifest theme
        setContentView(R.layout.activity_alert)

        val message = intent.getStringExtra("ALERT_MESSAGE") ?: "Có thông báo mới từ hệ thống!"
        
        findViewById<TextView>(R.id.tvAlertMessage).text = message
        
        findViewById<Button>(R.id.btnAlertOk).setOnClickListener {
            finish()
        }
    }
}

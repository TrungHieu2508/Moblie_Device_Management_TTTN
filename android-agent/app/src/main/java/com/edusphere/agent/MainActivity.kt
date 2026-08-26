package com.edusphere.agent

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.edusphere.agent.presentation.viewmodel.MainViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupObservers()
        setupListeners()
    }

    override fun onResume() {
        super.onResume()
        viewModel.checkStatus()
    }

    private fun startHeartbeatService() {
        val serviceIntent = android.content.Intent(this, com.edusphere.agent.presentation.service.HeartbeatService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)
    }

    private fun setupListeners() {
        findViewById<Button>(R.id.btnForceSync).setOnClickListener {
            viewModel.checkStatus()
        }

        findViewById<Button>(R.id.btnRegister).setOnClickListener {
            val enrollmentCode = findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.etEnrollmentCode).text.toString().trim()
            if (enrollmentCode.isNotEmpty()) {
                viewModel.registerDevice(enrollmentCode)
            } else {
                android.widget.Toast.makeText(this, "Vui lòng nhập Enrollment Code", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupObservers() {
        val tvServerStatus = findViewById<TextView>(R.id.tvServerStatus)
        val indicatorServerStatus = findViewById<View>(R.id.indicatorServerStatus)
        val tvMdmStatus = findViewById<TextView>(R.id.tvMdmStatus)
        val indicatorMdmStatus = findViewById<View>(R.id.indicatorMdmStatus)
        
        val tvDeviceId = findViewById<TextView>(R.id.tvDeviceId)
        val tvDeviceModel = findViewById<TextView>(R.id.tvDeviceModel)
        val tvOsVersion = findViewById<TextView>(R.id.tvOsVersion)
        
        val cardRegistration = findViewById<View>(R.id.cardRegistration)
        val btnRegister = findViewById<Button>(R.id.btnRegister)

        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                // Update Device Info
                tvDeviceId.text = state.deviceId
                tvDeviceModel.text = state.deviceModel
                tvOsVersion.text = state.osVersion

                // Update MDM Status
                if (state.isDeviceOwner) {
                    tvMdmStatus.text = getString(R.string.status_active)
                    tvMdmStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.success))
                    indicatorMdmStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.success)
                } else {
                    tvMdmStatus.text = getString(R.string.status_inactive)
                    tvMdmStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.error))
                    indicatorMdmStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.error)
                }

                // Update Server Status & Registration UI
                if (state.isRegistered) {
                    tvServerStatus.text = getString(R.string.status_connected)
                    tvServerStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.success))
                    indicatorServerStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.success)
                    cardRegistration.visibility = View.GONE
                    
                    // Start the background service to maintain connection with Dashboard
                    startHeartbeatService()
                } else {
                    tvServerStatus.text = getString(R.string.status_offline)
                    tvServerStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.offline))
                    indicatorServerStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.offline)
                    cardRegistration.visibility = View.VISIBLE
                }

                // Handle Loading state
                btnRegister.isEnabled = !state.isLoading
                btnRegister.text = if (state.isLoading) "Đang đăng ký..." else "Đăng ký"

                // Handle Error
                state.error?.let {
                    android.widget.Toast.makeText(this@MainActivity, it, android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
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

    private fun setupListeners() {
        findViewById<Button>(R.id.btnForceSync).setOnClickListener {
            // Trigger a manual sync or heartbeat here later
            viewModel.checkStatus()
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

                // Update Server Status (Based on registration for now)
                if (state.isRegistered) {
                    tvServerStatus.text = getString(R.string.status_connected)
                    tvServerStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.success))
                    indicatorServerStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.success)
                } else {
                    tvServerStatus.text = getString(R.string.status_offline)
                    tvServerStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.offline))
                    indicatorServerStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.offline)
                }
            }
        }
    }
}
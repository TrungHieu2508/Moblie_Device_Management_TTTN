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
import com.google.android.material.button.MaterialButton
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private val viewModel: MainViewModel by viewModels()
    
    @javax.inject.Inject
    lateinit var sharedPreferencesManager: com.edusphere.agent.data.local.SharedPreferencesManager
    
    private lateinit var tvDeviceId: TextView
    private lateinit var tvDeviceModel: TextView
    private lateinit var tvOsVersion: TextView
    private lateinit var tvCampus: TextView
    private lateinit var tvSchool: TextView
    private lateinit var btnForceSync: MaterialButton
    private lateinit var btnPauseMdm: MaterialButton
    private lateinit var btnUnenroll: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupListeners()
        setupObservers()
        
        // Restore saved URL to UI
        val savedUrl = sharedPreferencesManager.getServerUrl()
        if (savedUrl != null) {
            findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.etServerUrl).setText(savedUrl)
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.checkStatus()
        checkUsageStatsPermission()
    }

    private fun checkUsageStatsPermission() {
        val appOps = getSystemService(android.content.Context.APP_OPS_SERVICE) as android.app.AppOpsManager
        val mode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
        } else {
            appOps.checkOpNoThrow(android.app.AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), packageName)
        }
        if (mode != android.app.AppOpsManager.MODE_ALLOWED) {
            android.widget.Toast.makeText(this, "Vui lòng cấp quyền Truy cập dữ liệu sử dụng để phát hiện ứng dụng", android.widget.Toast.LENGTH_LONG).show()
            startActivity(android.content.Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }
    }

    private fun startHeartbeatService() {
        val serviceIntent = android.content.Intent(this, com.edusphere.agent.presentation.service.HeartbeatService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)
    }

    private val barcodeLauncher = registerForActivityResult(com.journeyapps.barcodescanner.ScanContract()) { result ->
        if (result.contents != null) {
            try {
                val json = org.json.JSONObject(result.contents)
                var serverUrl = json.optString("serverUrl")
                val code = json.optString("code")
                
                if (serverUrl.isNotEmpty() && code.isNotEmpty()) {
                    if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
                        serverUrl = "http://$serverUrl"
                    }
                    findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.etServerUrl).setText(serverUrl)
                    findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.etEnrollmentCode).setText(code)
                    
                    // Auto submit
                    sharedPreferencesManager.saveServerUrl(serverUrl)
                    viewModel.registerDevice(code)
                } else {
                    android.widget.Toast.makeText(this, "Mã QR không đúng định dạng", android.widget.Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                android.widget.Toast.makeText(this, "Không thể đọc mã QR", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupListeners() {
        findViewById<Button>(R.id.btnForceSync).setOnClickListener {
            viewModel.checkStatus()
        }
        
        findViewById<Button>(R.id.btnScanQr).setOnClickListener {
            val options = com.journeyapps.barcodescanner.ScanOptions()
            options.setDesiredBarcodeFormats(com.journeyapps.barcodescanner.ScanOptions.QR_CODE)
            options.setPrompt("Quét Mã Ghi Danh trên màn hình máy tính")
            options.setCameraId(0)
            options.setBeepEnabled(true)
            options.setBarcodeImageEnabled(false)
            barcodeLauncher.launch(options)
        }

        findViewById<Button>(R.id.btnRegister).setOnClickListener {
            var serverUrl = findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.etServerUrl).text.toString().trim()
            val enrollmentCode = findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.etEnrollmentCode).text.toString().trim()
            
            if (serverUrl.isEmpty()) {
                android.widget.Toast.makeText(this, "Vui lòng nhập Server URL", android.widget.Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
                serverUrl = "http://$serverUrl"
            }
            
            if (enrollmentCode.isNotEmpty()) {
                sharedPreferencesManager.saveServerUrl(serverUrl)
                viewModel.registerDevice(enrollmentCode)
            } else {
                android.widget.Toast.makeText(this, "Vui lòng nhập Enrollment Code", android.widget.Toast.LENGTH_SHORT).show()
            }
        }

        btnPauseMdm = findViewById(R.id.btnPauseMdm)
        btnUnenroll = findViewById(R.id.btnUnenroll)

        btnPauseMdm.setOnClickListener {
            showPinDialog {
                val isPaused = viewModel.uiState.value.isPaused
                viewModel.togglePause(!isPaused)
            }
        }

        btnUnenroll.setOnClickListener {
            showPinDialog {
                viewModel.unenroll()
                android.widget.Toast.makeText(this, "Đã gỡ ghi danh thiết bị", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showPinDialog(onSuccess: () -> Unit) {
        val input = android.widget.EditText(this)
        input.inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
        
        android.app.AlertDialog.Builder(this)
            .setTitle("Nhập mã PIN")
            .setMessage("Vui lòng nhập mã PIN quản trị (123456) để xác nhận.")
            .setView(input)
            .setPositiveButton("Xác nhận") { _, _ ->
                val pin = input.text.toString()
                if (pin == "123456") {
                    onSuccess()
                } else {
                    android.widget.Toast.makeText(this, "Mã PIN không đúng!", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Hủy", null)
            .show()
    }

    private fun setupObservers() {
        val tvServerStatus = findViewById<TextView>(R.id.tvServerStatus)
        val indicatorServerStatus = findViewById<View>(R.id.indicatorServerStatus)
        val tvMdmStatus = findViewById<TextView>(R.id.tvMdmStatus)
        val indicatorMdmStatus = findViewById<View>(R.id.indicatorMdmStatus)
        
        tvDeviceId = findViewById(R.id.tvDeviceId)
        tvDeviceModel = findViewById(R.id.tvDeviceModel)
        tvOsVersion = findViewById(R.id.tvOsVersion)
        tvCampus = findViewById(R.id.tvCampus)
        tvSchool = findViewById(R.id.tvSchool)
        val tvClassroom = findViewById<TextView>(R.id.tvClassroom)
        btnForceSync = findViewById(R.id.btnForceSync)
        
        val cardRegistration = findViewById<View>(R.id.cardRegistration)
        val btnRegister = findViewById<Button>(R.id.btnRegister)

        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                // Update Device Info
                tvDeviceId.text = state.deviceId
                tvDeviceModel.text = state.deviceModel
                tvOsVersion.text = state.osVersion
                tvCampus.text = state.campusName
                tvSchool.text = state.schoolName
                tvClassroom.text = state.classroomName

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

                // Update Server Status based on real-time connection
                if (state.isConnected) {
                    tvServerStatus.text = getString(R.string.status_connected)
                    tvServerStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.success))
                    indicatorServerStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.success)
                } else {
                    tvServerStatus.text = getString(R.string.status_offline)
                    tvServerStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.offline))
                    indicatorServerStatus.backgroundTintList = ContextCompat.getColorStateList(this@MainActivity, R.color.offline)
                }
                
                // Manage Registration UI visibility
                if (state.isRegistered) {
                    cardRegistration.visibility = View.GONE
                    btnPauseMdm.visibility = View.VISIBLE
                    btnUnenroll.visibility = View.VISIBLE
                    // Start the background service to maintain connection with Dashboard
                    startHeartbeatService()
                } else {
                    cardRegistration.visibility = View.VISIBLE
                    btnPauseMdm.visibility = View.GONE
                    btnUnenroll.visibility = View.GONE
                }

                // Update Pause button text
                if (state.isPaused) {
                    btnPauseMdm.text = "Tiếp tục MDM (Đang Tạm Dừng)"
                    btnPauseMdm.setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.success))
                } else {
                    btnPauseMdm.text = "Tạm dừng MDM"
                    btnPauseMdm.setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.error))
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
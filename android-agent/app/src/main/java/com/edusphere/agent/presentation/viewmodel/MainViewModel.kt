package com.edusphere.agent.presentation.viewmodel

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.provider.Settings
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.edusphere.agent.domain.repository.DeviceRepository
import com.edusphere.agent.receiver.MDMAdminReceiver
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val deviceRepository: DeviceRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    private val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent = ComponentName(context, MDMAdminReceiver::class.java)

    init {
        loadDeviceInfo()
        checkStatus()
    }

    private fun loadDeviceInfo() {
        viewModelScope.launch {
            val deviceInfo = deviceRepository.getDeviceInfo()
            _uiState.value = _uiState.value.copy(
                deviceId = deviceInfo?.deviceId ?: "Not Registered",
                deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
                osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
            )
        }
    }

    fun checkStatus() {
        val isDeviceOwner = dpm.isDeviceOwnerApp(context.packageName)
        
        viewModelScope.launch {
            val deviceInfo = deviceRepository.getDeviceInfo()
            _uiState.value = _uiState.value.copy(
                isDeviceOwner = isDeviceOwner,
                isRegistered = deviceInfo?.isRegistered == true
            )
        }
    }

    fun registerDevice(enrollmentCode: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val persistentDeviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: java.util.UUID.randomUUID().toString()
            
            var safeSerialNumber = "UNKNOWN_SERIAL"
            try {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    safeSerialNumber = Build.SERIAL.takeIf { it != Build.UNKNOWN } ?: "UNKNOWN_SERIAL"
                } else {
                    // Requires permission READ_PHONE_STATE. We won't crash if denied.
                    try {
                        safeSerialNumber = Build.getSerial().takeIf { it != Build.UNKNOWN } ?: "UNKNOWN_SERIAL"
                    } catch (e: SecurityException) {
                        safeSerialNumber = "UNKNOWN_SERIAL"
                    }
                }
            } catch (e: Exception) {
                safeSerialNumber = "UNKNOWN_SERIAL"
            }

            // Build Registration Request
            val request = com.edusphere.agent.data.remote.model.RegistrationRequest(
                deviceId = persistentDeviceId,
                deviceName = Build.MODEL,
                serialNumber = safeSerialNumber,
                model = Build.MODEL,
                androidVersion = Build.VERSION.RELEASE,
                agentVersion = "1.0",
                macAddress = "02:00:00:00:00:00", // Placeholder due to Android restrictions
                enrollmentCode = enrollmentCode
            )

            val result = deviceRepository.registerDevice(request)
            result.onSuccess {
                checkStatus()
                loadDeviceInfo()
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(error = exception.message ?: "Đăng ký thất bại.")
            }
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }
}

data class MainUiState(
    val isDeviceOwner: Boolean = false,
    val isRegistered: Boolean = false,
    val deviceId: String = "Loading...",
    val deviceModel: String = "Loading...",
    val osVersion: String = "Loading...",
    val isLoading: Boolean = false,
    val error: String? = null
)

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
import com.edusphere.agent.data.remote.websocket.CommandReceiver
import com.edusphere.agent.data.local.SharedPreferencesManager
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
    private val commandReceiver: CommandReceiver,
    private val sharedPreferencesManager: SharedPreferencesManager,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    private val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent = ComponentName(context, MDMAdminReceiver::class.java)

    init {
        loadDeviceInfo()
        checkStatus()
        observeConnectionStatus()
    }

    private fun observeConnectionStatus() {
        viewModelScope.launch {
            commandReceiver.isConnected.collect { connected ->
                _uiState.value = _uiState.value.copy(isConnected = connected)
            }
        }
    }

    private fun loadDeviceInfo() {
        viewModelScope.launch {
            val deviceInfo = deviceRepository.getDeviceInfo()
            _uiState.value = _uiState.value.copy(
                deviceId = deviceInfo?.deviceId ?: "Not Registered",
                deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
                osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                campusName = deviceInfo?.campusName ?: "Chưa xác định",
                schoolName = deviceInfo?.schoolName ?: "Chưa xác định",
                classroomName = deviceInfo?.classroomName ?: "Chưa xác định"
            )
        }
    }

    fun checkStatus() {
        val isDeviceOwner = dpm.isDeviceOwnerApp(context.packageName)
        val isPaused = sharedPreferencesManager.isMdmPaused()
        
        viewModelScope.launch {
            val deviceInfo = deviceRepository.getDeviceInfo()
            _uiState.value = _uiState.value.copy(
                isDeviceOwner = isDeviceOwner,
                isRegistered = deviceInfo?.isRegistered == true,
                isPaused = isPaused
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

    fun unenroll() {
        viewModelScope.launch {
            // Clear local database
            deviceRepository.clearDeviceInfo()
            // Disconnect websocket
            commandReceiver.disconnect()
            // Turn off pause if it was on
            sharedPreferencesManager.setMdmPaused(false)
            // Update UI
            checkStatus()
            loadDeviceInfo()
        }
    }

    fun togglePause(isPaused: Boolean) {
        sharedPreferencesManager.setMdmPaused(isPaused)
        checkStatus()
        
        if (isPaused) {
            commandReceiver.disconnect()
        } else {
            // Reconnect
            viewModelScope.launch {
                val deviceInfo = deviceRepository.getDeviceInfo()
                if (deviceInfo != null && deviceInfo.isRegistered) {
                    commandReceiver.connect(
                        serverUrl = deviceInfo.serverUrl,
                        token = deviceInfo.registrationToken,
                        deviceId = deviceInfo.deviceId
                    )
                }
            }
        }
    }
}

data class MainUiState(
    val isDeviceOwner: Boolean = false,
    val isRegistered: Boolean = false,
    val isConnected: Boolean = false,
    val isPaused: Boolean = false,
    val deviceId: String = "Loading...",
    val deviceModel: String = "Loading...",
    val osVersion: String = "Loading...",
    val campusName: String = "Loading...",
    val schoolName: String = "Loading...",
    val classroomName: String = "Loading...",
    val isLoading: Boolean = false,
    val error: String? = null
)

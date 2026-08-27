package com.edusphere.agent.data.remote.websocket

import android.util.Log
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONObject
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton
import android.content.Context
import android.content.Intent
import com.edusphere.agent.domain.action.DeviceActionManager
import com.edusphere.agent.presentation.main.LockActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

@Singleton
class CommandReceiver @Inject constructor(
    private val actionManager: DeviceActionManager,
    private val sharedPreferencesManager: com.edusphere.agent.data.local.SharedPreferencesManager,
    @ApplicationContext private val context: Context
) {

    private var webSocketClient: WebSocketClient? = null
    private val TAG = "CommandReceiver"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()
    
    private var reconnectJob: Job? = null
    
    // Store connection params for auto-reconnect
    private var currentServerUrl: String? = null
    private var currentToken: String? = null
    private var currentDeviceId: String? = null

    fun connect(serverUrl: String, token: String, deviceId: String) {
        // Use user-defined Server URL from SharedPreferences if available, otherwise fallback to serverUrl parameter
        val prefsUrl = sharedPreferencesManager.getServerUrl()
        val actualServerUrl = if (!prefsUrl.isNullOrEmpty()) prefsUrl else serverUrl
        
        currentServerUrl = actualServerUrl
        currentToken = token
        currentDeviceId = deviceId
        
        reconnectJob?.cancel()
        
        if (webSocketClient != null && webSocketClient?.isOpen == true) {
            Log.d(TAG, "WebSocket is already connected")
            return
        }

        // Construct STOMP endpoint URL
        var wsUrl = if (actualServerUrl.startsWith("http")) {
            actualServerUrl.replaceFirst("http", "ws")
        } else {
            actualServerUrl
        }
        
        // Ensure wsUrl ends with /api/ws-agent if it doesn't already
        if (!wsUrl.endsWith("/api/ws-agent")) {
            if (!wsUrl.endsWith("/")) {
                wsUrl += "/"
            }
            wsUrl += "api/ws-agent"
        }

        val uri = URI(wsUrl)
        val headers = mapOf("Authorization" to "Device $token")

        webSocketClient = object : WebSocketClient(uri, headers) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                Log.i(TAG, "WebSocket Opened, sending STOMP CONNECT...")
                val connectFrame = "CONNECT\n" +
                        "accept-version:1.2,1.1,1.0\n" +
                        "heart-beat:10000,10000\n" +
                        "Authorization:Device $token\n" +
                        "\n\u0000"
                webSocketClient?.send(connectFrame)
            }

            override fun onMessage(message: String?) {
                Log.i(TAG, "Received message: $message")
                message?.let {
                    if (it.startsWith("CONNECTED")) {
                        Log.i(TAG, "STOMP Connected! Subscribing to command topic...")
                        val subscribeFrame = "SUBSCRIBE\n" +
                                "id:sub-0\n" +
                                "destination:/topic/devices/$deviceId/command\n" +
                                "\n\u0000"
                        webSocketClient?.send(subscribeFrame)
                        _isConnected.value = true
                    } else if (it.startsWith("MESSAGE")) {
                        // Extract JSON payload from STOMP MESSAGE frame
                        val payloadIndex = it.indexOf("\n\n")
                        if (payloadIndex != -1) {
                            val jsonPayload = it.substring(payloadIndex + 2).replace("\u0000", "")
                            handleCommand(jsonPayload)
                        }
                    }
                }
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                Log.i(TAG, "WebSocket Closed: $reason")
                _isConnected.value = false
                scheduleReconnect()
            }

            override fun onError(ex: Exception?) {
                Log.e(TAG, "WebSocket Error", ex)
                _isConnected.value = false
            }
        }
        
        try {
            webSocketClient?.connect()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect WebSocket", e)
            scheduleReconnect()
        }
    }
    
    private fun scheduleReconnect() {
        if (currentServerUrl == null) return
        
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            Log.i(TAG, "Waiting 5 seconds before reconnecting...")
            delay(5000)
            connect(currentServerUrl!!, currentToken!!, currentDeviceId!!)
        }
    }

    private fun handleCommand(message: String) {
        try {
            val json = JSONObject(message)
            val commandType = json.optString("commandType", json.optString("command")) // Backend sends "commandType" usually, but sometimes "command"
            val payload = json.optJSONObject("payload")
            
            Log.d(TAG, "Executing command: $commandType")
            
            executeCommand(commandType, payload)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse command", e)
        }
    }
    
    fun executeCommand(commandType: String, payload: JSONObject?) {
        try {
            when (commandType) {
                "LOCK_SCREEN" -> {
                    actionManager.lockScreen()
                }
                "RING_ALARM" -> {
                    actionManager.ringAlarm()
                }
                "WIPE_DATA" -> {
                    actionManager.wipeData()
                }
                "START_STREAM" -> {
                    Log.i(TAG, "Received START_STREAM command, logging only (not implemented yet)")
                }
                "REBOOT_DEVICE" -> {
                    actionManager.reboot()
                }
                "CLEAR_BACKGROUND_APPS" -> {
                    actionManager.clearRecents()
                }
                "OPEN_APP" -> {
                    payload?.optString("packageName")?.let {
                        actionManager.openApp(it)
                    }
                }
                "OPEN_URL" -> {
                    payload?.optString("url")?.let {
                        actionManager.openUrl(it)
                    }
                }
                "SHOW_ALERT" -> {
                    val message = payload?.optString("message", "Có thông báo mới từ hệ thống!")
                    if (message != null) {
                        actionManager.showAlert(message)
                    }
                }
                "HIDE_APP" -> {
                    val pkg = payload?.optString("packageName")
                    val hidden = payload?.optBoolean("hidden") ?: false
                    if (pkg != null) {
                        actionManager.setAppHidden(pkg, hidden)
                    }
                }
                "BLOCK_UNINSTALL" -> {
                    val pkg = payload?.optString("packageName")
                    val blocked = payload?.optBoolean("blocked") ?: false
                    if (pkg != null) {
                        actionManager.setUninstallBlocked(pkg, blocked)
                    }
                }
                "DISABLE_CAMERA" -> {
                    val disabled = payload?.optBoolean("disabled") ?: false
                    actionManager.setCameraDisabled(disabled)
                }
                "DISABLE_FACTORY_RESET" -> {
                    val disabled = payload?.optBoolean("disabled") ?: false
                    actionManager.setFactoryResetDisabled(disabled)
                }
                "SHOW_VIOLATION_LOCK" -> {
                    val intent = Intent(context, LockActivity::class.java)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    val message = payload?.optString("message", "Thiết bị đang bị khóa do vi phạm kỷ luật!")
                    intent.putExtra("LOCK_MESSAGE", message)
                    context.startActivity(intent)
                }
                "UNLOCK_DEVICE" -> {
                    val intent = Intent("com.edusphere.agent.ACTION_UNLOCK_DEVICE")
                    context.sendBroadcast(intent)
                }
                else -> {
                    Log.w(TAG, "Unknown command type: $commandType")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse command", e)
        }
    }
    
    fun disconnect() {
        reconnectJob?.cancel()
        currentServerUrl = null
        webSocketClient?.close()
        webSocketClient = null
        _isConnected.value = false
    }
}

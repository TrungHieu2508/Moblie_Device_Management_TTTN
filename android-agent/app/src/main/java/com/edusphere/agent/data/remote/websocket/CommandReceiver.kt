package com.edusphere.agent.data.remote.websocket

import android.util.Log
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONObject
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton
import com.edusphere.agent.domain.action.DeviceActionManager

@Singleton
class CommandReceiver @Inject constructor(
    private val actionManager: DeviceActionManager
) {

    private var webSocketClient: WebSocketClient? = null
    private val TAG = "CommandReceiver"

    fun connect(serverUrl: String, token: String, deviceId: String) {
        if (webSocketClient != null && webSocketClient?.isOpen == true) {
            Log.d(TAG, "WebSocket is already connected")
            return
        }

        // Construct STOMP or raw WebSocket URL. Assuming a raw WebSocket for command channel.
        // E.g., ws://192.168.1.100:8080/ws/commands?deviceId=xyz
        val wsUrl = if (serverUrl.startsWith("http")) {
            serverUrl.replaceFirst("http", "ws")
        } else {
            serverUrl
        } + "ws/commands?deviceId=$deviceId"

        val uri = URI(wsUrl)
        val headers = mapOf("Authorization" to "Bearer $token")

        webSocketClient = object : WebSocketClient(uri, headers) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                Log.i(TAG, "WebSocket Opened")
            }

            override fun onMessage(message: String?) {
                Log.i(TAG, "Received message: $message")
                message?.let {
                    handleCommand(it)
                }
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                Log.i(TAG, "WebSocket Closed: $reason")
                // TODO: Implement reconnection logic
            }

            override fun onError(ex: Exception?) {
                Log.e(TAG, "WebSocket Error", ex)
            }
        }
        
        webSocketClient?.connect()
    }

    private fun handleCommand(message: String) {
        try {
            val json = JSONObject(message)
            val commandType = json.optString("command")
            val payload = json.optJSONObject("payload")
            
            Log.d(TAG, "Executing command: $commandType")
            
            when (commandType) {
                "LOCK_SCREEN" -> {
                    actionManager.lockScreen()
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
                "REBOOT" -> {
                    actionManager.reboot()
                }
                "CLEAR_RECENTS" -> {
                    actionManager.clearRecents()
                }
                "SET_KIOSK" -> {
                    val pkg = payload?.optString("packageName")
                    val enable = payload?.optBoolean("enable") ?: false
                    if (pkg != null) {
                        actionManager.setKioskMode(pkg, enable)
                    }
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
        webSocketClient?.close()
        webSocketClient = null
    }
}

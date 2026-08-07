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

        // Construct STOMP endpoint URL
        // Backend Spring Boot exposes STOMP at /api/ws
        val wsUrl = if (serverUrl.startsWith("http")) {
            serverUrl.replaceFirst("http", "ws")
        } else {
            serverUrl
        } + "api/ws"

        val uri = URI(wsUrl)
        val headers = mapOf("Authorization" to "Bearer $token")

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

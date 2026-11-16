package com.edusphere.agent.domain.rule

import com.edusphere.agent.data.local.DeviceEntity
import com.edusphere.agent.domain.repository.DeviceRepository
import com.edusphere.agent.domain.action.DeviceActionManager
import com.edusphere.agent.data.local.SharedPreferencesManager
import com.edusphere.agent.data.remote.model.CurrentApp
import com.edusphere.agent.data.remote.websocket.CommandReceiver
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever

class RuleDetectorTest {

    private lateinit var deviceRepository: DeviceRepository
    private lateinit var actionManager: DeviceActionManager
    private lateinit var sharedPreferencesManager: SharedPreferencesManager
    private lateinit var commandReceiver: CommandReceiver
    private lateinit var ruleDetector: RuleDetector

    private lateinit var context: android.content.Context

    @Before
    fun setup() {
        context = mock()
        deviceRepository = mock()
        actionManager = mock()
        sharedPreferencesManager = mock()
        commandReceiver = mock()
        ruleDetector = RuleDetector(context, deviceRepository, actionManager, sharedPreferencesManager, commandReceiver)
    }

    @Test
    fun testBlacklistViolation() {
        runBlocking {
            whenever(sharedPreferencesManager.isMdmPaused()).thenReturn(false)
            val mockDevice = DeviceEntity(1, "dev123", "Test Device", "token", "url", "campus", "school", "class", true)
            whenever(deviceRepository.getDeviceInfo()).thenReturn(mockDevice)

            ruleDetector.updatePolicies(
                whitelist = emptyList(),
                blacklist = listOf("com.example.game"),
                isWhitelistMode = false
            )

            ruleDetector.checkForegroundApp(CurrentApp("com.example.game", "Game App", ""))

            verify(commandReceiver).sendEvent(any())
        }
    }

    @Test
    fun testBlacklistNoViolation() {
        runBlocking {
            whenever(sharedPreferencesManager.isMdmPaused()).thenReturn(false)
            val mockDevice = DeviceEntity(1, "dev123", "Test Device", "token", "url", "campus", "school", "class", true)
            whenever(deviceRepository.getDeviceInfo()).thenReturn(mockDevice)

            ruleDetector.updatePolicies(
                whitelist = emptyList(),
                blacklist = listOf("com.example.game"),
                isWhitelistMode = false
            )

            ruleDetector.checkForegroundApp(CurrentApp("com.example.education", "Education App", ""))

            verify(commandReceiver, never()).sendEvent(any())
        }
    }

    @Test
    fun testWhitelistViolation() {
        runBlocking {
            whenever(sharedPreferencesManager.isMdmPaused()).thenReturn(false)
            val mockDevice = DeviceEntity(1, "dev123", "Test Device", "token", "url", "campus", "school", "class", true)
            whenever(deviceRepository.getDeviceInfo()).thenReturn(mockDevice)

            ruleDetector.updatePolicies(
                whitelist = listOf("com.example.education"),
                blacklist = emptyList(),
                isWhitelistMode = true
            )

            ruleDetector.checkForegroundApp(CurrentApp("com.example.game", "Game App", ""))

            verify(commandReceiver).sendEvent(any())
        }
    }
}

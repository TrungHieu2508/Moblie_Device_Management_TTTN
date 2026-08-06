package com.edusphere.agent.domain.rule

import com.edusphere.agent.data.local.DeviceEntity
import com.edusphere.agent.domain.repository.DeviceRepository
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
    private lateinit var ruleDetector: RuleDetector

    @Before
    fun setup() {
        deviceRepository = mock()
        ruleDetector = RuleDetector(deviceRepository)
    }

    @Test
    fun testBlacklistViolation() {
        runBlocking {
            val mockDevice = DeviceEntity(1, "dev123", "Test Device", "token", "url", true)
            whenever(deviceRepository.getDeviceInfo()).thenReturn(mockDevice)

        ruleDetector.updatePolicies(
            whitelist = emptyList(),
            blacklist = listOf("com.example.game"),
            isWhitelistMode = false
        )

        ruleDetector.checkForegroundApp("com.example.game")

        verify(deviceRepository).sendViolation(any())
        }
    }

    @Test
    fun testBlacklistNoViolation() {
        runBlocking {
            val mockDevice = DeviceEntity(1, "dev123", "Test Device", "token", "url", true)
            whenever(deviceRepository.getDeviceInfo()).thenReturn(mockDevice)

        ruleDetector.updatePolicies(
            whitelist = emptyList(),
            blacklist = listOf("com.example.game"),
            isWhitelistMode = false
        )

        ruleDetector.checkForegroundApp("com.example.education")

        verify(deviceRepository, never()).sendViolation(any())
        }
    }

    @Test
    fun testWhitelistViolation() {
        runBlocking {
            val mockDevice = DeviceEntity(1, "dev123", "Test Device", "token", "url", true)
            whenever(deviceRepository.getDeviceInfo()).thenReturn(mockDevice)

        ruleDetector.updatePolicies(
            whitelist = listOf("com.example.education"),
            blacklist = emptyList(),
            isWhitelistMode = true
        )

        ruleDetector.checkForegroundApp("com.example.game")

        verify(deviceRepository).sendViolation(any())
        }
    }
}

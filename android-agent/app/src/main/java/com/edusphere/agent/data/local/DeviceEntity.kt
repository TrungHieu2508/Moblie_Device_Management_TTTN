package com.edusphere.agent.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "device_info")
data class DeviceEntity(
    @PrimaryKey val id: Int = 1, // Only one record is needed for the device
    val deviceId: String,
    val deviceName: String,
    val registrationToken: String,
    val serverUrl: String,
    val campusName: String?,
    val schoolName: String?,
    val isRegistered: Boolean
)

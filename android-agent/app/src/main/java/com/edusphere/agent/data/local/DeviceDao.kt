package com.edusphere.agent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface DeviceDao {
    @Query("SELECT * FROM device_info WHERE id = 1")
    suspend fun getDeviceInfo(): DeviceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDeviceInfo(device: DeviceEntity)
    
    @Query("DELETE FROM device_info")
    suspend fun clearDeviceInfo()
}

package com.edusphere.agent.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [DeviceEntity::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun deviceDao(): DeviceDao
}

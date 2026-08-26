package com.edusphere.agent.di

import android.content.Context
import androidx.room.Room
import com.edusphere.agent.data.local.AppDatabase
import com.edusphere.agent.data.local.DeviceDao
import com.edusphere.agent.data.remote.MdmApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "edusphere_agent.db"
        ).build()
    }

    @Provides
    @Singleton
    fun provideDeviceDao(database: AppDatabase): DeviceDao {
        return database.deviceDao()
    }

    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit {
        return Retrofit.Builder()
            // Changed to LAN IP so both Physical Device and Emulator can connect.
            .baseUrl("http://192.168.1.8:8081/") 
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideMdmApiService(retrofit: Retrofit): MdmApiService {
        return retrofit.create(MdmApiService::class.java)
    }
}

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
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    @Singleton
    fun provideDeviceDao(database: AppDatabase): DeviceDao {
        return database.deviceDao()
    }

    @Provides
    @Singleton
    fun provideRetrofit(dynamicBaseUrlInterceptor: DynamicBaseUrlInterceptor): Retrofit {
        val client = okhttp3.OkHttpClient.Builder()
            .addInterceptor(dynamicBaseUrlInterceptor)
            .build()

        return Retrofit.Builder()
            .client(client)
            .baseUrl("http://192.168.1.1:8080/") // Placeholder, will be replaced by Interceptor
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideMdmApiService(retrofit: Retrofit): MdmApiService {
        return retrofit.create(MdmApiService::class.java)
    }
}

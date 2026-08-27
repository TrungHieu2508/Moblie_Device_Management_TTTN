package com.edusphere.agent.di

import com.edusphere.agent.data.local.SharedPreferencesManager

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DynamicBaseUrlInterceptor @Inject constructor(
    private val sharedPreferencesManager: SharedPreferencesManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()
        val serverUrl = sharedPreferencesManager.getServerUrl()

        if (!serverUrl.isNullOrEmpty()) {
            val newBaseUrl = okhttp3.HttpUrl.parse(serverUrl)
            if (newBaseUrl != null) {
                val newUrl = request.url().newBuilder()
                    .scheme(newBaseUrl.scheme())
                    .host(newBaseUrl.host())
                    .port(newBaseUrl.port())
                    .build()
                request = request.newBuilder()
                    .url(newUrl)
                    .build()
            }
        }
        return chain.proceed(request)
    }
}

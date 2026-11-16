plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.edusphere.agent"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.edusphere.agent"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation("org.java-websocket:Java-WebSocket:1.5.3")
    
    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // Coroutines
    implementation(libs.coroutines.android)

    // WorkManager
    implementation(libs.work.runtime.ktx)
    implementation(libs.hilt.work)
    ksp(libs.hilt.compiler.ext)

    // Lifecycle ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.4")

    // ZXing for QR Code Scanning
    implementation(libs.zxing.android.embedded)
    implementation(libs.zxing.core)

    testImplementation(libs.junit)
    testImplementation(libs.mockito.core)
    testImplementation(libs.mockito.kotlin)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

// Tự động cấp quyền PROJECT_MEDIA, GET_USAGE_STATS, SYSTEM_ALERT_WINDOW cho MỌI thiết bị Android
// đang kết nối qua ADB ngay sau khi cài đặt APK (installDebug / installRelease)
tasks.matching { it.name == "installDebug" || it.name == "installRelease" }.configureEach {
    doLast {
        try {
            val adbExe = android.adbExecutable.absolutePath
            val devicesProc = ProcessBuilder(adbExe, "devices").redirectErrorStream(true).start()
            val output = devicesProc.inputStream.bufferedReader().readText()
            devicesProc.waitFor()

            val serials = output.lines()
                .drop(1)
                .map { it.trim() }
                .filter { it.endsWith("\tdevice") || it.matches(Regex("^\\S+\\s+device$")) }
                .map { it.split(Regex("\\s+"))[0] }

            for (serial in serials) {
                for (op in listOf("PROJECT_MEDIA", "GET_USAGE_STATS", "SYSTEM_ALERT_WINDOW")) {
                    ProcessBuilder(adbExe, "-s", serial, "shell", "appops", "set", "com.edusphere.agent", op, "allow")
                        .redirectErrorStream(true)
                        .start()
                        .waitFor()
                }
                ProcessBuilder(adbExe, "-s", serial, "shell", "dpm", "set-active-admin", "com.edusphere.agent/.receiver.MDMAdminReceiver")
                    .redirectErrorStream(true)
                    .start()
                    .waitFor()
                ProcessBuilder(adbExe, "-s", serial, "shell", "dpm", "set-device-owner", "com.edusphere.agent/.receiver.MDMAdminReceiver")
                    .redirectErrorStream(true)
                    .start()
                    .waitFor()
                println("Auto-granted PROJECT_MEDIA, GET_USAGE_STATS, SYSTEM_ALERT_WINDOW & Device Owner on device: $serial")
            }
        } catch (e: Exception) {
            println("Note: Could not auto-grant appops via ADB: ${e.message}")
        }
    }
}

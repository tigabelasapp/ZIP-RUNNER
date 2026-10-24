plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.penggilas.ziprunner"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.penggilas.ziprunner"
        minSdk = 24
        targetSdk = 35
        versionCode = 5
        versionName = "0.4.1"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("org.nanohttpd:nanohttpd:2.3.1")
}

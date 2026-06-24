// ── Android Configuration ────────────────────────────────────
// This file documents the Android-grade configuration needed for the Secure CBT mobile app.
//
// The following files should be created/modified after running `flutter create`:

/*
 * android/app/build.gradle additions:
 *
 * android {
 *   defaultConfig {
 *     minSdkVersion 24
 *     targetSdkVersion 34
 *   }
 *   buildFeatures {
 *     compose = false
 *   }
 * }
 *
 * dependencies {
 *   // Kotlin Native Plugin for Screen Security
 *   implementation "androidx.lifecycle:lifecycle-process:2.7.0"
 * }
 */

/*
 * android/app/src/main/AndroidManifest.xml additions:
 *
 * <!-- Screen Security: Prevent screenshots in recents -->
 * <!-- Set FLAG_SECURE on exam activities via Kotlin Native Plugin -->
 *
 * <!-- Lock Task Mode (requires device owner / kiosk app) -->
 * <uses-permission android:name="android.permission.BIND_DEVICE_ADMIN" />
 *
 * <!-- Internet -->
 * <uses-permission android:name="android.permission.INTERNET" />
 * <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
 *
 * <!-- Wake Lock (keep screen on during exam) -->
 * <uses-permission android:name="android.permission.WAKE_LOCK" />
 */

/*
 * MainActivity.kt (android/app/src/main/kotlin/.../MainActivity.kt):
 *
 * package com.securecbt.mobile
 *
 * import io.flutter.embedding.android.FlutterActivity
 * import io.flutter.embedding.engine.FlutterEngine
 * import android.view.WindowManager
 * import android.os.Bundle
 *
 * class MainActivity : FlutterActivity() {
 *     override fun onCreate(savedInstanceState: Bundle?) {
 *         super.onCreate(savedInstanceState)
 *
 *         // FLAG_SECURE: Prevent screenshots and screen recording
 *         window.setFlags(
 *             WindowManager.LayoutParams.FLAG_SECURE,
 *             WindowManager.LayoutParams.FLAG_SECURE
 *         )
 *     }
 *
 *     override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
 *         super.configureFlutterEngine(flutterEngine)
 *
 *         // Register Kotlin Native Plugin for Security Features
 *         flutterEngine.plugins.add(ScreenSecurityPlugin())
 *         flutterEngine.plugins.add(AppLifecyclePlugin())
 *     }
 * }
 */

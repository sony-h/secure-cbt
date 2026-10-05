package com.securecbt.secure_cbt_mobile

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import android.view.WindowManager
import android.os.Bundle
import android.os.Build
import android.content.res.Configuration
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var securityChannel: MethodChannel? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // FLAG_SECURE: Prevent screenshots and screen recording
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Screen Security & Kiosk/Violation Channel
        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.securecbt.mobile/security")
        securityChannel = channel

        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "enableSecureScreen" -> {
                    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    result.success(true)
                }
                "disableSecureScreen" -> {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    result.success(true)
                }
                "isMultiWindowMode" -> {
                    val inMultiWindow = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        isInMultiWindowMode
                    } else {
                        false
                    }
                    result.success(inMultiWindow)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    override fun onMultiWindowModeChanged(isInMultiWindowMode: Boolean, newConfig: Configuration?) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig)
        securityChannel?.invokeMethod("onMultiWindowChanged", isInMultiWindowMode)
    }
}

package com.securecbt.secure_cbt_mobile

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Vibrator
import android.os.VibratorManager
import android.os.VibrationEffect
import android.view.WindowManager
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var securityChannel: MethodChannel? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var vibrationStopRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // FLAG_SECURE: Prevent screenshots and screen recording
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }

    private fun getVibrator(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    private fun stopVibrationNative() {
        vibrationStopRunnable?.let { mainHandler.removeCallbacks(it) }
        vibrationStopRunnable = null
        try {
            getVibrator()?.cancel()
        } catch (_: Exception) {}
    }

    private fun vibrateViolation(durationMs: Long) {
        stopVibrationNative()
        val vibrator = getVibrator() ?: return
        if (!vibrator.hasVibrator()) return

        // Violent repeating pulsation: vibrate 400ms, pause 100ms, repeat
        val pattern = longArrayOf(0, 400, 100, 400, 100, 400, 100)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val effect = VibrationEffect.createWaveform(pattern, 0)
                vibrator.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, 0)
            }

            val stopRunnable = Runnable {
                try {
                    vibrator.cancel()
                } catch (_: Exception) {}
            }
            vibrationStopRunnable = stopRunnable
            mainHandler.postDelayed(stopRunnable, durationMs)
        } catch (_: Exception) {}
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
                "vibrateViolation" -> {
                    val durationMs = (call.argument<Number>("durationMs")?.toLong()) ?: 3000L
                    vibrateViolation(durationMs)
                    result.success(true)
                }
                "stopVibration" -> {
                    stopVibrationNative()
                    result.success(true)
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

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        securityChannel?.invokeMethod("onWindowFocusChanged", hasFocus)
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        securityChannel?.setMethodCallHandler(null)
        securityChannel = null
        super.cleanUpFlutterEngine(flutterEngine)
    }

    override fun onDestroy() {
        stopVibrationNative()
        super.onDestroy()
    }
}

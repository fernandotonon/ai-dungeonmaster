package uk.ftonon.rpg

import android.content.Context
import android.webkit.JavascriptInterface
import android.util.Log
import androidx.preference.PreferenceManager

/**
 * JavaScript interface for the WebView to interact with Android
 */
class WebAppInterface(private val context: Context) {
    
    /**
     * Get the FCM token
     */
    @JavascriptInterface
    fun getFcmToken(): String {
        val token = MainActivity.fcmToken ?: ""
        Log.d("WebAppInterface", "Returning FCM token: $token")
        return token
    }
    
    /**
     * Save credentials for biometric login
     */
    @JavascriptInterface
    fun saveCredentials(username: String, password: String) {
        if (context is MainActivity) {
            context.runOnUiThread {
                context.saveCredentialsToStorage(username, password)
            }
        }
    }

    /**
     * Save auth token for API calls
     */
    @JavascriptInterface
    fun saveAuthToken(token: String) {
        val sharedPrefs = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
        sharedPrefs.edit().putString("auth_token", token).apply()
        Log.d("WebAppInterface", "Auth token saved")
        
        // If we have an FCM token, send it to the backend now
        MainActivity.fcmToken?.let { fcmToken ->
            if (context is MainActivity) {
                context.runOnUiThread {
                    context.injectFcmToken()
                }
            }
        }
    }

    /**
     * Check if biometric authentication is available
     */
    @JavascriptInterface
    fun isBiometricAvailable(): Boolean {
        if (context is MainActivity) {
            return PreferenceManager.getDefaultSharedPreferences(context)
                .getBoolean("use_biometric", false) && context.hasStoredCredentials()
        }
        return false
    }

    /**
     * Request biometric login
     */
    @JavascriptInterface
    fun requestBiometricLogin() {
        if (context is MainActivity) {
            context.runOnUiThread {
                context.setupBiometricAuth()
            }
        }
    }
} 
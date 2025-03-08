package uk.ftonon.rpg

import android.content.Context
import android.webkit.JavascriptInterface

/**
 * JavaScript interface for the WebView to interact with Android
 */
class WebAppInterface(private val context: Context) {
    
    /**
     * Get the FCM token
     */
    @JavascriptInterface
    fun getFcmToken(): String {
        return MainActivity.fcmToken ?: ""
    }
    
    // Add other methods as needed
} 
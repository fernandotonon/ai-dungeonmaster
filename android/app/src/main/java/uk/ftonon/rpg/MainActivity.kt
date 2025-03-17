package uk.ftonon.rpg

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.preference.PreferenceManager
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import android.util.Log
import android.os.Build
import android.Manifest
import android.content.pm.PackageManager
import androidx.annotation.RequiresApi
import com.google.firebase.messaging.FirebaseMessaging
import android.annotation.SuppressLint
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var shouldAutoLogin = false
    private var credentials: Pair<String, String>? = null

    companion object {
        // Store the FCM token
        var fcmToken: String? = null
        
        // Function to update any active WebViews with the token
        fun updateWebViewWithToken() {
            // This will be called by active MainActivity instances
            activeInstances.forEach { it.injectFcmToken() }
        }
        
        // Keep track of active MainActivity instances
        private val activeInstances = mutableListOf<MainActivity>()
        
        // Notification permission request code
        private const val NOTIFICATION_PERMISSION_CODE = 123
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_main)

        // Enable WebView debugging
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        // Make sure WebView is visible
        webView.visibility = View.VISIBLE
        progressBar.visibility = View.VISIBLE

        // Use the standalone WebAppInterface class instead of the inner class
        webView.addJavascriptInterface(WebAppInterface(this), "Android")
        
        // Always set up normal webview - biometric auth will be handled by the web interface
        setupWebView()

        // Request notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermission()
        }
        
        // Get FCM token
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                fcmToken = task.result
                Log.d("MainActivity", "FCM Token: $fcmToken")
                injectFcmToken()
            } else {
                Log.e("MainActivity", "Failed to get FCM token", task.exception)
            }
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            allowFileAccess = true
            allowContentAccess = true
            // Add these settings to improve WebView performance
            setRenderPriority(WebSettings.RenderPriority.HIGH)
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            
            // Add additional settings to help with debugging
            loadsImagesAutomatically = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(true)
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("MainActivity", "Page finished loading: $url")
                progressBar.visibility = View.GONE
                webView.visibility = View.VISIBLE
                
                // Add JavaScript to check if the Android interface is available
                webView.evaluateJavascript("""
                    (function() {
                        console.log("Android interface available: " + (window.Android !== undefined));
                        if (window.Android) {
                            console.log("Methods available: " + 
                                "getFcmToken=" + (typeof window.Android.getFcmToken === 'function') + ", " +
                                "isBiometricAvailable=" + (typeof window.Android.isBiometricAvailable === 'function') + ", " +
                                "requestBiometricLogin=" + (typeof window.Android.requestBiometricLogin === 'function') + ", " +
                                "saveCredentials=" + (typeof window.Android.saveCredentials === 'function')
                            );
                        }
                    })();
                """.trimIndent(), null)
                
                if (shouldAutoLogin && credentials != null) {
                    // Small delay to ensure page is fully loaded
                    webView.postDelayed({
                        autoLogin(credentials!!.first, credentials!!.second)
                    }, 500)
                    shouldAutoLogin = false
                } else if (url?.contains("rpg.ftonon.uk") == true) {
                    injectCredentialSaver()
                    injectFcmToken() // Inject token when page loads
                }
            }
            
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                Log.e("MainActivity", "WebView error: ${error?.description}")
                // Show error to user
                runOnUiThread {
                    Toast.makeText(applicationContext, 
                        "Error loading page: ${error?.description}", Toast.LENGTH_LONG).show()
                    progressBar.visibility = View.GONE
                }
            }
            
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                Log.d("MainActivity", "Loading URL: ${request?.url}")
                return super.shouldOverrideUrlLoading(view, request)
            }
        }

        // Show progress bar before loading URL
        progressBar.visibility = View.VISIBLE
        
        // Clear cache and cookies to ensure a fresh load
        webView.clearCache(true)
        webView.clearHistory()
        
        webView.loadUrl("https://rpg.ftonon.uk/")
    }

    fun saveCredentialsToStorage(username: String, password: String) {
        try {
            val trimmedUsername = username.trim()
            
            val masterKey = MasterKey.Builder(applicationContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            val sharedPreferences = EncryptedSharedPreferences.create(
                applicationContext,
                "secret_shared_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )

            sharedPreferences.edit().apply {
                putString("username", trimmedUsername)
                putString("password", password)
                apply()
            }
            
        } catch (e: Exception) {
            Log.e("MainActivity", "Error saving credentials: ${e.message}", e)
            Toast.makeText(this, "Error saving credentials: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    fun hasStoredCredentials(): Boolean {
        return try {
            val (username, password) = getStoredCredentials()
            username.isNotEmpty() && password.isNotEmpty()
        } catch (e: Exception) {
            Log.e("MainActivity", "Error checking credentials: ${e.message}", e)
            false
        }
    }

    private fun getStoredCredentials(): Pair<String, String> {
        try {
            val masterKey = MasterKey.Builder(applicationContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            val sharedPreferences = EncryptedSharedPreferences.create(
                applicationContext,
                "secret_shared_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )

            val username = sharedPreferences.getString("username", "") ?: ""
            val password = sharedPreferences.getString("password", "") ?: ""
            return Pair(username, password)
        } catch (e: Exception) {
            Log.e("MainActivity", "Error getting stored credentials: ${e.message}", e)
            throw e
        }
    }

    fun setupBiometricAuth() {
        val executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    runOnUiThread {
                        credentials = getStoredCredentials()
                        shouldAutoLogin = true
                        webView.visibility = View.VISIBLE
                        setupWebView()
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    runOnUiThread {
                        Toast.makeText(applicationContext, 
                            "Authentication error: $errString", Toast.LENGTH_SHORT).show()
                        // Don't automatically show webView on error
                        if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON || 
                            errorCode == BiometricPrompt.ERROR_USER_CANCELED) {
                            webView.visibility = View.VISIBLE
                            setupWebView()
                        } else {
                            // For other errors, retry biometric auth
                            setupBiometricAuth()
                        }
                    }
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    runOnUiThread {
                        Toast.makeText(applicationContext, 
                            "Authentication failed", Toast.LENGTH_SHORT).show()
                    }
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Login to DaiRPG")
            .setSubtitle("Use your fingerprint to login")
            .setNegativeButtonText("Cancel")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    private fun injectCredentialSaver() {
        val javascript = """
            javascript:(function() {
                // Function to save credentials
                function saveLoginInfo() {
                    var usernameInput = document.querySelector('input[type="text"], input[type="email"]');
                    var passwordInput = document.querySelector('input[type="password"]');
                    
                    if (usernameInput && passwordInput) {
                        var username = usernameInput.value.trim();
                        var password = passwordInput.value;
                        
                        if (username && password) {
                            window.Android.saveCredentials(username, password);
                        }
                    }
                }
                
                // Listen for form submission
                function setupFormListener() {
                    var forms = document.querySelectorAll('form');
                    
                    forms.forEach(function(form) {
                        form.addEventListener('submit', saveLoginInfo);
                    });
                    
                    // Also try to find the submit button
                    var submitButton = document.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.addEventListener('click', saveLoginInfo);
                    }
                }
                
                // Try immediately and after a delay
                setupFormListener();
                setTimeout(setupFormListener, 1000);
                
                // Observe DOM changes
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.addedNodes.length) {
                            setupFormListener();
                        }
                    });
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            })()
        """.trimIndent()
        
        webView.evaluateJavascript(javascript, null)
    }

    private fun autoLogin(username: String, password: String) {
        val trimmedUsername = username.trim()
        val javascript = """
            javascript:(function() {
                function simulateTyping(input, value) {
                    // Focus the input
                    input.focus();
                    
                    // Find the label and fieldset
                    const formControl = input.closest('.MuiFormControl-root');
                    const label = formControl.querySelector('.MuiInputLabel-root');
                    const fieldset = input.closest('.MuiInputBase-root').querySelector('.MuiOutlinedInput-notchedOutline');
                    
                    // Update label state
                    if (label) {
                        label.setAttribute('data-shrink', 'true');
                    }
                    
                    // Clear existing value
                    input.value = '';
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Set the new value
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(input, value);
                    
                    // Create and dispatch events
                    const inputEvent = new InputEvent('input', {
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertText',
                        data: value
                    });
                    
                    const changeEvent = new Event('change', {
                        bubbles: true,
                        cancelable: true
                    });
                    
                    input.dispatchEvent(inputEvent);
                    input.dispatchEvent(changeEvent);
                    
                    // Blur the input
                    input.blur();
                }

                function attemptLogin() {
                    const usernameInput = document.querySelector('input[type="text"]');
                    const passwordInput = document.querySelector('input[type="password"]');
                    const loginForm = document.querySelector('form');
                    
                    if (usernameInput && passwordInput && loginForm) {
                        // Simulate typing username
                        simulateTyping(usernameInput, '$trimmedUsername');
                        
                        // Small delay before password
                        setTimeout(() => {
                            // Simulate typing password
                            simulateTyping(passwordInput, '$password');
                            
                            // Small delay before submitting
                            setTimeout(() => {
                                // Create and dispatch submit event
                                const submitEvent = new Event('submit', {
                                    bubbles: true,
                                    cancelable: true
                                });
                                
                                loginForm.dispatchEvent(submitEvent);
                                
                                // If the form wasn't handled by the event, click the button
                                if (!submitEvent.defaultPrevented) {
                                    const submitButton = loginForm.querySelector('button[type="submit"]');
                                    if (submitButton) {
                                        submitButton.click();
                                    }
                                }
                            }, 100);
                        }, 100);
                        
                        return true;
                    }
                    return false;
                }

                // Try immediately
                if (!attemptLogin()) {
                    // If failed, try again after a delay
                    setTimeout(attemptLogin, 1000);
                }
            })()
        """.trimIndent()
        
        webView.evaluateJavascript(javascript, null)
    }

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    private fun requestNotificationPermission() {
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != 
            PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                NOTIFICATION_PERMISSION_CODE
            )
        }
    }

    fun injectFcmToken() {
        fcmToken?.let { token ->
            // Inject the token into the WebView
            val javascript = """
                javascript:(function() {
                    // Store token in localStorage
                    localStorage.setItem('fcmToken', '$token');
                    
                    // Call function if it exists
                    if (typeof window.fcmTokenReceived === 'function') {
                        window.fcmTokenReceived('$token');
                    } else {
                        // Create a global function for later use
                        window.fcmTokenReceived = function(token) {
                            console.log('FCM Token received:', token);
                            // Your web app can use this token
                        };
                        // Call it immediately with current token
                        window.fcmTokenReceived('$token');
                    }
                    
                    // If user is logged in, send token to backend
                    if (localStorage.getItem('token')) {
                        const authToken = localStorage.getItem('token');
                        console.log('Sending FCM token to backend with auth token');
                        
                        fetch('https://api-rpg.ftonon.uk/auth/update-notification-token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': authToken
                            },
                            body: JSON.stringify({ notificationToken: token })
                        })
                        .then(response => {
                            if (response.ok) {
                                console.log('FCM token sent to backend successfully');
                            } else {
                                console.error('Failed to send FCM token to backend');
                            }
                        })
                        .catch(error => {
                            console.error('Error sending FCM token to backend:', error);
                        });
                    }
                })()
            """.trimIndent()
            
            webView.evaluateJavascript(javascript) { result ->
                Log.d("MainActivity", "FCM token injected")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        activeInstances.add(this)
    }
    
    override fun onPause() {
        super.onPause()
        activeInstances.remove(this)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
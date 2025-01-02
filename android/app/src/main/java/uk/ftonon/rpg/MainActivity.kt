package uk.ftonon.rpg

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.preference.PreferenceManager
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var shouldAutoLogin = false
    private var credentials: Pair<String, String>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        webView.addJavascriptInterface(WebAppInterface(), "Android")

        val isBiometricEnabled = PreferenceManager.getDefaultSharedPreferences(this)
            .getBoolean("use_biometric", false)
        
        if (isBiometricEnabled && hasStoredCredentials()) {
            webView.visibility = View.GONE
            setupBiometricAuth()
        } else {
            setupWebView()
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun saveCredentials(username: String, password: String) {
            runOnUiThread {
                saveCredentialsToStorage(username, password)
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
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                
                if (shouldAutoLogin && credentials != null) {
                    // Small delay to ensure page is fully loaded
                    webView.postDelayed({
                        autoLogin(credentials!!.first, credentials!!.second)
                    }, 1000)
                    shouldAutoLogin = false
                } else if (url?.contains("rpg.ftonon.uk") == true) {
                    injectCredentialSaver()
                }
            }
        }

        webView.loadUrl("https://rpg.ftonon.uk/")
    }

    private fun injectCredentialSaver() {
        val javascript = """
            javascript:(function() {
                console.log('Setting up form listener');
                
                // Function to save credentials
                function saveLoginInfo() {
                    var usernameInput = document.querySelector('input[name="username"]');
                    var passwordInput = document.querySelector('input[name="password"]');
                    
                    if (usernameInput && passwordInput) {
                        var username = usernameInput.value.trim(); // Trim whitespace
                        var password = passwordInput.value;
                        if (username && password) {
                            console.log('Saving credentials');
                            window.Android.saveCredentials(username, password);
                        }
                    }
                }
                
                // Listen for form submission
                document.querySelector('form').addEventListener('submit', function(e) {
                    console.log('Form submitted');
                    saveLoginInfo();
                });
            })()
        """.trimIndent()
        
        webView.evaluateJavascript(javascript) {  }
    }

    private fun saveCredentialsToStorage(username: String, password: String) {
        try {
            // Trim username before saving
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
            Toast.makeText(this, "Error saving credentials: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun hasStoredCredentials(): Boolean {
        return try {
            val (username, password) = getStoredCredentials()
            val hasCredentials = username.isNotEmpty() && password.isNotEmpty()
            hasCredentials
        } catch (e: Exception) {
            Toast.makeText(this, "Error checking credentials: ${e.message}", Toast.LENGTH_SHORT).show()
            false
        }
    }

    private fun getStoredCredentials(): Pair<String, String> {
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
    }

    private fun setupBiometricAuth() {
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
                        webView.visibility = View.VISIBLE
                        setupWebView()
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
                            }, 500);
                        }, 500);
                        
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

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_settings -> {
                startActivity(Intent(this, SettingsActivity::class.java))
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}
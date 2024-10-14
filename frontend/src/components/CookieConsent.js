// src/components/CookieConsent.js
import React, { useEffect, useState } from 'react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the cookie is set
    const cookieAccepted = document.cookie.includes('cookie-consent=accepted');
    if (!cookieAccepted) {
      setIsVisible(true); // Show the banner if consent is not given
    }
  }, []);

  const acceptCookies = () => {
    // Set a cookie to remember user consent
    document.cookie = "cookie-consent=accepted; max-age=" + 60 * 60 * 24 * 30; // 30 days
    setIsVisible(false); // Hide the banner
  };

  return (
    isVisible && (
      <div style={styles.banner}>
        <p>
          This application requires cookies to function properly. Please enable cookies in your browser settings.
        </p>
        <button onClick={acceptCookies} style={styles.button}>
          Accept
        </button>
      </div>
    )
  );
};

const styles = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8d7da',
    color: '#721c24',
    textAlign: 'center',
    padding: '10px',
    zIndex: 1000,
  },
  button: {
    marginLeft: '10px',
    padding: '5px 10px',
    backgroundColor: '#721c24',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default CookieConsent;

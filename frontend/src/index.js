import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './contexts/ThemeContext';
import { KidsModeProvider } from './contexts/KidsModeContext';
import { SocketProvider } from './contexts/SocketContext';
import apiServices from './services/api';
import './i18n';  

// Function to handle FCM token updates
const handleFcmTokenUpdate = (token) => {
  // Store token in localStorage
  localStorage.setItem('fcmToken', token);
  
  // If user is logged in, send token to backend
  const authToken = sessionStorage.getItem('token');
  if (authToken) {
    apiServices.auth.updateNotificationToken(token)
      .then(() => console.log('Notification token updated successfully'))
      .catch(err => console.error('Failed to update notification token:', err));
  }
};

// Set up global function to receive FCM token from Android WebView
window.fcmTokenReceived = handleFcmTokenUpdate;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <KidsModeProvider>
        <SocketProvider>
          <CssBaseline />
          <App />
        </SocketProvider>
      </KidsModeProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

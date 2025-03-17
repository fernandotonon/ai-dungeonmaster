const axios = require('axios');
const User = require('../models/User');
const { GoogleAuth } = require('google-auth-library');

console.log('Notification service loaded');

// FCM HTTP v1 API URL
const FCM_URL = 'https://fcm.googleapis.com/v1/projects/';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

// Create a Google Auth client using the service account credentials
let authClient;
try {
  // Check if service account is provided in environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    authClient = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });
  } else {
    // Otherwise, use GOOGLE_APPLICATION_CREDENTIALS environment variable
    authClient = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });
  }
  console.log('Google Auth client initialized successfully with project ID:', PROJECT_ID);
} catch (error) {
  console.error('Error initializing Google Auth client:', error);
}

/**
 * Send a notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<boolean>} - Whether the notification was sent successfully
 */
const sendNotificationToUser = async (userId, title, message, data = {}) => {
  try {
    // Find the user and check if they have a notification token
    const user = await User.findById(userId);
    if (!user || !user.notificationToken) {
      console.log(`User ${userId} does not have a notification token`);
      return false;
    }

    if (!authClient) {
      console.error('Google Auth client not initialized');
      return false;
    }

    // Get an access token - fixed to handle the correct response format
    const accessTokenResponse = await authClient.getAccessToken();
    const accessToken = accessTokenResponse.token || accessTokenResponse;
    
    if (!accessToken) {
      console.error('Failed to get access token:', accessTokenResponse);
      return false;
    }
    
    console.log('Successfully obtained access token');

    // Prepare the notification payload for FCM HTTP v1 API
    const payload = {
      message: {
        token: user.notificationToken,
        notification: {
          title,
          body: message
        },
        data: {
          ...data,
          title,
          message,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          notification: {
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      }
    };

    // Send the notification using FCM HTTP v1 API
    const response = await axios.post(
      `${FCM_URL}${PROJECT_ID}/messages:send`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log(`Notification sent to user ${userId}, response:`, response.data);
    return true;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
};

/**
 * Send a notification to all users related to a game
 * @param {Object} game - The game object
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Array>} - Array of results for each user
 */
const notifyGameParticipants = async (game, title, message, data = {}) => {
  try {
    // Get all user IDs related to the game
    const userIds = [
      game.user.toString(), // Game owner
      ...game.players.map(player => player.userId.toString()) // All players
    ];

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];

    // Send notifications to all users
    const results = await Promise.all(
      uniqueUserIds.map(userId => 
        sendNotificationToUser(userId, title, message, {
          ...data,
          gameId: game._id.toString()
        })
      )
    );

    return results;
  } catch (error) {
    console.error('Error notifying game participants:', error);
    return [];
  }
};

module.exports = {
  sendNotificationToUser,
  notifyGameParticipants
}; 
// IMPROVED: usePushNotifications.ts hook
// Enhancements:
// 1. Token refresh listener
// 2. Retry mechanism for token save
// 3. Terminated state handling
// 4. Better error handling and logging

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { useRouter } from 'expo-router';
import {
  initializePushNotifications,
  setupForegroundNotificationListener,
  setupNotificationResponseListener,
  setupFCMMessageListener,
  cleanupListeners,
  getDeviceId,
} from '../services/notificationService';
import api from '../services/api';

// ✅ NEW: Save token with retry mechanism
const savePushTokenWithRetry = async (
  pushToken: string,
  userId: string,
  platform: string,
  deviceId: string,
  maxRetries = 3
) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await api.post('/notifications/save-token', {
        pushToken,
        userId,
        platform,
        deviceId,
      });
      
      console.log(`✅ Push token saved successfully (attempt ${attempt})`);
      return { success: true, data: response.data };
    } catch (error: any) {
      lastError = error;
      console.warn(
        `⚠️ Attempt ${attempt}/${maxRetries} to save token failed:`,
        error.message
      );
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ Failed to save push token after retries', lastError);
  return { success: false, error: lastError };
};

// ✅ NEW: Handle notification tap with full implementation
const handleNotificationTap = async (
  notification: Notifications.Notification,
  router: any,
  userRole: 'client' | 'worker' = 'client'
) => {
  try {
    const data = notification.request.content.data;
    const notificationType = data?.type;
    const bookingId = data?.bookingId;
    const jobId = data?.jobId;
    const categoryId = data?.categoryId;
    const notificationId = data?.notificationId;

    console.log('🔔 Notification tapped:', notificationType, {
      bookingId,
      jobId,
      categoryId,
    });

    // Route based on user role and notification type
    if (userRole === 'client') {
      switch (notificationType) {
        case 'worker_accepted':
          if (bookingId) {
            router.push({
              pathname: '/job-details',
              params: { bookingId },
            });
          }
          break;

        case 'worker_started':
          if (bookingId) {
            router.push({
              pathname: '/job-details',
              params: { bookingId },
            });
          }
          break;

        case 'worker_completed':
          if (bookingId) {
            router.push({
              pathname: '/job-details',
              params: { bookingId, showReview: true },
            });
          }
          break;

        case 'payment_received':
          router.push({
            pathname: '/(tabs)/wallet',
          });
          break;

        case 'booking_cancelled':
          router.push({
            pathname: '/(tabs)/bookings',
            params: { showCancelled: true },
          });
          break;

        case 'new_review':
          if (bookingId) {
            router.push({
              pathname: '/job-details',
              params: { bookingId, scrollToReviews: true },
            });
          }
          break;

        case 'general':
        default:
          router.push('/(tabs)/index');
          break;
      }
    } else if (userRole === 'worker') {
      // Worker-specific navigation
      switch (notificationType) {
        case 'new_job_available':
          if (categoryId) {
            router.push({
              pathname: '/category-details',
              params: { categoryId },
            });
          }
          break;

        case 'booking_accepted':
          if (bookingId) {
            router.push({
              pathname: '/worker-details',
              params: { bookingId },
            });
          }
          break;

        case 'booking_cancelled':
          router.push({
            pathname: '/(tabs)/bookings',
          });
          break;

        case 'payment_received':
          router.push({
            pathname: '/(tabs)/wallet',
          });
          break;

        case 'worker_verified':
          router.push({
            pathname: '/(tabs)/profile',
          });
          break;

        case 'general':
        default:
          router.push('/(tabs)/index');
          break;
      }
    }

    // ✅ NEW: Mark notification as read on backend
    if (notificationId) {
      try {
        await api.post('/notifications/mark-read', {
          notificationId,
        });
        console.log('✅ Notification marked as read');
      } catch (error) {
        console.warn('⚠️ Could not mark notification as read:', error);
        // Non-fatal error - don't interrupt user flow
      }
    }
  } catch (error) {
    console.error('❌ Error handling notification tap:', error);
    // Fallback: go to home screen
    router.push('/(tabs)/index');
  }
};

export const usePushNotifications = () => {
  const { user, token, role } = useAuth();
  const router = useRouter();
  const subscriptionsRef = useRef<any[]>([]);
  const lastSavedTokenRef = useRef<string | null>(null);
  const [notificationSetupComplete, setNotificationSetupComplete] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      // Cleanup when user logs out
      if (notificationSetupComplete) {
        console.log('👤 User logged out, cleaning up listeners...');
        cleanupListeners(subscriptionsRef.current);
        subscriptionsRef.current = [];
        setNotificationSetupComplete(false);
      }
      return;
    }

    const setupNotifications = async () => {
      try {
        console.log('🔔 Setting up push notifications for user:', user._id);

        // Initialize and get push token
        const pushToken = await initializePushNotifications();
        const deviceId = await getDeviceId();

        if (pushToken) {
          console.log('📱 Push token obtained:', pushToken.substring(0, 20) + '...');
          
          // Save initial token with retry
          const saveResult = await savePushTokenWithRetry(
            pushToken,
            user._id,
            Platform.OS,
            deviceId
          );

          if (saveResult.success) {
            lastSavedTokenRef.current = pushToken;
          } else {
            console.warn(
              '⚠️ Failed to save initial token, but continuing with setup'
            );
          }
        }

        // ✅ NEW: Setup foreground notification listener
        const foregroundSub = setupForegroundNotificationListener((notification) => {
          console.log('📲 App received foreground notification:', notification);
        });
        subscriptionsRef.current.push(foregroundSub);

        // ✅ NEW: Setup response listener for user taps
        const responseSub = setupNotificationResponseListener((response) => {
          console.log('👆 Notification tapped:', response);
          const userRole = role === 'worker' ? 'worker' : 'client';
          handleNotificationTap(response.notification, router, userRole);
        });
        subscriptionsRef.current.push(responseSub);

        // ✅ NEW: Check for initial notification from terminated state
        const initialNotification = await Notifications.getLastNotificationResponseAsync();
        if (initialNotification) {
          console.log('📲 App opened from terminated state via notification');
          const userRole = role === 'worker' ? 'worker' : 'client';
          handleNotificationTap(initialNotification.notification, router, userRole);
        }

        // ✅ NEW: Setup FCM message listener
        const fcmSub = setupFCMMessageListener((message) => {
          console.log('💬 Received FCM message:', message);
        });
        subscriptionsRef.current.push(fcmSub);

        // ✅ CRITICAL NEW: Listen for token refreshes
        const tokenRefreshSub = messaging().onTokenRefresh(async (newToken) => {
          console.log(
            '🔄 FCM token refreshed:',
            newToken.substring(0, 20) + '...'
          );
          
          // Only save if token actually changed
          if (newToken !== lastSavedTokenRef.current) {
            const saveResult = await savePushTokenWithRetry(
              newToken,
              user._id,
              Platform.OS,
              deviceId
            );

            if (saveResult.success) {
              lastSavedTokenRef.current = newToken;
              console.log('✅ Refreshed token saved to backend');
            } else {
              console.warn('⚠️ Failed to save refreshed token');
            }
          }
        });
        subscriptionsRef.current.push(tokenRefreshSub);

        setNotificationSetupComplete(true);
        console.log('✅ All notification listeners set up successfully');
      } catch (error) {
        console.error('❌ Error setting up notifications:', error);
        setNotificationSetupComplete(false);
      }
    };

    setupNotifications();

    // Cleanup on unmount or when user changes
    return () => {
      console.log('🧹 Cleaning up notification listeners');
      cleanupListeners(subscriptionsRef.current);
      subscriptionsRef.current = [];
    };
  }, [user, token, router]);

  return {
    notificationSetupComplete,
    lastSavedToken: lastSavedTokenRef.current,
  };
};

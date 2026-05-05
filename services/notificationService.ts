import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Gets a unique identifier for this physical device.
 * This ID is used to prevent duplicate tokens for the same user on one device.
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    // Try to use a hardware-based ID first
    let deviceId = Device.osBuildId || Device.modelName || 'unknown_device';

    // To be extra safe and persistent, also use a stored ID
    const storedId = await AsyncStorage.getItem('device_id_v2');
    if (storedId) {
      return storedId;
    }

    // If no stored ID, generate one (combining hardware info with random string)
    const newId = `${deviceId}_${Math.random().toString(36).substring(2, 10)}`;
    await AsyncStorage.setItem('device_id_v2', newId);
    return newId;
  } catch (error) {
    return 'fallback_id_' + Date.now();
  }
};

export const initializePushNotifications = async () => {
  try {
    // Request permissions from user
    const permissionStatus = await requestNotificationPermissions();
    if (permissionStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return null;
    }

    // Get the device push token
    const token = await getPushToken();
    return token;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return null;
  }
};

export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.warn('Must use physical device for push notifications');
    // return 'denied';
  }

  // Get current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get notification permissions');
    return 'denied';
  }

  // For Android, set notification channel (Required for Android 8.0+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00F5FF',
    });
  }

  // For iOS, set notification categories
  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync('default', [
      {
        identifier: 'accept',
        buttonTitle: 'Accept',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'decline',
        buttonTitle: 'Decline',
        options: { opensAppToForeground: false },
      },
    ]);
  }

  return 'granted';
};

export const getPushToken = async (): Promise<string | null> => {
  try {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      // Get FCM token for Android
      token = await messaging().getToken();
    } else if (Platform.OS === 'ios') {
      // Get APNs token for iOS
      const apnsToken = await messaging().getAPNSToken();
      if (!apnsToken) {
        console.warn('Failed to get APNS token');
        return null;
      }
      token = apnsToken;
    }

    if (!token) {
      console.warn('Failed to get push token');
      return null;
    }

    console.log('Push Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

// Listen for foreground notifications
export const setupForegroundNotificationListener = (
  onNotificationReceived?: (notification: Notifications.Notification) => void
) => {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  return subscription;
};

// Listen for notification responses (when user taps notification)
export const setupNotificationResponseListener = (
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  return subscription;
};

// Listen for FCM messages (background/foreground)
export const setupFCMMessageListener = (
  onMessageReceived?: (message: any) => void
) => {
  // Handle FCM messages while the app is in the foreground.
  //
  // When the app is in the BACKGROUND or KILLED, Android handles the `notification`
  // field automatically and shows a system tray alert — no code needed.
  //
  // When the app is in the FOREGROUND, Firebase calls onMessage but does NOT
  // show a visible notification automatically. We must call scheduleNotificationAsync
  // ourselves so the user actually sees the alert.
  //
  // setNotificationHandler (top of this file) then applies the display rules
  // (shouldShowAlert: true) to the Expo notification we just scheduled.
  // This does NOT cause a duplicate — background and foreground delivery paths
  // are mutually exclusive on Android.
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('FCM Message (foreground):', remoteMessage);

    if (onMessageReceived) {
      onMessageReceived(remoteMessage);
    }

    if (remoteMessage.notification) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title || 'New Notification',
          body: remoteMessage.notification.body || '',
          data: remoteMessage.data,
        },
        trigger: {
          channelId: 'default',
        } as any,
      });
    }
  });

  return unsubscribe;
};


export const cleanupListeners = (subscriptions: any[]) => {
  subscriptions.forEach((subscription) => {
    if (!subscription) return;
    // Expo-style listeners expose a .remove() method
    if (typeof subscription.remove === 'function') {
      subscription.remove();
    // Firebase onMessage returns a plain unsubscribe function
    } else if (typeof subscription === 'function') {
      subscription();
    }
  });
};
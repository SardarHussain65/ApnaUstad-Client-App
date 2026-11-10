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

  // For Android, set notification channels (Required for Android 8.0+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00F5FF',
    });

    await Notifications.setNotificationChannelAsync('voice_calls', {
      name: 'Voice Calls',
      description: 'Incoming in-app voice calls from clients or workers',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
      enableVibrate: true,
      bypassDnd: true,
      lightColor: '#10B981',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.VOICE_COMMUNICATION_SIGNALLING,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }

  // Register notification categories for interactive actions (Accept / Decline) on both Android & iOS
  await Notifications.setNotificationCategoryAsync('incoming_call', [
    {
      identifier: 'accept_call',
      buttonTitle: 'Accept 📞',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'decline_call',
      buttonTitle: 'Decline ✖️',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);

  // For iOS, set fallback notification categories
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

export const FCM_TOKEN_STORAGE_KEY = 'fcm_push_token_cached';

export const getPushToken = async (): Promise<string | null> => {
  try {
    let token: string | null = null;

    if (Platform.OS === 'ios') {
      // 1. On iOS, wait for APNs device registration before requesting the FCM token
      let apnsToken = await messaging().getAPNSToken();
      if (!apnsToken) {
        // Retry shortly in case APNs registration is still settling
        for (let retry = 0; retry < 3; retry++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          apnsToken = await messaging().getAPNSToken();
          if (apnsToken) break;
        }
      }

      if (!apnsToken) {
        console.warn('⚠️ Could not obtain APNs token on iOS');
        return null;
      }
    }

    // 2. Both iOS and Android require the FCM registration token to send via Firebase Admin SDK
    // On Android, Google Play Services may transiently throw SERVICE_NOT_AVAILABLE
    // during cold boot or when device network socket is still negotiating with Google servers.
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        token = await messaging().getToken();
        if (token) break;
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isTransient =
          errMsg.includes('SERVICE_NOT_AVAILABLE') ||
          errMsg.includes('NETWORK_ERROR') ||
          errMsg.includes('TIMEOUT') ||
          errMsg.includes('ExecutionException') ||
          errMsg.includes('java.io.IOException');

        if (isTransient && attempt < MAX_RETRIES) {
          const delay = attempt * 1500; // 1.5s, 3.0s backoff
          console.warn(`⏳ FCM service initializing (${errMsg}). Retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }

    if (!token) {
      console.warn('Failed to get FCM push token');
      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY).catch(() => null);
      return cachedToken;
    }

    // Cache the verified token for offline / cold-start fallback
    await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token).catch(() => { });

    console.log('✅ FCM Push Token obtained successfully:', token);
    return token;
  } catch (error: any) {
    // If all retries failed, check if we have a cached token from a previous run
    const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY).catch(() => null);
    if (cachedToken) {
      console.log('ℹ️ Using cached FCM push token fallback:', cachedToken.substring(0, 15) + '...');
      return cachedToken;
    }
    console.warn('⚠️ Could not obtain FCM push token:', error?.message || error);
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

    const isCall = remoteMessage.data?.type === 'incoming_call';

    if (remoteMessage.notification || isCall) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || (isCall ? 'Incoming Voice Call' : 'New Notification'),
          body: remoteMessage.notification?.body || (isCall ? `${remoteMessage.data?.callerName || 'Apna Ustad'} is calling...` : ''),
          data: remoteMessage.data,
          categoryIdentifier: isCall ? 'incoming_call' : undefined,
          priority: isCall ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
          vibrate: isCall ? [0, 1000, 500, 1000, 500, 1000] : [0, 250, 250, 250],
        },
        trigger: {
          channelId: isCall ? 'voice_calls' : 'default',
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
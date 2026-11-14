import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import 'expo-router/entry';

/**
 * Handle background FCM messages (when app is in background or killed)
 */
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM Background] Message received:', remoteMessage?.data);
  const data = remoteMessage?.data;
  const type = data?.type;

  if (type === 'call_cancelled' || type === 'call_ended') {
    const bookingId = data?.bookingId;
    try {
      if (bookingId) {
        await Notifications.dismissNotificationAsync(`call_${bookingId}`).catch(() => {});
      }
      const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
      for (const notif of presented) {
        const notifData = notif.request?.content?.data;
        if (notifData?.type === 'incoming_call') {
          if (!bookingId || notifData?.bookingId === bookingId) {
            await Notifications.dismissNotificationAsync(notif.request.identifier).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('[FCM Background] Error dismissing cancelled call notification:', e);
    }
  }
});

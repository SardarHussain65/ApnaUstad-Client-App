import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from './socketService';
import api from './api';

export const BACKGROUND_LOCATION_TASK = 'apna-ustad-enroute-location';
const ACTIVE_BOOKING_KEY = 'active_enroute_booking_id';
let lastHttpLocationSyncTime = 0;

// Define background task at module root level
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latest = locations?.[locations.length - 1];

    if (latest?.coords) {
      const { latitude, longitude } = latest.coords;

      try {
        const activeBookingId = await AsyncStorage.getItem(ACTIVE_BOOKING_KEY);
        if (!activeBookingId) return;

        // 1. Emit via active socket if connected
        if (socketService.isConnected()) {
          socketService.emit('worker:location', {
            bookingId: activeBookingId,
            latitude,
            longitude,
          });
        } else {
          // 2. Fallback to HTTP API ONLY when socket is disconnected in background (throttled)
          const now = Date.now();
          if (now - lastHttpLocationSyncTime > 30000) {
            lastHttpLocationSyncTime = now;
            const savedUser = await AsyncStorage.getItem('user_data');
            if (savedUser) {
              const userObj = JSON.parse(savedUser);
              if (userObj?._id) {
                await api.put(`/workers/${userObj._id}/location`, {
                  latitude,
                  longitude,
                }).catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to transmit background location:', err);
      }
    }
  }
});

export const startBackgroundLocationTracking = async (bookingId: string) => {
  try {
    await AsyncStorage.setItem(ACTIVE_BOOKING_KEY, bookingId);

    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.warn('Foreground location permission not granted');
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('Background location permission not granted, proceeding with foreground');
      return false;
    }

    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!isRunning) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 8000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Apna Ustad Mission Navigation',
          notificationBody: 'Transmitting live arrival location to client',
          notificationColor: '#00F5FF',
        },
      });
      console.log('✅ Background location tracking started for booking:', bookingId);
    }
    return true;
  } catch (err) {
    console.warn('Error starting background location updates:', err);
    return false;
  }
};

export const stopBackgroundLocationTracking = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVE_BOOKING_KEY);
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('🛑 Background location tracking stopped');
    }
  } catch (err) {
    console.warn('Error stopping background location updates:', err);
  }
};


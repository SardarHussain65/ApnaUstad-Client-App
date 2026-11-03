import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

let isInitialized = false;

export const initCrashReporting = () => {
  if (isInitialized) return;

  const dsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    Constants.expoConfig?.extra?.sentryDsn;

  if (!dsn) {
    if (!__DEV__) {
      console.warn('ℹ️ Sentry DSN not configured. Crash reporting is dormant.');
    }
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
  });

  isInitialized = true;
  console.log('🛡️ Sentry crash telemetry initialized');
};

export const captureException = (error: unknown, context?: Record<string, any>) => {
  if (!error) return;
  console.error('Captured exception:', error, context);

  if (isInitialized) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
};

export const setUserContext = (user: { id?: string; email?: string; role?: string } | null) => {
  if (!isInitialized) return;

  if (user && user.id) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: `${user.role || 'user'}_${user.id.slice(-4)}`,
    });
  } else {
    Sentry.setUser(null);
  }
};

export const clearUserContext = () => {
  if (!isInitialized) return;
  Sentry.setUser(null);
};


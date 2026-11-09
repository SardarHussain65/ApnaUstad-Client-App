import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import '../i18n';
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { IncomingJobProvider } from "../context/IncomingJobContext";
import { CallProvider } from "../context/CallContext";
import { BeautifulToastConfig } from "../components/ui/BeautifulToast";
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { ThemeProvider, useTheme } from "../constants/Theme";
import { LanguageProvider } from "../context/LanguageContext";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { initCrashReporting } from "../services/crashReportingService";
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => { });

initCrashReporting();

export const unstable_settings = {
  initialRouteName: 'splash',
};


// Bind React Native AppState to TanStack Query focus manager for auto-revalidation
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

function ThemeSystemChrome() {
  const theme = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background.app).catch((error) => {
      console.warn('Failed to update system background color:', error);
    });
  }, [theme.colors.background.app]);

  return (
    <StatusBar
      style={theme.isDark ? 'light' : 'dark'}
      backgroundColor={theme.colors.background.app}
    />
  );
}

function AccountRestrictionGate() {
  const router = useRouter();
  const segments = useSegments();
  const { role, token, user, accountStatus, isLoading } = useAuth();
  const isRedirectingRef = useRef(false);

  const currentPathKey = useMemo(() => segments.join('/'), [segments]);

  useEffect(() => {
    if (isLoading) return;

    const root = (segments[0] as string | undefined) || '';
    const nested = (segments[1] as string | undefined) || '';
    const isPublicScreen =
      !root ||
      root === '(auth)' ||
      root === 'splash' ||
      root === 'onboarding' ||
      root === 'role-selection' ||
      root === 'theme-language' ||
      root === '+not-found';

    if (isPublicScreen) {
      isRedirectingRef.current = false;
      return;
    }

    // If on a protected route but token or user is missing -> automatically redirect once to role-selection
    if (!token || !user || !role) {
      if (!isRedirectingRef.current) {
        isRedirectingRef.current = true;
        console.log('[AccountRestrictionGate] Missing token or user on protected screen, redirecting to /role-selection');
        router.replace('/role-selection' as any);
      }
      return;
    }

    isRedirectingRef.current = false;

    const isLockedScreen = root === 'account-deactivated';
    const isHelpCenter = root === 'profile' && nested === 'help-center';

    if (accountStatus?.isActive === false && !isLockedScreen && !isHelpCenter) {
      router.replace('/account-deactivated' as any);
      return;
    }

    if (accountStatus?.isActive !== false && isLockedScreen) {
      router.replace('/(tabs)' as any);
    }
  }, [accountStatus?.isActive, currentPathKey, role, router, segments, token, user, isLoading]);

  return null;
}

function RootLayoutNav() {
  usePushNotifications();
  useRealtimeSync();

  return (
    <ErrorBoundary>
      <CallProvider>
        <IncomingJobProvider>
          <AccountRestrictionGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="splash" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="role-selection" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
          <BeautifulToastConfig />
        </IncomingJobProvider>
      </CallProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);

    // Safety fallback: ensure native splash screen is dismissed even in edge cases
    const splashFallback = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
    }, 3000);

    // Silent background check for Over-The-Air (OTA) updates in release builds
    if (!__DEV__) {
      Updates.checkForUpdateAsync()
        .then(async (update) => {
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            console.log('📲 New OTA update downloaded and queued for next launch');
          }
        })
        .catch((err) => {
          console.log('OTA check bypassed:', err?.message || err);
        });
    }

    return () => {
      subscription.remove();
      clearTimeout(splashFallback);
    };
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <ThemeSystemChrome />
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <RootLayoutNav />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

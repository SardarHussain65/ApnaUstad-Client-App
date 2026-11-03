import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import '../i18n';
import { QueryClient, QueryClientProvider, DefaultOptions, focusManager } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { IncomingJobProvider } from "../context/IncomingJobContext";
import { BeautifulToastConfig } from "../components/ui/BeautifulToast";
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { ThemeProvider, useTheme } from "../constants/Theme";
import { LanguageProvider } from "../context/LanguageContext";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { initCrashReporting } from "../services/crashReportingService";
import * as Updates from 'expo-updates';

initCrashReporting();


const shouldRetryRequest = (failureCount: number, error: unknown) => {
  const response = (error as any)?.response;
  if (response?.status === 423 && response?.data?.code === 'ACCOUNT_DEACTIVATED') {
    return false;
  }
  return failureCount < 1;
};

// Bind React Native AppState to TanStack Query focus manager for auto-revalidation
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

// React Query default configuration - 20s staleTime allows instantaneous navigation while auto-refreshing background data
const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 1000 * 20, // 20 seconds
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: shouldRetryRequest,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  mutations: {
    retry: shouldRetryRequest,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
};

const queryClient = new QueryClient({ defaultOptions: queryConfig });

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
      root === 'theme-language';

    // If on a protected route but token or user is missing -> automatically redirect to role-selection
    if (!isPublicScreen && (!token || !user || !role)) {
      console.log('[AccountRestrictionGate] Missing token or user on protected screen, redirecting to /role-selection');
      router.replace('/role-selection' as any);
      return;
    }

    if (!role || !token) return;

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
      <IncomingJobProvider>
        <AccountRestrictionGate />
        <Stack screenOptions={{ headerShown: false }} />
        <BeautifulToastConfig />
      </IncomingJobProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);

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

    return () => subscription.remove();
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

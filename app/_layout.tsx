import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import '../i18n';
import { QueryClient, QueryClientProvider, DefaultOptions } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { IncomingJobProvider } from "../context/IncomingJobContext";
import { BeautifulToastConfig } from "../components/ui/BeautifulToast";
import { usePushNotifications } from '../hooks/usePushNotifications';
import { ThemeProvider, useTheme } from "../constants/Theme";


const shouldRetryRequest = (failureCount: number, error: unknown) => {
  const response = (error as any)?.response;
  if (response?.status === 423 && response?.data?.code === 'ACCOUNT_DEACTIVATED') {
    return false;
  }
  return failureCount < 1;
};

// React Query default configuration
const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 minutes default
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
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
  const { role, token, accountStatus } = useAuth();

  const currentPathKey = useMemo(() => segments.join('/'), [segments]);

  useEffect(() => {
    if (!role || !token) return;
    const [root, nested] = segments;
    const isLockedScreen = root === 'account-deactivated';
    const isHelpCenter = root === 'profile' && nested === 'help-center';

    if (accountStatus?.isActive === false && !isLockedScreen && !isHelpCenter) {
      router.replace('/account-deactivated' as any);
      return;
    }

    if (accountStatus?.isActive !== false && isLockedScreen) {
      router.replace('/(tabs)' as any);
    }
  }, [accountStatus?.isActive, currentPathKey, role, router, segments, token]);

  return null;
}

function RootLayoutNav() {

  usePushNotifications();


  return (
    <IncomingJobProvider>
      <AccountRestrictionGate />
      <Stack screenOptions={{ headerShown: false }} />
      <BeautifulToastConfig />
    </IncomingJobProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemeSystemChrome />
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

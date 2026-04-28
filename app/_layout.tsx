import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider, DefaultOptions } from "@tanstack/react-query";
import { AuthProvider } from "../context/AuthContext";
import { IncomingJobProvider } from "../context/IncomingJobContext";
import { BeautifulToastConfig } from "../components/ui/BeautifulToast";

// React Query default configuration
const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 minutes default
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  mutations: {
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
};

const queryClient = new QueryClient({ defaultOptions: queryConfig });

function RootLayoutNav() {
  return (
    <IncomingJobProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <BeautifulToastConfig />
    </IncomingJobProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </AuthProvider>
  );
}

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

export const shouldRetryRequest = (failureCount: number, error: unknown) => {
  const response = (error as any)?.response;
  if (response?.status === 423 && response?.data?.code === 'ACCOUNT_DEACTIVATED') {
    return false;
  }
  return failureCount < 1;
};

export const queryConfig: DefaultOptions = {
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

export const queryClient = new QueryClient({ defaultOptions: queryConfig });

/**
 * Completely purges TanStack Query cache.
 * Cancels all active in-flight requests and clears all cached data across the app.
 * Must be invoked on logout, account switch, or auth token expiration to prevent
 * previous account data leakage between users on the same device.
 */
export const clearAppQueryCache = async () => {
  try {
    console.log('🧹 [queryClient] Purging React Query cache and cancelling in-flight queries...');
    await queryClient.cancelQueries();
    queryClient.clear();
  } catch (error) {
    console.warn('[queryClient] Error clearing React Query cache:', error);
  }
};

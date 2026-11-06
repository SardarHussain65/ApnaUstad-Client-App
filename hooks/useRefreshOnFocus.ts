import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * useRefreshOnFocus
 * Automatically calls `refetch()` whenever the screen regains navigation focus in React Navigation,
 * skipping the initial mount (which React Query already handles) and throttling subsequent focus triggers.
 *
 * CRITICAL: The useCallback passed to useFocusEffect MUST have an empty dependency array [].
 * Passing dynamic dependencies causes useFocusEffect to cancel and restart on EVERY re-render,
 * creating an infinite refetch loop that hammers the backend with thousands of requests.
 */
export function useRefreshOnFocus(refetch: () => Promise<any> | void) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const firstTimeRef = useRef(true);
  const lastRefreshedAtRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      // Skip the very first mount because React Query handles initial fetch
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }

      // Throttle focus refreshes to at most once every 1.5 seconds
      const now = Date.now();
      if (now - lastRefreshedAtRef.current < 1500) {
        return;
      }
      lastRefreshedAtRef.current = now;

      try {
        void refetchRef.current();
      } catch (err) {
        console.warn('[useRefreshOnFocus] Error executing refetch:', err);
      }
    }, []) // MUST remain empty so re-renders NEVER re-trigger the focus effect
  );
}



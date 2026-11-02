import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * useRefreshOnFocus
 * Automatically calls `refetch()` whenever the screen regains focus in React Navigation,
 * skipping the very first mount (which React Query already handles).
 */
export function useRefreshOnFocus(refetch: () => Promise<any> | void) {
  const firstTimeRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      void refetch();
    }, [refetch])
  );
}


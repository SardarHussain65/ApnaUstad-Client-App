import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../constants/Theme';

export default function JobTrackingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id, bookingId } = useLocalSearchParams<{ id?: string; bookingId?: string }>();

  useEffect(() => {
    const targetId = id || bookingId;
    if (targetId) {
      router.replace({
        pathname: '/transaction-details',
        params: { id: targetId },
      });
    } else {
      router.replace('/(tabs)');
    }
  }, [id, bookingId, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.screen, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.brand.primary} />
    </View>
  );
}

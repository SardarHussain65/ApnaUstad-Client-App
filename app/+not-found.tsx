import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/Theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { role, token, user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Gracefully recover to the home screen or splash screen instead of crashing
    if (role && token && user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/splash');
    }
  }, [role, token, user, isLoading, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.screen }]}>
      <ActivityIndicator size="large" color={theme.colors.brand.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


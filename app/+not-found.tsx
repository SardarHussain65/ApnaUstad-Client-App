import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function NotFoundScreen() {
  const router = useRouter();
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
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0D9488" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


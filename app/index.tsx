import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { role, token, user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('../assets/images/logo_premium.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.brandRow}>
          <Text style={styles.brandWhite}>Apna</Text>
          <Text style={styles.brandGold}>Ustad</Text>
        </View>
        <ActivityIndicator size="small" color="#38BDF8" style={styles.spinner} />
      </View>
    );
  }

  // If token, user, and role all exist, they are properly logged in -> go to tabs
  if (role && token && user) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  // Not logged in or missing token/user -> go to splash/onboarding
  return <Redirect href="/splash" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  brandWhite: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandGold: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 20,
  },
});

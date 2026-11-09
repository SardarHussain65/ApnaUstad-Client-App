import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { role, token, user, isLoading } = useAuth();

  useEffect(() => {
    // If auth state has resolved and the user is logged in, dismiss native splash immediately
    if (!isLoading && role && token && user) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, role, token, user]);

  // While checking auth in local storage (~30-50ms), render null so native splash stays held
  // with ZERO flicker or intermediate spinner
  if (isLoading) {
    return null;
  }

  // 1. Logged-in user: Native splash was enough, go straight to main app dashboard!
  if (role && token && user) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  // 2. Not logged in: Show the animated splash & welcome sequence
  return <Redirect href="/splash" />;
}

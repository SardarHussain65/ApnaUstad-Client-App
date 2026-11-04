import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { CustomTabBar } from '../../components/navigation/TabBar';

export default function TabLayout() {
  const { role, token, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Never trigger redirection or logout while auth state is still restoring from AsyncStorage
    if (isLoading) return;

    if (!role || !token || !user) {
      console.warn('[TabLayout] Missing credentials on protected tab layout, redirecting to /role-selection');
      router.replace('/role-selection' as any);
      return;
    }

    // Global real-time events (job:new, bid:won, booking:accepted)
    // are safely handled by IncomingJobProvider and their respective screens.
  }, [role, token, user, isLoading, router]);

  return (
    <Tabs
      tabBar={(props: any) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Find Jobs',
          href: role === 'worker' ? '/(tabs)/jobs' : null,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

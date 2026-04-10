import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { CustomTabBar } from '../../components/navigation/TabBar';

export default function TabLayout() {
  const { role } = useAuth();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
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
        name="bookings"
        options={{
          title: role === 'worker' ? 'Jobs' : 'Bookings',
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

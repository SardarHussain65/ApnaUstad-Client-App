import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { CustomTabBar } from '../../components/navigation/TabBar';
import { socketService } from '../../services/socketService';

export default function TabLayout() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!role) return;

    // job:new is handled globally by IncomingJobProvider — no duplicate listener here.

    const unsubBidWon = socketService.on('bid:won', (data) => {
      if (role === 'worker') {
        Toast.show({
          type: 'success',
          text1: 'Booking Confirmed! ✅',
          text2: `The client hired you for ${data.jobPost?.category}!`,
        });
        router.push({
          pathname: '/transaction-details',
          params: { id: data.booking?._id }
        });
      }
    });

    // Global Client Handlers
    const unsubJobAssigned = socketService.on('job:assigned', (data) => {
      if (role === 'client') {
        Toast.show({
          type: 'success',
          text1: 'Ustad Found! ✅',
          text2: `An Ustad has accepted your ${data.jobPost?.category} request.`,
        });
        router.push({
          pathname: '/transaction-details',
          params: { id: data.booking?._id }
        });
      }
    });

    return () => {
      unsubBidWon();
      unsubJobAssigned();
    };
  }, [role]);

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

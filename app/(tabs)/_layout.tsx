import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Colors } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { CustomTabBar } from '../../components/navigation/TabBar';
import { socketService } from '../../services/socketService';

export default function TabLayout() {
  const { role, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!role) return;

    // job:new is handled globally by IncomingJobProvider — no duplicate listener here.

    const unsubBidWon = socketService.on('bid:won', (data) => {
      if (role === 'worker') {
        Alert.alert('🎉 MISSION SECURED', `Your bid for ${data.jobPost?.category} was accepted!`);
        router.push({
          pathname: '/transaction-details',
          params: { id: data.booking?._id }
        });
      }
    });

    // Global Client Handlers
    const unsubJobAssigned = socketService.on('job:assigned', (data) => {
      if (role === 'client') {
        Alert.alert('🚀 USTAD SECURED', `${data.jobPost?.category} mission has been accepted by an elite specialist.`);
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
          title: 'Missions',
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

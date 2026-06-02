import { Stack } from 'expo-router';
import { Colors } from '../../constants/Theme';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: Colors.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        headerTransparent: true,
        headerShown: false,
      }}
    >
      <Stack.Screen name="personal-info" options={{ title: 'Personal Info' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
      <Stack.Screen name="security" options={{ title: 'Security' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="help-center" options={{ title: 'Help Center' }} />
      <Stack.Screen name="identity-verification" options={{ title: 'Identity Verification' }} />
    </Stack>
  );
}

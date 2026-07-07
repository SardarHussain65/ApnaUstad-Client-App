import { Stack } from 'expo-router';
import { useTheme } from '../../constants/Theme';

export default function ProfileLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: theme.colors.brand.primary,
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
      <Stack.Screen name="my-disputes" options={{ title: 'My Disputes' }} />
      <Stack.Screen name="identity-verification" options={{ title: 'Identity Verification' }} />
      <Stack.Screen name="settings" options={{ title: 'App Settings' }} />
    </Stack>
  );
}

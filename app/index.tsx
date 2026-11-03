import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { role, token, user, isLoading } = useAuth();
  
  if (isLoading) return null; // Or a splash screen component

  // If token, user, and role all exist, they are properly logged in -> go to tabs
  if (role && token && user) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  // Not logged in or missing token/user -> go to splash/onboarding
  return <Redirect href="/splash" />;
}

import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { role, isLoading } = useAuth();
  
  if (isLoading) return null; // Or a splash screen component

  // If we have a role, they are logged in -> go to tabs
  if (role) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  // Not logged in -> go to splash/onboarding
  return <Redirect href="/splash" />;
}

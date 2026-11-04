import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { role, token, user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
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
});

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../constants/Theme';
import { ClientHome } from '../../components/home/ClientHome';
import { WorkerHome } from '../../components/home/WorkerHome';

export default function HomeTab() {
  const theme = useTheme();
  const { role, token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.screen }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    );
  }

  // If credentials are not found, navigation is centrally handled by AccountRestrictionGate
  if (!token || !user || !role) {
    return null;
  }

  if (role === 'worker') {
    return <WorkerHome />;
  }

  return <ClientHome />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../constants/Theme';
import { ClientHome } from '../../components/home/ClientHome';
import { WorkerHome } from '../../components/home/WorkerHome';

export default function HomeTab() {
  const theme = useTheme();
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.screen }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    );
  }

  if (role === 'worker') {
    return <WorkerHome />;
  }

  // Default to ClientHome or handle null role (should redirect to role selection)
  return <ClientHome />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

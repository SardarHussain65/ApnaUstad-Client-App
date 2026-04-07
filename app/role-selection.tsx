import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Briefcase, ChevronRight } from 'lucide-react-native';
import { RoleCard } from '../components/RoleCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { Colors, Spacing, Typography } from '../constants/Theme';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'client' | 'worker' | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      // In a real app, you might save this in global state or AsyncStorage
      router.push({
        pathname: '/(auth)/signup',
        params: { role: selectedRole }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Join as a{'\n'}<Text style={styles.highlight}>Member</Text></Text>
          <Text style={styles.subtitle}>Choose your role to get started with ApnaUstad. You can always change this later.</Text>
        </View>

        <View style={styles.cardsContainer}>
          <RoleCard 
            title="I am a Client"
            description="I want to hire professionals and get my tasks done efficiently."
            icon={<User color={Colors.cyan} size={32} />}
            variant="client"
            isSelected={selectedRole === 'client'}
            onPress={() => setSelectedRole('client')}
          />

          <RoleCard 
            title="I am a Worker"
            description="I want to offer my services, build my profile, and find new jobs."
            icon={<Briefcase color={Colors.worker} size={32} />}
            variant="worker"
            isSelected={selectedRole === 'worker'}
            onPress={() => setSelectedRole('worker')}
          />
        </View>

        <View style={styles.footer}>
          <AnimatedButton 
            title="Continue" 
            variant={selectedRole === 'worker' ? 'orange' : 'cyan'}
            onPress={handleContinue}
            style={[styles.button, !selectedRole ? styles.disabledButton : null] as any}
            icon={<ChevronRight color="#000" size={20} style={{ marginLeft: 8 }} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.l,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1,
    lineHeight: 48,
    marginBottom: Spacing.s,
  },
  highlight: {
    color: Colors.cyan,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 16,
    lineHeight: 24,
  },
  cardsContainer: {
    gap: Spacing.m,
  },
  footer: {
    marginTop: Spacing.xxl,
  },
  button: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  }
});

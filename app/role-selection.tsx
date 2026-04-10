import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Briefcase, ChevronRight } from 'lucide-react-native';
import { RoleCard } from '../components/RoleCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { Colors, Spacing, Typography } from '../constants/Theme';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'client' | 'worker' | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      router.push({
        pathname: '/(auth)/login',
        params: { role: selectedRole }
      });
    }
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, Typography.threeD]}>IDENTIFY YOUR {'\n'}<Text style={styles.highlight}>DIMENSION</Text></Text>
            <Text style={styles.subtitle}>Select your operational mode within the ApnaUstad ecosystem.</Text>
          </View>

          <View style={styles.cardsContainer}>
            <RoleCard 
              title="MISSION COMMANDER"
              description="Initiate service requests and manage professional deployments."
              icon={<User color={Colors.cyan} size={28} />}
              variant="client"
              isSelected={selectedRole === 'client'}
              onPress={() => setSelectedRole('client')}
            />

            <RoleCard 
              title="ELITE SPECIALIST"
              description="Deploy your expertise and command your own professional orbit."
              icon={<Briefcase color={Colors.worker} size={28} />}
              variant="worker"
              isSelected={selectedRole === 'worker'}
              onPress={() => setSelectedRole('worker')}
            />
          </View>

          <View style={styles.footer}>
            <AnimatedButton 
              title="INITIATE PROTOCOL" 
              variant={selectedRole === 'worker' ? 'orange' : 'cyan'}
              onPress={handleContinue}
              style={styles.button}
              disabled={!selectedRole}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 60,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 45,
    marginBottom: 15,
  },
  highlight: {
    color: Colors.cyan,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textDim,
    lineHeight: 22,
    fontWeight: '600',
    maxWidth: '90%',
  },
  cardsContainer: {
    gap: 15,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 40,
  },
  button: {
    width: '100%',
    height: 56,
  },
  disabledButton: {
    opacity: 0.3,
  }
});

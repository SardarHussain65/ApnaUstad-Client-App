import React, { useState } from 'react';
import { Image, StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Briefcase } from 'lucide-react-native';
import { RoleCard } from '../components/RoleCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/Theme';

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
            <View style={styles.brandPill}>
              <Image source={require('../assets/images/logo_premium.png')} style={styles.brandLogo} />
              <Text style={styles.brandText}>WELCOME TO APNAUSTAD</Text>
            </View>
            <Text style={[styles.title, Typography.threeD]}>How will you use{'\n'}<Text style={styles.highlight}>ApnaUstad?</Text></Text>
            <Text style={styles.subtitle}>Choose your starting point. You can sign in or create the right account on the next screen.</Text>
          </View>

          <View style={styles.cardsContainer}>
            <RoleCard 
              label="I need a service"
              title="Continue as a client"
              description="Find skilled people, book services, and keep track of your requests."
              icon={<User color={Colors.cyan} size={28} />}
              variant="client"
              isSelected={selectedRole === 'client'}
              onPress={() => setSelectedRole('client')}
            />

            <RoleCard 
              label="I provide services"
              title="Continue as a specialist"
              description="Discover nearby jobs, manage bookings, and grow your professional profile."
              icon={<Briefcase color={Colors.worker} size={28} />}
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
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 42,
  },
  brandPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: Spacing.l,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  brandLogo: {
    width: 22,
    height: 22,
    marginRight: 7,
  },
  brandText: {
    color: Colors.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 43,
    marginBottom: 15,
  },
  highlight: {
    color: Colors.cyan,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    fontWeight: '600',
    maxWidth: 340,
  },
  cardsContainer: {
    gap: 2,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.xl,
  },
  button: {
    width: '100%',
    height: 56,
  },
});

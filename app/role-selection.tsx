import React, { useState } from 'react';
import { Image, StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Briefcase } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { RoleCard } from '../components/RoleCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../constants/Theme';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
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
            <View style={[styles.brandPill, {
              backgroundColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.04 : 0.05),
              borderColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.1 : 0.1),
            }]}>
              <Image source={require('../assets/images/logo_premium.png')} style={styles.brandLogo} />
              <Text style={[styles.brandText, { color: colors.cyan }]}>{t('roleSelection.welcome')}</Text>
            </View>
            <Text style={[styles.title, typography.threeD, { color: theme.colors.text.primary }]}>{t('roleSelection.title')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.muted }]}>{t('roleSelection.subtitle')}</Text>
          </View>

          <View style={styles.cardsContainer}>
            <RoleCard 
              label={t('roleSelection.client.label')}
              title={t('roleSelection.client.title')}
              description={t('roleSelection.client.description')}
              icon={<User color={colors.cyan} size={28} />}
              variant="client"
              isSelected={selectedRole === 'client'}
              onPress={() => setSelectedRole('client')}
            />

            <RoleCard 
              label={t('roleSelection.worker.label')}
              title={t('roleSelection.worker.title')}
              description={t('roleSelection.worker.description')}
              icon={<Briefcase color={colors.worker} size={28} />}
              variant="worker"
              isSelected={selectedRole === 'worker'}
              onPress={() => setSelectedRole('worker')}
            />
          </View>

          <View style={styles.footer}>
            <AnimatedButton 
              title={t('common.continue')}
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
    borderWidth: 1,
  },
  brandLogo: {
    width: 22,
    height: 22,
    marginRight: 7,
  },
  brandText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 43,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
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
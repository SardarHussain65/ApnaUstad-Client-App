import React, { useState } from 'react';
import { Image, StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Briefcase, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { RoleCard } from '../components/RoleCard';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../constants/Theme';
import { changeAppLanguage } from '../i18n';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const [selectedRole, setSelectedRole] = useState<'client' | 'worker' | null>(null);
  const isUrdu = i18n.language === 'ur';

  const handleSelectRole = (role: 'client' | 'worker') => {
    setSelectedRole(role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(auth)/login',
      params: { role },
    });
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <View
              style={[
                styles.brandPill,
                {
                  backgroundColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.04 : 0.05),
                  borderColor: alpha(theme.colors.text.primary, 0.1),
                },
              ]}
            >
              <Image source={require('../assets/images/logo_premium.png')} style={styles.brandLogo} />
              <Text style={[styles.brandText, { color: colors.cyan }]}>{t('roleSelection.welcome')}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => changeAppLanguage(isUrdu ? 'en' : 'ur')}
              style={[
                styles.langButton,
                {
                  backgroundColor: alpha(colors.cyan, 0.08),
                  borderColor: alpha(colors.cyan, 0.25),
                },
              ]}
            >
              <Globe size={14} color={colors.cyan} />
              <Text style={[styles.langText, { color: colors.cyan }]}>
                {isUrdu ? 'EN' : 'اردو'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, typography.threeD, { color: theme.colors.text.primary }]}>
              {t('roleSelection.title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.muted }]}>
              {t('roleSelection.subtitle')}
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            <RoleCard
              label={t('roleSelection.client.label')}
              title={t('roleSelection.client.title')}
              description={t('roleSelection.client.description')}
              icon={<User color={colors.cyan} size={28} />}
              variant="client"
              isSelected={selectedRole === 'client'}
              onPress={() => handleSelectRole('client')}
            />

            <RoleCard
              label={t('roleSelection.worker.label')}
              title={t('roleSelection.worker.title')}
              description={t('roleSelection.worker.description')}
              icon={<Briefcase color={colors.worker} size={28} />}
              variant="worker"
              isSelected={selectedRole === 'worker'}
              onPress={() => handleSelectRole('worker')}
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
    paddingTop: Spacing.l,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  header: {
    marginBottom: 32,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  brandLogo: {
    width: 22,
    height: 22,
    marginRight: 7,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: 340,
  },
  cardsContainer: {
    gap: 4,
  },
});
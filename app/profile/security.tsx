import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Shield, Lock, HelpCircle, ChevronRight, Eye } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemeTypography, useThemeColors, Spacing } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { useRouter } from 'expo-router';

export default function SecurityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const typography = useThemeTypography();
  const colors = useThemeColors();

  return (
    <BackgroundWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title={t('security.title')} />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <View style={styles.shieldIconWrapper}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.iconGlow}
            />
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.strong }]}>
              <Shield size={40} color={theme.colors.text.primary} />
            </View>
          </View>
          <Text style={[styles.screenTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('security.screenTitle')}</Text>
          <Text style={[styles.screenSubtitle, { color: theme.colors.text.muted }]}>{t('security.screenSubtitle')}</Text>
        </Animated.View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>{t('security.sectionTitle')}</Text>
          <SecurityItem 
            icon={Lock} 
            label={t('changePassword.title')} 
            onPress={() => router.push('/profile/change-password')} 
            delay={300} 
            primaryColor={colors.primary}
          />
          <SecurityItem 
            icon={Eye} 
            label={t('security.policiesTerms')} 
            onPress={() => router.push('/profile/privacy')} 
            delay={350} 
            primaryColor={colors.primary}
          />
          <SecurityItem 
            icon={HelpCircle} 
            label={t('security.reportIssue')} 
            onPress={() => router.push('/profile/help-center')} 
            delay={400} 
            primaryColor={colors.primary}
          />
        </View>
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface SecurityItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  delay: number;
}

function SecurityItem({ icon: Icon, label, onPress, delay, primaryColor }: SecurityItemProps & { primaryColor?: string }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity onPress={onPress}>
        <GlassCard style={styles.itemCard} intensity={25} padding={Spacing.m}>
          <View style={styles.itemContent}>
              <View style={[styles.itemIconBox, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
              <Icon size={20} color={primaryColor || theme.colors.text.primary} />
            </View>
            <Text style={[styles.itemLabel, { color: theme.colors.text.primary }]}>{label}</Text>
            <ChevronRight size={18} color={theme.colors.text.dim} />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shieldIconWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.35,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCard: {
    marginVertical: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '700',
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 6,
  },
});
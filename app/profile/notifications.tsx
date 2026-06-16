import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Bell, MessageSquare, Briefcase, Smartphone } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { alpha, Spacing, useTheme, useThemeTypography, useThemeColors } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { usePreferences, useUpdatePreferencesMutation } from '../../hooks';

export default function NotificationsScreen() {
  const { data: preferences, isLoading } = usePreferences();
  const { mutate: updatePreferences } = useUpdatePreferencesMutation();
  const { t } = useTranslation();
  const theme = useTheme();
  const typography = useThemeTypography();
  const colors = useThemeColors();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [messages, setMessages] = useState(true);

  useEffect(() => {
    if (!preferences) return;
    setPushEnabled(preferences.notifications.pushEnabled);
    setJobAlerts(preferences.notifications.jobAlerts);
    setMessages(preferences.notifications.messages);
  }, [preferences]);

  const updateNotificationPreference = (key: 'pushEnabled' | 'jobAlerts' | 'messages', value: boolean) => {
    updatePreferences({
      notifications: { [key]: value },
    });
  };

  return (
    <BackgroundWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Header */}
        <ProfileHeader title={t('notifications.title')} />

        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
          <View style={styles.bellIconWrapper}>
            <LinearGradient
              colors={[theme.colors.brand.primary, theme.colors.brand.secondary]}
              style={styles.iconGlow}
            />
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
              <Bell size={40} color={theme.colors.text.primary} />
            </View>
          </View>
          <Text style={[styles.screenTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('notifications.title')}</Text>
          <Text style={[styles.screenSubtitle, { color: theme.colors.text.muted }]}>{t('notifications.preferencesTitle')}</Text>
        </Animated.View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.muted }]}>{t('notifications.typesSection')}</Text>
<NotificationToggle
             icon={Smartphone}
             label={t('notifications.pushEnabled')}
             value={pushEnabled}
             onValueChange={(value) => {
               setPushEnabled(value);
               updateNotificationPreference('pushEnabled', value);
             }}
             delay={300}
             color={colors.cyan}
           />
<NotificationToggle
             icon={Briefcase}
             label={t('notifications.bookingUpdates')}
             value={jobAlerts}
             onValueChange={(value) => {
               setJobAlerts(value);
               updateNotificationPreference('jobAlerts', value);
             }}
             delay={400}
             color={colors.worker}
           />
           <NotificationToggle
             icon={MessageSquare}
             label={t('notifications.chatMessages')}
             value={messages}
             onValueChange={(value) => {
               setMessages(value);
               updateNotificationPreference('messages', value);
             }}
             delay={500}
             color={colors.success}
           />
        </View>

        <View style={styles.footerInfo}>
          {isLoading ? (
            <ActivityIndicator color={colors.cyan} />
          ) : (
            <Text style={[styles.footerText, { color: theme.colors.text.muted }]}>{t('notifications.footerText')}</Text>
          )}
        </View>
      </ScrollView>
    </BackgroundWrapper>
  );
}

interface NotificationToggleProps {
  icon: any;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  delay: number;
  color: string;
}

function NotificationToggle({ icon: Icon, label, value, onValueChange, delay, color }: NotificationToggleProps) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <GlassCard style={styles.itemCard} intensity={25} padding={Spacing.m}>
        <View style={styles.itemContent}>
          <View style={[styles.itemIconBox, { backgroundColor: alpha(color, 0.12), borderColor: alpha(color, 0.22) }]}>
            <Icon size={20} color={color} />
          </View>
          <Text style={[styles.itemLabel, { color: theme.colors.text.primary }]}>{label}</Text>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: theme.colors.surface.subtle, true: alpha(color, 0.65) }}
            thumbColor={value ? color : theme.colors.text.muted}
            ios_backgroundColor={theme.colors.surface.subtle}
          />
        </View>
      </GlassCard>
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
  bellIconWrapper: {
    width: 100,
    height: 100,
    position: 'relative',
    marginBottom: 20,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    opacity: 0.4,
  },
  iconCircle: {
    flex: 1,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  screenSubtitle: {
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  footerInfo: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});

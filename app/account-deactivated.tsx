import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, MessageCircle, RefreshCcw, ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { CustomButton } from '../components/CustomButton';
import { BorderRadius, Spacing, Typography } from '../constants/Theme';
import { useAuth } from '../context/AuthContext';

export default function AccountDeactivatedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { accountStatus, logout, refreshAccountStatus } = useAuth();
  const [checking, setChecking] = useState(false);

  const defaultReason = t('accountDeactivated.defaultReason');
  const reason = accountStatus?.deactivationReason || defaultReason;
  const deactivatedAt = accountStatus?.deactivatedAt
    ? new Date(accountStatus.deactivatedAt).toLocaleString()
    : null;

  const handleContactAdmin = () => {
    router.push({
      pathname: '/profile/help-center' as any,
      params: {
        subject: t('accountDeactivated.appealSubject'),
        reason,
        source: 'account_deactivation',
      },
    });
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    const nextStatus = await refreshAccountStatus();
    setChecking(false);
    if (nextStatus?.isActive !== false) {
      router.replace('/(tabs)' as any);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/role-selection' as any);
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <ShieldAlert size={44} color="#FF453A" strokeWidth={2.4} />
            </View>
          </View>

          <Text style={[styles.title, Typography.threeD]}>{t('accountDeactivated.title')}</Text>
          <Text style={styles.subtitle}>
            {t('accountDeactivated.subtitle')}
          </Text>

          <GlassCard style={styles.card} intensity={24} padding={Spacing.l}>
            <Text style={styles.reasonLabel}>{t('accountDeactivated.reasonLabel')}</Text>
            <Text style={styles.reasonText}>{reason}</Text>
            {deactivatedAt && <Text style={styles.dateText}>{t('accountDeactivated.deactivatedOn', { date: deactivatedAt })}</Text>}
          </GlassCard>

          <Text style={styles.explainer}>
            {t('accountDeactivated.explainer')}
          </Text>

          <View style={styles.actions}>
            <CustomButton
              title={t('accountDeactivated.contactAdmin')}
              onPress={handleContactAdmin}
              icon={<MessageCircle size={20} color="#000" strokeWidth={2.5} />}
            />
            <CustomButton
              title={checking ? t('accountDeactivated.checking') : t('accountDeactivated.checkStatus')}
              onPress={handleCheckStatus}
              loading={checking}
              variant="secondary"
              icon={<RefreshCcw size={20} color="#fff" strokeWidth={2.5} />}
            />
            <CustomButton
              title={t('accountDeactivated.logout')}
              onPress={handleLogout}
              variant="outline"
              icon={<LogOut size={20} color="#fff" strokeWidth={2.5} />}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.xl,
  },
  iconOuter: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.22)',
    marginBottom: 24,
  },
  iconInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,69,58,0.13)',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderColor: 'rgba(255,69,58,0.24)',
    marginBottom: 18,
  },
  reasonLabel: {
    color: '#FF453A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  reasonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  dateText: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
  },
  explainer: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 26,
  },
  actions: {
    gap: 12,
  },
});

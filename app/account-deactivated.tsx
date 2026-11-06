import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, MessageCircle, RefreshCcw, ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { CustomButton } from '../components/CustomButton';
import { BorderRadius, Spacing, Typography, useTheme, alpha } from '../constants/Theme';
import { useAuth } from '../context/AuthContext';

export default function AccountDeactivatedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const { accountStatus, logout, refreshAccountStatus } = useAuth();
  const [checking, setChecking] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handlePressLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setShowLogoutModal(false);
    } finally {
      setIsLoggingOut(false);
    }
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
              onPress={handlePressLogout}
              variant="outline"
              icon={<LogOut size={20} color="#fff" strokeWidth={2.5} />}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Logout Confirmation Modal ── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !isLoggingOut && setShowLogoutModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            {/* Warning Ring */}
            <View
              style={[
                styles.modalIconRing,
                {
                  backgroundColor: alpha('#EF4444', 0.12),
                  borderColor: alpha('#EF4444', 0.25),
                },
              ]}
            >
              <LogOut size={28} color="#EF4444" strokeWidth={2.4} />
            </View>

            {/* Title & Description */}
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              {t('profile.logoutConfirmTitle', 'Log Out?')}
            </Text>
            <Text style={[styles.modalDesc, { color: theme.colors.text.muted }]}>
              {t('profile.logoutConfirmDesc', 'Are you sure you want to log out of your account?')}
            </Text>

            {/* Actions */}
            <View style={styles.modalActionsCol}>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isLoggingOut && { opacity: 0.7 }]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <LogOut size={16} color="#FFFFFF" strokeWidth={2.3} style={{ marginEnd: 8 }} />
                    <Text style={styles.modalConfirmBtnText} numberOfLines={1}>
                      {t('profile.logoutConfirmYes', 'Yes, Log Out')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.colors.surface.subtle,
                    borderColor: theme.colors.border.subtle,
                  },
                ]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {t('profile.logoutConfirmCancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActionsCol: {
    width: '100%',
    gap: 10,
  },
  modalConfirmBtn: {
    width: '100%',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalCancelBtn: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

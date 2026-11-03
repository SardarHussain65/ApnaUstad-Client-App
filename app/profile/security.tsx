import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Pressable } from 'react-native';
import { Shield, Lock, ChevronRight, ChevronLeft, Eye, Trash2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useTheme, useThemeTypography, useThemeColors, Spacing, alpha } from '../../constants/Theme';
import { GlassCard } from '../../components/home/GlassCard';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsRTL } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function SecurityScreen() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { user, role, logout } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const typography = useThemeTypography();
  const colors = useThemeColors();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (action === 'delete') {
      setShowDeleteModal(true);
    }
  }, [action]);

  const handlePressDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user?._id) return;
    try {
      setIsDeleting(true);
      const endpoint = role === 'worker' ? `/workers/${user._id}` : `/users/${user._id}`;
      await api.delete(endpoint);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: t('profile.deleteSuccess', 'Your account has been deleted successfully.'),
      });
      await logout();
      setShowDeleteModal(false);
      router.replace('/role-selection');
    } catch (err: any) {
      console.error('Delete account error:', err);
      Toast.show({
        type: 'error',
        text1: 'Could not delete account',
        text2: err?.response?.data?.message || 'Please try again later.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

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

        {/* Security Options */}
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
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginTop: 14 }]}>
          <Text style={[styles.sectionTitle, { color: theme.isDark ? '#EF4444' : '#DC2626' }]}>
            {t('security.dangerZone', 'Danger Zone')}
          </Text>
          <SecurityItem
            icon={Trash2}
            label={t('profile.deleteAccount', 'Delete Account')}
            sublabel={t('security.deleteAccountSub', 'Permanently delete your account & all data')}
            onPress={handlePressDeleteAccount}
            delay={400}
            primaryColor={theme.isDark ? '#EF4444' : '#DC2626'}
            danger
          />
        </View>
      </ScrollView>

      {/* ── Delete Account Confirmation Modal ── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !isDeleting && setShowDeleteModal(false)}
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
            {/* Danger Ring */}
            <View
              style={[
                styles.modalIconRing,
                {
                  backgroundColor: alpha('#EF4444', 0.12),
                  borderColor: alpha('#EF4444', 0.28),
                },
              ]}
            >
              <Trash2 size={28} color="#EF4444" strokeWidth={2.4} />
            </View>

            {/* Title & Description */}
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              {t('profile.deleteConfirmTitle', 'Delete Account Permanently?')}
            </Text>
            <Text style={[styles.modalDesc, { color: theme.colors.text.muted }]}>
              {t('profile.deleteConfirmDesc', 'This action is irreversible. All your profile data, booking history, ratings, and saved information will be permanently deleted.')}
            </Text>

            {/* Actions: Staked vertically for clean fit across all devices & languages */}
            <View style={styles.modalActionsCol}>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isDeleting && { opacity: 0.7 }]}
                onPress={handleConfirmDeleteAccount}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={16} color="#FFFFFF" strokeWidth={2.3} style={{ marginEnd: 8 }} />
                    <Text style={styles.modalConfirmBtnText} numberOfLines={1}>
                      {t('profile.deleteConfirmYes', 'Yes, Delete Account')}
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
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {t('profile.deleteConfirmCancel', 'Keep Account')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </BackgroundWrapper>
  );
}

interface SecurityItemProps {
  icon: any;
  label: string;
  sublabel?: string;
  onPress: () => void;
  delay: number;
  danger?: boolean;
}

function SecurityItem({
  icon: Icon,
  label,
  sublabel,
  onPress,
  delay,
  primaryColor,
  danger,
}: SecurityItemProps & { primaryColor?: string }) {
  const theme = useTheme();
  const isRTL = useIsRTL();
  const dangerColor = theme.isDark ? '#EF4444' : '#DC2626';

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <GlassCard
          style={[
            styles.itemCard,
            danger && {
              borderColor: alpha(dangerColor, 0.28),
              backgroundColor: alpha(dangerColor, 0.05),
            },
          ]}
          intensity={25}
          padding={Spacing.m}
        >
          <View style={styles.itemContent}>
            <View
              style={[
                styles.itemIconBox,
                danger
                  ? { backgroundColor: alpha(dangerColor, 0.12), borderColor: alpha(dangerColor, 0.28) }
                  : { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle },
              ]}
            >
              <Icon size={20} color={danger ? dangerColor : (primaryColor || theme.colors.text.primary)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.itemLabel,
                  { color: danger ? dangerColor : theme.colors.text.primary },
                ]}
              >
                {label}
              </Text>
              {sublabel ? (
                <Text style={[styles.itemSublabel, { color: theme.colors.text.muted }]}>
                  {sublabel}
                </Text>
              ) : null}
            </View>
            {isRTL ? (
              <ChevronLeft size={18} color={danger ? dangerColor : theme.colors.text.dim} />
            ) : (
              <ChevronRight size={18} color={danger ? dangerColor : theme.colors.text.dim} />
            )}
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
    marginEnd: 16,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '600',
  },
  itemSublabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
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

  // Modal
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

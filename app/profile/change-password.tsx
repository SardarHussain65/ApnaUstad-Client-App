import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { GlassCard } from '../../components/home/GlassCard';
import { InputField } from '../../components/InputField';
import { CustomButton } from '../../components/CustomButton';
import { Spacing, BorderRadius, useTheme, useThemeShadows, useThemeTypography, useThemeColors } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useChangePasswordMutation, useToast } from '../../hooks';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const { success, error: showError } = useToast();
  const { mutateAsync: changePassword, isPending } = useChangePasswordMutation();
  const theme = useTheme();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();
  const colors = useThemeColors();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    if (!user?._id || !role) return;

    if (!oldPassword || !newPassword) {
      showError(t('changePassword.missingFields'), t('changePassword.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      showError(t('changePassword.mismatch'), t('changePassword.mismatchDesc'));
      return;
    }

    try {
      await changePassword({
        role,
        id: user._id,
        oldPassword,
        newPassword,
      });
      success(t('changePassword.updatedTitle'), t('changePassword.updatedDesc'));
      router.back();
    } catch (err: any) {
      showError(t('changePassword.updateFailed'), err?.message || t('changePassword.updating'));
    }
  };

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProfileHeader title={t('changePassword.title')} />

        <View style={styles.headerSection}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.secondary]} style={styles.iconGlow} />
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.strong }]}>
              <ShieldCheck size={28} color={theme.colors.text.primary} />
            </View>
          </View>
          <Text style={[styles.title, typography.threeD, { color: theme.colors.text.primary }]}>{t('changePassword.secureAccessTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.muted }]}>{t('changePassword.secureAccessSubtitle')}</Text>
        </View>

        <GlassCard style={[styles.formCard, shadows.glow]} intensity={20} padding={Spacing.l}>
          <InputField
            label={t('changePassword.currentPassword')}
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder={t('changePassword.currentPlaceholder')}
            secureTextEntry
            icon={<Lock size={18} color={theme.colors.brand.primary} />}
          />
          <InputField
            label={t('changePassword.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('changePassword.newPlaceholder')}
            secureTextEntry
            icon={<Lock size={18} color={theme.colors.brand.primary} />}
          />
          <InputField
            label={t('changePassword.confirmNewPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('changePassword.confirmPlaceholder')}
            secureTextEntry
            icon={<Lock size={18} color={theme.colors.brand.primary} />}
          />
        </GlassCard>

        <View style={styles.footer}>
          <CustomButton
            title={isPending ? t('changePassword.updating') : t('changePassword.updateBtn')}
            onPress={handleSubmit}
            loading={isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    width: 88,
    height: 88,
    marginBottom: 16,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    opacity: 0.35,
  },
  iconCircle: {
    flex: 1,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    marginBottom: 6,
    fontWeight: '800',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
  },
  formCard: {
    borderRadius: BorderRadius.l,
  },
  footer: {
    marginTop: 24,
  },
});
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { AnimatedButton } from '../../components/AnimatedButton';
import { InputField } from '../../components/InputField';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { SecurityNote } from '../../components/auth/SecurityNote';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { AlertModal } from '../../components/ui';
import api from '../../services/api';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../../constants/Theme';
import { useAlertModal, useToast } from '../../hooks';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { email, code, role } = useLocalSearchParams<{
    email: string;
    code: string;
    role?: string;
  }>();
  const isWorker = role === 'worker';
  const theme = useTheme();
  const colors = useThemeColors();
  const toast = useToast();
  const alertModal = useAlertModal();
  const accentColor = isWorker ? colors.worker : colors.cyan;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/otp/forgot-password/reset', {
        email: (email || '').trim().toLowerCase(),
        code: (code || '').trim(),
        newPassword,
        type: isWorker ? 'worker' : 'user',
      });
      return response.data;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alertModal.showAlert(
        t('resetPassword.passwordUpdated', 'Password Changed!'),
        t('resetPassword.readySignIn', 'Your new password is saved. You can sign in now.'),
        () => router.replace({
          pathname: '/(auth)/login' as never,
          params: { role },
        }),
        'success',
        t('resetPassword.signIn', 'Sign In')
      );
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alertModal.showAlert(
        t('resetPassword.unableReset', 'Could not change password'),
        error?.response?.data?.message || error.message || t('resetPassword.invalidCode', 'The code is wrong or expired. Please request a new one.'),
        undefined,
        'error'
      );
    },
  });

  const handleResetPassword = () => {
    setPasswordError('');
    setConfirmError('');

    if (!code) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(t('resetPassword.codeRequired', 'Code Needed'), t('resetPassword.enterCode', 'Verification code is missing. Please verify again.'));
      router.back();
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('resetPassword.useMinChars', 'Password must be at least 6 characters.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError(t('resetPassword.passwordsMismatch', 'Both passwords must match.'));
      return;
    }

    resetMutation.mutate();
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader title={t('resetPassword.title', 'New Password')} onBack={() => router.back()} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              align="center"
              description={t('resetPassword.desc', { email, defaultValue: 'Enter and confirm your new password to secure your account.' })}
              highlight={t('resetPassword.highlight', 'new password')}
              icon={<Lock size={36} color={accentColor} strokeWidth={1.8} />}
              title={t('resetPassword.createNew', 'Choose a')}
            />

            <GlassCard
              intensity={25}
              padding={Spacing.l}
              style={[styles.formCard, { borderColor: theme.colors.border.default }]}
              gradient={[alpha(accentColor, 0.14), alpha(theme.colors.brand.secondary, 0.05)]}
            >
              <InputField
                accentColor={accentColor}
                autoCapitalize="none"
                error={passwordError}
                icon={<Lock size={18} color={accentColor} />}
                label={t('resetPassword.newPassword', 'New password')}
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('resetPassword.atLeast6', 'At least 6 characters')}
                rightIcon={
                  <PasswordVisibilityButton
                    isVisible={showNewPassword}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  />
                }
                secureTextEntry={!showNewPassword}
                value={newPassword}
              />
              <InputField
                accentColor={accentColor}
                autoCapitalize="none"
                error={confirmError}
                icon={<Lock size={18} color={accentColor} />}
                label={t('resetPassword.confirmNewPassword', 'Type new password again')}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (confirmError) setConfirmError('');
                }}
                placeholder={t('resetPassword.repeatNew', 'Re-enter new password')}
                rightIcon={
                  <PasswordVisibilityButton
                    isVisible={showConfirmPassword}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
              />

              <AnimatedButton
                isLoading={resetMutation.isPending}
                onPress={handleResetPassword}
                style={styles.saveButton}
                title={t('resetPassword.updatePassword', 'Save New Password')}
                variant={isWorker ? 'orange' : 'cyan'}
              />
            </GlassCard>

            <SecurityNote accentColor={accentColor} text={t('resetPassword.securityNote', 'Once saved, you can sign in right away with your new password.')} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <AlertModal
        visible={alertModal.visible}
        onDismiss={alertModal.onDismiss}
        title={alertModal.title}
        message={alertModal.message}
        buttonText={alertModal.buttonText}
        type={alertModal.type}
      />
    </BackgroundWrapper>
  );
}

interface PasswordVisibilityButtonProps {
  isVisible: boolean;
  onPress: () => void;
}

function PasswordVisibilityButton({ isVisible, onPress }: PasswordVisibilityButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
      hitSlop={8}
      onPress={onPress}
    >
      {isVisible
        ? <EyeOff size={18} color={theme.colors.text.muted} />
        : <Eye size={18} color={theme.colors.text.muted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.xl,
  },
  formCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.8,
  },
  saveButton: {
    marginTop: Spacing.xl,
    width: '100%',
  },
});

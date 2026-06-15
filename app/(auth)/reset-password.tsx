import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react-native';
import { OtpInput } from 'react-native-otp-entry';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { AnimatedButton } from '../../components/AnimatedButton';
import { InputField } from '../../components/InputField';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { SecurityNote } from '../../components/auth/SecurityNote';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { BASE_URL } from '../../constants/Config';
import { alpha, BorderRadius, Colors, Spacing, useTheme, useThemeColors } from '../../constants/Theme';

const { width } = Dimensions.get('window');

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { email, role } = useLocalSearchParams<{ email: string; role?: string }>();
  const isWorker = role === 'worker';
  const theme = useTheme();
  const colors = useThemeColors();
  const accentColor = isWorker ? colors.worker : colors.cyan;

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${BASE_URL}/api/v1/otp/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otp.trim(),
          newPassword,
          type: role || 'user',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('resetPassword.invalidCode'));
      }
      return data;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('resetPassword.passwordUpdated'),
        t('resetPassword.readySignIn'),
        [{
          text: t('resetPassword.signIn'),
          onPress: () => router.replace({
            pathname: '/(auth)/login' as never,
            params: { role },
          }),
        }],
      );
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('resetPassword.unableReset'), error.message || t('resetPassword.invalidCode'));
    },
  });

  const handleResetPassword = () => {
    setPasswordError('');
    setConfirmError('');

    if (otp.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('resetPassword.codeRequired'), t('resetPassword.enterCode'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('resetPassword.useMinChars'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError(t('resetPassword.passwordsMismatch'));
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
            <AuthHeader title={t('resetPassword.title')} onBack={() => router.back()} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              align="center"
              description={t('resetPassword.desc', { email })}
              highlight={t('resetPassword.highlight')}
              icon={<ShieldCheck size={36} color={accentColor} strokeWidth={1.8} />}
              title={t('resetPassword.createNew')}
            />

<GlassCard
               intensity={25}
               padding={Spacing.l}
               style={[styles.otpCard, { borderColor: theme.colors.border.subtle }]}
               gradient={[alpha(accentColor, 0.14), alpha(theme.colors.brand.secondary, 0.05)]}
             >
              <Text style={[styles.otpLabel, { color: theme.colors.text.muted }]}>{t('resetPassword.recoveryCode')}</Text>
              <OtpInput
                numberOfDigits={6}
                focusColor={accentColor}
                focusStickBlinkingDuration={500}
                onFilled={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
                onTextChange={setOtp}
                theme={{
                  containerStyle: styles.otpContainer,
                  pinCodeContainerStyle: styles.otpCell,
                  pinCodeTextStyle: styles.otpText,
                  focusStickStyle: { ...styles.focusStick, backgroundColor: accentColor },
                  focusedPinCodeContainerStyle: {
                    ...styles.activeOtpCell,
                    borderColor: accentColor,
                    shadowColor: accentColor,
                  },
                }}
              />

              <InputField
                accentColor={accentColor}
                autoCapitalize="none"
                error={passwordError}
                icon={<Lock size={18} color={accentColor} />}
                label={t('resetPassword.newPassword')}
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('resetPassword.atLeast6')}
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
                label={t('resetPassword.confirmNewPassword')}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (confirmError) setConfirmError('');
                }}
                placeholder={t('resetPassword.repeatNew')}
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
                 style={styles.verifyButton}
                 title={t('resetPassword.updatePassword')}
                 variant={isWorker ? 'orange' : 'cyan'}
               />
            </GlassCard>

            <SecurityNote accentColor={accentColor} text={t('resetPassword.securityNote')} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  otpCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
  },
  otpLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: Spacing.m,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpCell: {
    width: (width - 48 - 64 - 40) / 6,
    height: 58,
    borderRadius: BorderRadius.m,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeOtpCell: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  otpText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  focusStick: {
    width: 2,
    height: 24,
  },
  verifyButton: {
    marginTop: Spacing.xl,
    width: '100%',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  resendHint: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 12,
    fontWeight: '600',
  },
  resendButton: {
    fontSize: 12,
    fontWeight: '800',
  },
});
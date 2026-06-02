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
import { AnimatedButton } from '../../components/AnimatedButton';
import { InputField } from '../../components/InputField';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { SecurityNote } from '../../components/auth/SecurityNote';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { BASE_URL } from '../../constants/Config';
import { BorderRadius, Colors, Spacing } from '../../constants/Theme';

const { width } = Dimensions.get('window');

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email, role } = useLocalSearchParams<{ email: string; role?: string }>();
  const isWorker = role === 'worker';
  const accentColor = isWorker ? Colors.worker : Colors.cyan;

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
        throw new Error(data.message || 'Verification or password update failed.');
      }
      return data;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Password updated',
        'Your new password is ready. You can now sign in securely.',
        [{
          text: 'Sign in',
          onPress: () => router.replace({
            pathname: '/(auth)/login' as never,
            params: { role },
          }),
        }],
      );
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Unable to reset password', error.message || 'The code is invalid or has expired.');
    },
  });

  const handleResetPassword = () => {
    setPasswordError('');
    setConfirmError('');

    if (otp.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Code required', 'Enter the 6-digit code sent to your email.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Use at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match.');
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
            <AuthHeader title="Secure reset" onBack={() => router.back()} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              align="center"
              description={`Enter the code sent to ${email}, then choose a new password for your account.`}
              highlight="new password"
              icon={<ShieldCheck size={36} color={accentColor} strokeWidth={1.8} />}
              title="Create a"
            />

            <GlassCard
              intensity={25}
              padding={Spacing.l}
              style={styles.formCard}
              gradient={[`${accentColor}14`, 'rgba(191,90,242,0.05)']}
            >
              <Text style={styles.otpLabel}>Recovery code</Text>
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
                label="New password"
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="At least 6 characters"
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
                label="Confirm new password"
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (confirmError) setConfirmError('');
                }}
                placeholder="Repeat your new password"
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
                style={styles.resetButton}
                title="Update password"
                variant={isWorker ? 'orange' : 'cyan'}
              />
            </GlassCard>

            <SecurityNote accentColor={accentColor} text="Your password is updated through a secure, one-time recovery request." />
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
  return (
    <TouchableOpacity
      accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
      hitSlop={8}
      onPress={onPress}
    >
      {isVisible
        ? <EyeOff size={18} color={Colors.textMuted} />
        : <Eye size={18} color={Colors.textMuted} />}
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
    borderColor: 'rgba(255,255,255,0.14)',
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
    marginBottom: Spacing.xl,
    width: '100%',
  },
  otpCell: {
    width: (width - 48 - 64 - 40) / 6,
    height: 56,
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
  resetButton: {
    marginTop: Spacing.s,
    width: '100%',
  },
});

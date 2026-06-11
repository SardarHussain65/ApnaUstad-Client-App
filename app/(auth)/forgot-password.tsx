import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ShieldQuestion } from 'lucide-react-native';
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
import { BorderRadius, Colors, Spacing } from '../../constants/Theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isWorker = role === 'worker';
  const accentColor = isWorker ? Colors.worker : Colors.cyan;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const sendOtpMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await fetch(`${BASE_URL}/api/v1/otp/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress.trim().toLowerCase(),
          type: role || 'user',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('forgotPassword.checkEmailError'));
      }
      return data;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('forgotPassword.recoveryCodeSent'),
        t('forgotPassword.checkEmail'),
        [{
          text: t('forgotPassword.continue'),
          onPress: () => router.push({
            pathname: '/(auth)/reset-password' as never,
            params: { email: email.trim().toLowerCase(), role },
          }),
        }],
      );
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('forgotPassword.unableSendCode'), error.message || t('forgotPassword.checkEmailError'));
    },
  });

  const handleSendCode = () => {
    const normalizedEmail = email.trim();
    setEmailError('');

    if (!normalizedEmail) {
      setEmailError(t('forgotPassword.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError(t('forgotPassword.validEmail'));
      return;
    }

    sendOtpMutation.mutate(normalizedEmail);
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader title={t('forgotPassword.title')} onBack={() => router.back()} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              align="center"
              description={t('forgotPassword.recoverDesc')}
              highlight={t('forgotPassword.highlight')}
              icon={<ShieldQuestion size={36} color={accentColor} strokeWidth={1.8} />}
              title={t('forgotPassword.recover')}
            />

            <GlassCard
              intensity={25}
              padding={Spacing.l}
              style={styles.recoveryCard}
              gradient={[`${accentColor}14`, 'rgba(191,90,242,0.05)']}
            >
              <InputField
                accentColor={accentColor}
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
                icon={<Mail size={18} color={accentColor} />}
                keyboardType="email-address"
                label={t('forgotPassword.registeredEmail')}
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError('');
                }}
                placeholder={t('auth.emailPlaceholder', 'name@example.com')}
                value={email}
              />
              <AnimatedButton
                isLoading={sendOtpMutation.isPending}
                onPress={handleSendCode}
                style={styles.actionButton}
                title={t('forgotPassword.sendCode')}
                variant={isWorker ? 'orange' : 'cyan'}
              />
            </GlassCard>

            <SecurityNote
              accentColor={accentColor}
              text={t('forgotPassword.securityNote')}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundWrapper>
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
  recoveryCard: {
    borderRadius: BorderRadius.xxl,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  actionButton: {
    marginTop: Spacing.s,
    width: '100%',
  },
});

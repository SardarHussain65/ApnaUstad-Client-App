import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck } from 'lucide-react-native';
import { OtpInput } from 'react-native-otp-entry';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { AnimatedButton } from '../../components/AnimatedButton';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { SecurityNote } from '../../components/auth/SecurityNote';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { AlertModal } from '../../components/ui';
import api from '../../services/api';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../../constants/Theme';
import { useAlertModal, useToast } from '../../hooks';

const { width } = Dimensions.get('window');

export default function VerifyResetScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { email, role } = useLocalSearchParams<{
    email: string;
    role?: string;
  }>();
  const isWorker = role === 'worker';
  const theme = useTheme();
  const colors = useThemeColors();
  const toast = useToast();
  const alertModal = useAlertModal();
  const accentColor = isWorker ? colors.worker : colors.cyan;

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.warning(t('verifyReset.codeRequired', 'Enter Code'), t('verifyReset.enterCode', 'Please type the 6-digit code sent to your email.'));
      return;
    }

    setIsVerifying(true);
    try {
      await api.post('/otp/forgot-password/verify-otp', {
        email: (email || '').trim().toLowerCase(),
        code: otp.trim(),
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/(auth)/reset-password' as never,
        params: {
          email: (email || '').trim().toLowerCase(),
          code: otp.trim(),
          role: isWorker ? 'worker' : 'user',
        },
      });
    } catch (error: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alertModal.showAlert(
        t('verifyReset.verificationFailed', 'Verification Failed'),
        error?.response?.data?.message || error.message || t('verifyReset.invalidCode', 'That code didn\'t match or expired. Please try again.'),
        undefined,
        'error'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending || resendCooldown > 0) return;
    setIsResending(true);

    try {
      await api.post('/otp/forgot-password/send-otp', {
        email: (email || '').trim().toLowerCase(),
        type: isWorker ? 'worker' : 'user',
      });

      setResendCooldown(30);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('verifyReset.codeSent', 'Code Sent'), t('verifyReset.freshCode', 'We sent a new 6-digit code to your email.'));
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(t('verifyReset.unableResend', 'Could not send code'), error?.response?.data?.message || error.message);
    } finally {
      setIsResending(false);
    }
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
            <AuthHeader title={t('verifyReset.title', 'Verify Code')} onBack={() => router.back()} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              align="center"
              description={t('verifyReset.desc', { email, defaultValue: `Enter the 6-digit code sent to ${email} to verify your request.` })}
              highlight={t('verifyReset.highlight', '6-digit code')}
              icon={<ShieldCheck size={36} color={accentColor} strokeWidth={1.8} />}
              title={t('verifyReset.verify', 'Verify')}
            />

            <GlassCard
              intensity={25}
              padding={Spacing.l}
              style={[styles.otpCard, { borderColor: theme.colors.border.default }]}
              gradient={[alpha(accentColor, 0.14), alpha(theme.colors.brand.secondary, 0.05)]}
            >
              <Text style={[styles.otpLabel, { color: theme.colors.text.muted }]}>
                {t('verifyReset.codeLabel', '6-digit code')}
              </Text>
              <OtpInput
                numberOfDigits={6}
                focusColor={accentColor}
                focusStickBlinkingDuration={500}
                onFilled={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
                onTextChange={setOtp}
                theme={{
                  containerStyle: styles.otpContainer,
                  pinCodeContainerStyle: {
                    ...styles.otpCell,
                    borderColor: theme.colors.border.default,
                    backgroundColor: theme.colors.input.background,
                  },
                  pinCodeTextStyle: { ...styles.otpText, color: theme.colors.text.primary },
                  focusStickStyle: { ...styles.focusStick, backgroundColor: accentColor },
                  focusedPinCodeContainerStyle: {
                    ...styles.activeOtpCell,
                    borderColor: accentColor,
                    shadowColor: accentColor,
                    backgroundColor: alpha(accentColor, 0.08),
                  },
                }}
              />

              <AnimatedButton
                isLoading={isVerifying}
                onPress={handleVerify}
                style={styles.verifyButton}
                title={t('verifyReset.verifyBtn', 'Verify Code')}
                variant={isWorker ? 'orange' : 'cyan'}
              />
            </GlassCard>

            <View style={styles.resendRow}>
              <Text style={[styles.resendHint, { color: theme.colors.text.muted }]}>
                {t('verifyReset.resendHint', 'Didn\'t get the code?')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isResending || resendCooldown > 0}
                onPress={handleResend}
              >
                <Text
                  style={[
                    styles.resendButton,
                    { color: resendCooldown > 0 ? theme.colors.text.dim : accentColor },
                  ]}
                >
                  {isResending
                    ? t('verifyReset.sending', ' Sending...')
                    : resendCooldown > 0
                    ? t('verifyReset.resendIn', { seconds: resendCooldown, defaultValue: ` Send again in ${resendCooldown}s` })
                    : t('verifyReset.resendNow', ' Send code again')}
                </Text>
              </TouchableOpacity>
            </View>

            <SecurityNote accentColor={accentColor} text={t('verifyReset.securityNote', 'For your safety, this code expires after a few minutes.')} />
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
    borderWidth: 1.8,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: Spacing.m,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  otpContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpCell: {
    width: (width - 48 - 64 - 40) / 6,
    height: 58,
    borderRadius: BorderRadius.m,
    borderWidth: 1,
  },
  activeOtpCell: {
    borderWidth: 1.5,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  otpText: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
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
    fontSize: 12,
    fontWeight: '600',
  },
  resendButton: {
    fontSize: 12,
    fontWeight: '800',
  },
});


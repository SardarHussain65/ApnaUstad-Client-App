import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { MailCheck } from 'lucide-react-native';
import { OtpInput } from 'react-native-otp-entry';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { AnimatedButton } from '../../components/AnimatedButton';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { AuthProgress } from '../../components/auth/AuthProgress';
import { SecurityNote } from '../../components/auth/SecurityNote';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { BASE_URL } from '../../constants/Config';
import { alpha, BorderRadius, Colors, Spacing, useTheme, useThemeColors } from '../../constants/Theme';

const { width } = Dimensions.get('window');

export default function VerifyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { fullName, email, phone, role } = useLocalSearchParams<{
    fullName: string;
    email: string;
    phone: string;
    role?: string;
  }>();
  const isWorker = role === 'worker';
  const theme = useTheme();
  const colors = useThemeColors();
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
      Alert.alert(t('verify.codeRequired'), t('verify.enterCode'));
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/otp/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('verify.invalidCode'));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/(auth)/register-details' as never,
        params: { fullName, email, phone, role, idToken: '' },
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('verify.verificationFailed'), error.message || t('verify.invalidCode'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending || resendCooldown > 0) return;
    setIsResending(true);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/otp/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('verify.unableResend'));
      }

      setResendCooldown(30);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('verify.codeSent'), t('verify.freshCode'));
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('verify.unableResend'), error.message || t('verify.tryAgain'));
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
            <AuthHeader title={t('verify.title')} onBack={() => router.back()} accentColor={accentColor} />
            <AuthProgress currentStep={2} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              align="center"
              description={t('verify.description', { email })}
              highlight={t('verify.highlight')}
              icon={<MailCheck size={36} color={accentColor} strokeWidth={1.8} />}
              title={t('verify.verify')}
            />

            <GlassCard
              intensity={25}
              padding={Spacing.l}
              style={[styles.otpCard, { borderColor: theme.colors.border.subtle }]}
              gradient={[alpha(accentColor, 0.14), alpha(theme.colors.brand.secondary, 0.05)]}
            >
              <Text style={[styles.otpLabel, { color: theme.colors.text.muted }]}>{t('verify.otpLabel')}</Text>
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

              <AnimatedButton
                isLoading={isVerifying}
                onPress={handleVerify}
                style={styles.verifyButton}
                title={t('verify.verifyBtn')}
                variant={isWorker ? 'orange' : 'cyan'}
              />
            </GlassCard>

            <View style={styles.resendRow}>
              <Text style={styles.resendHint}>{t('verify.resendHint')}</Text>
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
                  {isResending ? t('verify.sending') : resendCooldown > 0 ? t('verify.resendIn', { seconds: resendCooldown }) : t('verify.resendNow')}
                </Text>
              </TouchableOpacity>
            </View>

            <SecurityNote accentColor={accentColor} text={t('verify.securityNote')} />
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
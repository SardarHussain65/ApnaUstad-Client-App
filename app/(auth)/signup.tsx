import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Phone, User } from 'lucide-react-native';
import { AnimatedButton } from '../../components/AnimatedButton';
import { InputField } from '../../components/InputField';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { AuthProgress } from '../../components/auth/AuthProgress';
import { SecurityNote } from '../../components/auth/SecurityNote';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { BASE_URL } from '../../constants/Config';
import { BorderRadius, Colors, Spacing } from '../../constants/Theme';

export default function SignupScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isWorker = role === 'worker';
  const accentColor = isWorker ? Colors.worker : Colors.cyan;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const checkUserMutation = useMutation({
    mutationFn: async (phone: string) => {
      const endpoint = isWorker ? '/api/v1/workers/check-worker' : '/api/v1/users/check-user';
      const checkResponse = await fetch(`${BASE_URL}${endpoint}?phone=${encodeURIComponent(phone)}`);
      if (!checkResponse.ok) {
        throw new Error(`Failed to check ${isWorker ? 'specialist' : 'client'} availability`);
      }

      const checkData = await checkResponse.json();
      if (checkData.data?.exists) {
        throw new Error('PHONE_EXISTS');
      }

      const otpResponse = await fetch(`${BASE_URL}/api/v1/otp/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!otpResponse.ok) {
        const errorData = await otpResponse.json();
        if (otpResponse.status === 409) {
          throw new Error('EMAIL_EXISTS');
        }
        throw new Error(errorData.message || 'Failed to send verification email');
      }

      return { phone };
    },
    onSuccess: ({ phone }) => {
      router.push({
        pathname: '/(auth)/verify' as never,
        params: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone,
          role,
        },
      });
    },
    onError: (error: Error) => {
      if (error.message === 'PHONE_EXISTS') {
        Alert.alert('Account already exists', `This phone number is already registered as a ${isWorker ? 'specialist' : 'client'}.`);
      } else if (error.message === 'EMAIL_EXISTS') {
        Alert.alert('Account already exists', 'This email address is already registered to another account.');
      } else {
        Alert.alert('Unable to continue', error.message || 'Failed to send the verification code.');
      }
    },
  });

  const handleNext = () => {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phoneNumber.trim();
    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    let hasError = false;

    setNameError('');
    setEmailError('');
    setPhoneError('');

    if (normalizedName.length < 3) {
      setNameError('Enter your full name.');
      hasError = true;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    }
    if (phoneDigits.length < 10) {
      setPhoneError('Enter a valid phone number.');
      hasError = true;
    }

    if (!hasError) {
      checkUserMutation.mutate(normalizedPhone);
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
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader title="Create account" onBack={() => router.back()} accentColor={accentColor} />
            <AuthProgress currentStep={1} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              eyebrow={isWorker ? 'Specialist profile' : 'Client profile'}
              title="Start your"
              highlight="journey"
              description="Tell us the basics first. We will verify your email before setting up your profile."
            />

            <GlassCard
              intensity={25}
              padding={Spacing.l}
              style={styles.formCard}
              gradient={[`${accentColor}16`, 'rgba(191,90,242,0.06)']}
            >
              <InputField
                accentColor={accentColor}
                autoComplete="name"
                error={nameError}
                icon={<User size={18} color={accentColor} />}
                label="Full name"
                onChangeText={(value) => {
                  setFullName(value);
                  if (nameError) setNameError('');
                }}
                placeholder="Your full name"
                value={fullName}
              />
              <InputField
                accentColor={accentColor}
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
                icon={<Mail size={18} color={accentColor} />}
                keyboardType="email-address"
                label="Email address"
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError('');
                }}
                placeholder="name@example.com"
                value={email}
              />
              <InputField
                accentColor={accentColor}
                autoComplete="tel"
                error={phoneError}
                icon={<Phone size={18} color={accentColor} />}
                keyboardType="phone-pad"
                label="Phone number"
                onChangeText={(value) => {
                  setPhoneNumber(value);
                  if (phoneError) setPhoneError('');
                }}
                placeholder="+92 300 0000000"
                value={phoneNumber}
              />

              <AnimatedButton
                isLoading={checkUserMutation.isPending}
                onPress={handleNext}
                style={styles.submitButton}
                title="Continue to verification"
                variant={isWorker ? 'orange' : 'cyan'}
              />
            </GlassCard>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(auth)/login' as never,
                  params: { role },
                })}
              >
                <Text style={[styles.footerLink, { color: accentColor }]}> Sign in</Text>
              </TouchableOpacity>
            </View>

            <SecurityNote accentColor={accentColor} />
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
  formCard: {
    borderRadius: BorderRadius.xxl,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  submitButton: {
    marginTop: Spacing.s,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 13,
    fontWeight: '600',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});

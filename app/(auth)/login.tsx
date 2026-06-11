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
import { Eye, EyeOff, Lock, Mail, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AnimatedButton } from '../../components/AnimatedButton';
import { InputField } from '../../components/InputField';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { SecurityNote } from '../../components/auth/SecurityNote';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { BASE_URL } from '../../constants/Config';
import { BorderRadius, Colors, Spacing } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role: urlRole } = useLocalSearchParams<{ role?: string }>();
  const { setAuth } = useAuth();
  const isWorker = urlRole === 'worker';
  const accentColor = isWorker ? Colors.worker : Colors.cyan;
  const roleLabel = isWorker ? 'specialist' : 'client';

  const [loginType, setLoginType] = useState<'phone' | 'email'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleTabChange = (type: 'phone' | 'email') => {
    if (type === loginType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoginType(type);
    setIdentifier('');
    setIdentifierError('');
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      const normalizedIdentifier = identifier.trim();
      const payload = loginType === 'email'
        ? { email: normalizedIdentifier.toLowerCase(), password }
        : { phone: normalizedIdentifier, password };
      const endpoint = isWorker ? '/api/v1/workers/login' : '/api/v1/users/login';
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      const responseData = data.data || data;
      const token = responseData.token;
      const refreshToken = responseData.refreshToken;
      const user = responseData.user || responseData.worker;
      const finalRole = (urlRole || user?.role || 'client') as 'client' | 'worker';

      if (!token || !refreshToken || !user) {
        Alert.alert('Login error', 'The server returned an incomplete response. Please try again.');
        return;
      }

      await setAuth(token, refreshToken, finalRole, user);
      router.replace('/(tabs)' as never);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Unable to sign in', error.message);
    },
  });

  const handleLogin = () => {
    const normalizedIdentifier = identifier.trim();
    setIdentifierError('');
    setPasswordError('');

    if (!normalizedIdentifier) {
      setIdentifierError(`Enter your ${loginType === 'email' ? 'email address' : 'phone number'}.`);
      return;
    }
    if (loginType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      setIdentifierError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setPasswordError('Enter your password.');
      return;
    }

    loginMutation.mutate();
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
            <AuthHeader title={t('auth.secureSignIn')} onBack={() => router.back()} accentColor={accentColor} />
            <AuthHero
              accentColor={accentColor}
              eyebrow={isWorker ? t('roleSelection.worker.label') : t('roleSelection.client.label')}
              title={t('home.client.welcomeBack')}
              highlight=""
              description={isWorker ? t('auth.workerDesc') : t('auth.clientDesc')}
            />

            <GlassCard
              intensity={25}
              padding={Spacing.l}
              style={styles.loginCard}
              gradient={[`${accentColor}16`, 'rgba(191,90,242,0.06)']}
            >
              <View style={styles.tabContainer}>
                <LoginTab
                  active={loginType === 'email'}
                  accentColor={accentColor}
                  icon={<Mail size={15} color={loginType === 'email' ? accentColor : Colors.textDim} />}
                  label="Email"
                  onPress={() => handleTabChange('email')}
                />
                <LoginTab
                  active={loginType === 'phone'}
                  accentColor={accentColor}
                  icon={<Phone size={15} color={loginType === 'phone' ? accentColor : Colors.textDim} />}
                  label="Phone"
                  onPress={() => handleTabChange('phone')}
                />
              </View>

              <InputField
                accentColor={accentColor}
                autoCapitalize="none"
                autoComplete={loginType === 'email' ? 'email' : 'tel'}
                error={identifierError}
                icon={loginType === 'email'
                  ? <Mail size={18} color={accentColor} />
                  : <Phone size={18} color={accentColor} />}
                keyboardType={loginType === 'email' ? 'email-address' : 'phone-pad'}
                label={loginType === 'email' ? t('auth.email') : t('auth.phone')}
                onChangeText={(value) => {
                  setIdentifier(value);
                  if (identifierError) setIdentifierError('');
                }}
                placeholder={loginType === 'email' ? 'name@example.com' : '+92 300 0000000'}
                value={identifier}
              />

              <InputField
                accentColor={accentColor}
                autoCapitalize="none"
                autoComplete="password"
                error={passwordError}
                icon={<Lock size={18} color={accentColor} />}
                label={t('auth.password')}
                onChangeText={(value) => {
                  setPassword(value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••"
                rightIcon={
                  <TouchableOpacity
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={8}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword
                      ? <EyeOff size={18} color={Colors.textMuted} />
                      : <Eye size={18} color={Colors.textMuted} />}
                  </TouchableOpacity>
                }
                secureTextEntry={!showPassword}
                value={password}
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(auth)/forgot-password' as never,
                  params: { role: urlRole },
                })}
                style={styles.forgotButton}
              >
                <Text style={[styles.forgotText, { color: accentColor }]}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>

              <AnimatedButton
                isLoading={loginMutation.isPending}
                onPress={handleLogin}
                style={styles.submitButton}
                title={t('auth.signInButton')}
                variant={isWorker ? 'orange' : 'cyan'}
              />
            </GlassCard>

            {/* Google Sign-In — clients only */}
            {!isWorker && (
              <GoogleSignInButton accentColor={accentColor} />
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(auth)/signup' as never,
                  params: { role: urlRole },
                })}
              >
                <Text style={[styles.footerLink, { color: accentColor }]}> {t('auth.signUp')}</Text>
              </TouchableOpacity>
            </View>

            <SecurityNote accentColor={accentColor} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

interface LoginTabProps {
  accentColor: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function LoginTab({ accentColor, active, icon, label, onPress }: LoginTabProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.tabButton,
        active && {
          backgroundColor: `${accentColor}16`,
          borderColor: `${accentColor}48`,
        },
      ]}
    >
      {icon}
      <Text style={[styles.tabText, active && { color: '#fff' }]}>{label}</Text>
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
  loginCard: {
    borderRadius: BorderRadius.xxl,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: Spacing.s,
    padding: 4,
    marginBottom: Spacing.l,
    borderRadius: BorderRadius.l,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: BorderRadius.m,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    color: Colors.textDim,
    fontSize: 12,
    fontWeight: '800',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: Spacing.l,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '800',
  },
  submitButton: {
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

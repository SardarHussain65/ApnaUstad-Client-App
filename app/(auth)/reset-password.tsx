import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Alert,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Eye, EyeOff, Lock, ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Shadows } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import * as Haptics from 'expo-haptics';
import { OtpInput } from 'react-native-otp-entry';

const { width } = Dimensions.get('window');

import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email, role } = useLocalSearchParams<{ email: string; role: string }>();

  // 🎨 Dynamic accent color based on role
  const accentColor = role === 'worker' ? Colors.worker : Colors.cyan;

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${BASE_URL}/api/v1/otp/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otp.trim(),
          newPassword: newPassword,
          type: role || 'user'
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Verification or password update failed');
      }
      return data;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Success',
        'Your access key has been successfully re-established. Please log in with your new password.',
        [
          {
            text: 'LOGIN',
            onPress: () => {
              router.replace({
                pathname: '/(auth)/login',
                params: { role }
              });
            }
          }
        ]
      );
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Reset Failed', error.message || 'Invalid verification code or update failed.');
    }
  });

  const handleResetPassword = () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'All access key fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Your new password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'The passwords entered do not match.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetMutation.mutate();
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, Typography.threeD]}>SECURE RESET</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={[styles.title, Typography.threeD]}>NEW {'\n'}<Text style={[styles.brandText, { color: accentColor }]}>PASSWORD</Text></Text>
              <Text style={styles.subtitle}>CODE TRANSMITTED TO {'\n'}<Text style={styles.emailLink}>{email}</Text></Text>
            </View>

            {/* Segmented OTP Input */}
            <View style={styles.otpWrapper}>
              <Text style={styles.label}>6-DIGIT VERIFICATION CODE</Text>
              <OtpInput
                numberOfDigits={6}
                focusColor={accentColor}
                focusStickBlinkingDuration={500}
                onTextChange={(text) => {
                  setOtp(text);
                  if (text.length > 0) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                onFilled={(text) => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                theme={{
                  containerStyle: styles.otpContainer,
                  pinCodeContainerStyle: styles.otpCell,
                  pinCodeTextStyle: styles.otpText,
                  focusStickStyle: { ...styles.focusStick, backgroundColor: accentColor },
                  focusedPinCodeContainerStyle: { ...styles.activeOtpCell, borderColor: accentColor },
                }}
              />
            </View>

            {/* Password Form */}
            <GlassCard intensity={25} style={styles.formCard}>
              <View style={styles.form}>
                <View style={styles.inputSection}>
                  <Text style={styles.label}>NEW ACCESS KEY</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <Lock size={18} color={accentColor} />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                      {showNewPassword ? <EyeOff size={18} color="rgba(255,255,255,0.5)" /> : <Eye size={18} color="rgba(255,255,255,0.5)" />}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.inputSection, { marginTop: 20 }]}>
                  <Text style={styles.label}>CONFIRM NEW ACCESS KEY</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <Lock size={18} color={accentColor} />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                      {showConfirmPassword ? <EyeOff size={18} color="rgba(255,255,255,0.5)" /> : <Eye size={18} color="rgba(255,255,255,0.5)" />}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.resetBtn, { backgroundColor: accentColor }, resetMutation.isPending && { opacity: 0.7 }]} 
                  onPress={handleResetPassword}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Text style={styles.resetBtnText}>UPDATE ACCESS KEY</Text>
                      <ChevronRight size={20} color="#000" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </GlassCard>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
  },
  hero: {
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 46,
    letterSpacing: -1,
  },
  brandText: {
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 1,
  },
  emailLink: {
    color: '#fff',
    fontWeight: '900',
  },
  otpWrapper: {
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpCell: {
    width: (width - 48 - 50) / 6,
    height: 65,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeOtpCell: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  otpText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  focusStick: {
    width: 2,
    height: 30,
  },
  formCard: {
    padding: 24,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  form: {
    flex: 1,
  },
  inputSection: {
    marginBottom: 0,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 4,
  },
  resetBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 40,
    ...Shadows.glow,
  },
  resetBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 8,
  },
});

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
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Mail, ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Shadows } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import * as Haptics from 'expo-haptics';

import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();

  // 🎨 Dynamic accent color based on role
  const accentColor = role === 'worker' ? Colors.worker : Colors.cyan;

  const [email, setEmail] = useState('');

  const sendOtpMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await fetch(`${BASE_URL}/api/v1/otp/forgot-password/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: emailAddress.trim().toLowerCase(),
          type: role || 'user'
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      return data;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Code Transmitted',
        'A 6-digit recovery code has been dispatched to your email address.',
        [
          {
            text: 'CONTINUE',
            onPress: () => {
              router.push({
                pathname: '/(auth)/reset-password' as any,
                params: {
                  email: email.trim().toLowerCase(),
                  role
                }
              });
            }
          }
        ]
      );
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Transmission Failed', error.message || 'Could not verify email. Please try again.');
    }
  });

  const handleSendCode = () => {
    if (!email) {
      Alert.alert('Missing Field', 'Please enter your registered email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendOtpMutation.mutate(email);
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, Typography.threeD]}>RECOVERY</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={[styles.title, Typography.threeD]}>PASSWORD {'\n'}<Text style={[styles.brandText, { color: accentColor }]}>RESET</Text></Text>
              <Text style={styles.subtitle}>INITIATING SECURE ACCESS KEY RECOVERY</Text>
            </View>

            {/* Glass Form */}
            <GlassCard intensity={25} style={styles.recoveryCard}>
              <View style={styles.form}>
                <View style={styles.inputSection}>
                  <Text style={styles.label}>REGISTERED EMAIL</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <Mail size={18} color={accentColor} />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="address@system.com"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: accentColor }, sendOtpMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleSendCode}
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Text style={styles.sendBtnText}>SEND RECOVERY CODE</Text>
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
    marginTop: 20,
    marginBottom: 40,
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
  recoveryCard: {
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
  sendBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 40,
    ...Shadows.glow,
  },
  sendBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 8,
  },
});

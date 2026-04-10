import React, { useState, useEffect } from 'react';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { ChevronLeft, User, Mail, Phone, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import { auth } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';

export default function SignupStep1() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();

  // 🎨 Dynamic accent color based on role
  const accentColor = role === 'worker' ? Colors.worker : Colors.cyan;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Animation values
  const progressAnim = useSharedValue(0.33); // Step 1 = 33%

  useEffect(() => {
    progressAnim.value = withSpring(0.33, { damping: 20 });
  }, []);

  const checkUserMutation = useMutation({
    mutationFn: async (phone: string) => {
      const endpoint = role === 'worker' ? '/api/v1/workers/check-worker' : '/api/v1/users/check-user';
      const response = await fetch(`${BASE_URL}${endpoint}?phone=${encodeURIComponent(phone)}`);
      if (!response.ok) {
        if (response.status === 404) return { data: { exists: false } };
        throw new Error(`Failed to check ${role === 'worker' ? 'worker' : 'user'} availability`);
      }
      return response.json();
    },
    onSuccess: async (data, variables) => {
      if (data.data.exists) {
        Alert.alert('Account Exists', `This phone number is already registered as a ${role === 'worker' ? 'worker' : 'client'}.`);
      } else {
        try {
          const cleanPhone = variables.replace(/\D/g, '');
          const phoneNumberWithCode = variables.startsWith('+')
            ? variables
            : `+92${cleanPhone.startsWith('92') ? cleanPhone.slice(2) : cleanPhone.replace(/^0+/, '')}`;

          const confirmationResult = await auth().signInWithPhoneNumber(phoneNumberWithCode);

          router.push({
            pathname: '/(auth)/verify',
            params: {
              fullName,
              email,
              phone: variables,
              verificationId: confirmationResult.verificationId,
              role
            }
          });
        } catch (error: any) {
          Alert.alert('OTP Error', error.message || 'Failed to send verification code.');
        }
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    }
  });

  const handleNext = () => {
    if (!fullName || !phoneNumber || !email) {
      Alert.alert('Missing Fields', 'All fields are required.');
      return;
    }
    checkUserMutation.mutate(phoneNumber);
  };

  const animatedProgressBar = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

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
              <Text style={[styles.headerTitle, Typography.threeD]}>INITIALIZE</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Premium Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View style={[styles.progressActive, animatedProgressBar, { backgroundColor: accentColor }]} />
              </View>
              <View style={styles.stepsRow}>
                <Text style={[styles.stepLabel, { color: accentColor }]}>PHASE 01</Text>
                <Text style={styles.stepLabel}>PHASE 02</Text>
                <Text style={styles.stepLabel}>FINAL</Text>
              </View>
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={[styles.title, Typography.threeD]}>CREATE {'\n'}<Text style={[styles.brandText, { color: accentColor }]}>PROFILE</Text></Text>
              <Text style={styles.subtitle}>ESTABLISHING YOUR UNIQUE IDENTITY LINK</Text>
            </View>

            <GlassCard intensity={25} style={styles.signupCard}>
              <View style={styles.form}>
                <View style={styles.inputSection}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}><User size={18} color={accentColor} /></View>
                    <TextInput
                      style={styles.input}
                      placeholder="ENTER NAME"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                <View style={[styles.inputSection, { marginTop: 20 }]}>
                  <Text style={styles.label}>QUANTUM MAIL</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}><Mail size={18} color={accentColor} /></View>
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

                <View style={[styles.inputSection, { marginTop: 20 }]}>
                  <Text style={styles.label}>COMM LINK (PHONE)</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}><Phone size={18} color={accentColor} /></View>
                    <Text style={styles.countryCode}>+92</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="300 0000000"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: accentColor }, checkUserMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleNext}
                  disabled={checkUserMutation.isPending}
                >
                  {checkUserMutation.isPending ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Text style={styles.nextBtnText}>NEXT PHASE</Text>
                      <ChevronRight size={20} color="#000" />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    ALREADY REGISTERED? <Text style={[styles.link, { color: accentColor }]} onPress={() => router.push({ pathname: '/(auth)/login', params: { role } })}>AUTHORIZE LOGIN</Text>
                  </Text>
                </View>
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
  progressContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressActive: {
    height: '100%',
    borderRadius: 2,
    ...Shadows.glow,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  hero: {
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
  signupCard: {
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
  countryCode: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  nextBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 40,
    ...Shadows.glow,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 8,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  link: {
    fontWeight: '900',
  },
});

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
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import { auth } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function SignupStep1() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();

  // 🎨 Dynamic accent color based on role
  const accentColor = role === 'worker' ? Colors.orange : Colors.cyan;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [secondaryNumber, setSecondaryNumber] = useState('');

  // Animation values
  const entranceAnim = useSharedValue(0);
  const progressAnim = useSharedValue(0.33); // Step 1 = 33%

  useEffect(() => {
    entranceAnim.value = withDelay(100, withSpring(1, { damping: 15 }));
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
              secondaryPhone: secondaryNumber,
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
      Alert.alert('Missing Fields', 'All fields except Secondary Number are required.');
      return;
    }
    checkUserMutation.mutate(phoneNumber);
  };

  const animatedHero = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: interpolate(entranceAnim.value, [0, 1], [30, 0]) }]
  }));

  const animatedForm = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: interpolate(entranceAnim.value, [0, 1], [50, 0]) }]
  }));

  const animatedProgressBar = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Animated.View style={[styles.header, animatedHero]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sign Up</Text>
            <View style={{ width: 44 }} />
          </Animated.View>

          {/* Premium Progress Bar */}
          <Animated.View style={[styles.progressContainer, animatedHero]}>
            <View style={styles.progressBackground}>
              <Animated.View style={[styles.progressActive, animatedProgressBar, { backgroundColor: accentColor, shadowColor: accentColor }]} />
            </View>
            <View style={styles.stepsRow}>
              <Text style={[styles.stepLabel, { color: accentColor }]}>Basic Info</Text>
              <Text style={styles.stepLabel}>OTP</Text>
              <Text style={styles.stepLabel}>Finalize</Text>
            </View>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View style={[styles.hero, animatedHero]}>
            <Text style={styles.title}>Let's Get{'\n'}<Text style={[styles.brandText, { color: accentColor }]}>Started</Text></Text>
            <Text style={styles.subtitle}>Step 1: Fill in your basic information.</Text>
          </Animated.View>

          <Animated.View style={[styles.form, animatedForm]}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}><User size={20} color={accentColor} /></View>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textDim}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}><Mail size={20} color={accentColor} /></View>
              <TextInput
                style={styles.input}
                placeholder="ustad@example.com"
                placeholderTextColor={Colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}><Phone size={20} color={accentColor} /></View>
              <Text style={styles.countryCode}>+92</Text>
              <TextInput
                style={styles.input}
                placeholder="300 0000000"
                placeholderTextColor={Colors.textDim}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>


            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: accentColor, shadowColor: accentColor }, checkUserMutation.isPending && { opacity: 0.7 }]}
              onPress={handleNext}
              disabled={checkUserMutation.isPending}
            >
              {checkUserMutation.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Next Step</Text>
                  <ChevronRight size={20} color="#000" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={[styles.link, { color: accentColor }]} onPress={() => router.push({ pathname: '/(auth)/login', params: { role } })}>Sign In</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 32,
  },
  progressBackground: {
    height: 6,
    backgroundColor: Colors.card,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressActive: {
    height: '100%',
    backgroundColor: Colors.cyan,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDim,
  },
  stepLabelActive: {
    color: Colors.cyan,
  },
  hero: {
    marginBottom: 32,
  },
  title: {
    ...Typography.h1,
    lineHeight: 40,
    fontSize: 32,
    marginBottom: 8,
  },
  brandText: {
    color: Colors.cyan,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 16,
    color: Colors.textMuted,
  },
  form: {
    flex: 1,
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.m,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  nextBtn: {
    backgroundColor: Colors.cyan,
    borderRadius: BorderRadius.m,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 40,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    marginBottom: 40,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textDim,
  },
  link: {
    color: Colors.cyan,
    fontWeight: '700',
  },
});

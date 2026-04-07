import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Theme';
import { auth } from '../../firebaseConfig';

import { BASE_URL } from '../../constants/Config';

export default function SignupScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');

  const checkUserMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await fetch(`${BASE_URL}/api/v1/users/check-user?phone=${encodeURIComponent(phone)}`);
      if (!response.ok) {
        if (response.status === 404) return { exists: false };
        throw new Error('Failed to check user');
      }
      return response.json();
    },
    onSuccess: async (data, variables) => {
      if (data.exists) {
        Alert.alert('Account Exists', 'This phone number is already registered. Please login instead.');
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
              phone: variables,
              verificationId: confirmationResult.verificationId
            }
          });
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to trigger OTP. Please check your network.');
        }
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  });

  const googleAuthMutation = useMutation({
    mutationFn: async (idToken: string) => {
      const response = await fetch(`${BASE_URL}/api/v1/users/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (!response.ok) throw new Error('Backend verification failed');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.data.exists) {
        Alert.alert('Success', 'Logged in successfully');
        router.replace('/');
      } else {
        router.push({
          pathname: '/(auth)/register-details',
          params: {
            email: data.data.googleData.email,
            fullName: data.data.googleData.fullName,
            profileImage: data.data.googleData.profileImage,
            isGoogle: 'true'
          }
        });
      }
    },
    onError: (error: any) => {
      Alert.alert('Google Auth Error', error.message);
    }
  });

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      if (data?.idToken) {
        const credential = auth.GoogleAuthProvider.credential(data.idToken);
        const userCredential = await auth().signInWithCredential(credential);
        const firebaseToken = await userCredential.user.getIdToken();
        googleAuthMutation.mutate(firebaseToken);
      }
    } catch (error: any) {
      Alert.alert('Google Sign-In Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.accentCircle} />
            <Text style={styles.title}>Welcome to{'\n'}<Text style={styles.brandText}>ApnaUstad</Text></Text>
            <Text style={styles.subtitle}>Find the best experts for any task. Get started with your phone number.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.countryCode}>+92</Text>
              <TextInput
                style={styles.input}
                placeholder="300 0000000"
                placeholderTextColor={Colors.textDim}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                selectionColor={Colors.cyan}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.cyan }]}
              onPress={() => phoneNumber && checkUserMutation.mutate(phoneNumber)}
              disabled={checkUserMutation.isPending}
              activeOpacity={0.8}
            >
              {checkUserMutation.isPending ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.buttonText}>Get Started</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={googleAuthMutation.isPending}
              activeOpacity={0.7}
            >
              <View style={styles.googleIconPlaceholder} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing you agree to our <Text style={styles.link}>Terms</Text> and <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </View>
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
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.xl,
  },
  hero: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  accentCircle: {
    position: 'absolute',
    top: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.cyan,
    opacity: 0.15,
    filter: Platform.OS === 'ios' ? 'blur(30px)' : undefined,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.s,
    lineHeight: 40,
  },
  brandText: {
    color: Colors.cyan,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.l,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.s,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.m,
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.l,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryCode: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
    marginRight: Spacing.s,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 20,
    borderRadius: BorderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.l,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.m,
    color: Colors.textDim,
    fontSize: 12,
    fontWeight: '800',
  },
  googleButton: {
    backgroundColor: Colors.inputBackground,
    paddingVertical: 18,
    borderRadius: BorderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleIconPlaceholder: {
    width: 20,
    height: 20,
    backgroundColor: Colors.textDim,
    borderRadius: 4,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  footerText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  link: {
    color: Colors.cyan,
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../../firebaseConfig'; 

const BASE_URL = 'http://192.168.18.103:5000'; // Make sure your backend API is running locally and bound to 0.0.0.0

export default function SignupScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');

  const checkUserMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await fetch(`${BASE_URL}/api/v1/users/check-user?phone=${encodeURIComponent(phone)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return { exists: false };
        }
        throw new Error('Failed to check user');
      }
      return response.json();
    },
    onSuccess: async (data, variables) => {
      if (data.exists) {
        Alert.alert('Account Exists', 'This phone number is already registered. Please login instead.');
      } else {
        // Trigger Native Firebase OTP
        try {
          // Format phone number to E.164 (e.g. +923001234567)
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
        Alert.alert('Success', 'Logged in with Google');
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
        // 1. Create a Firebase credential from the Google ID token
        const credential = auth.GoogleAuthProvider.credential(data.idToken);
        
        // 2. Sign in to Firebase with the credential
        const userCredential = await auth().signInWithCredential(credential);
        
        // 3. Get the *Firebase* ID token from the user
        const firebaseToken = await userCredential.user.getIdToken();
        
        // 4. Send the Firebase token to your backend
        googleAuthMutation.mutate(firebaseToken);
      }
    } catch (error: any) {
      Alert.alert('Google Sign-In Error', error.message);
    }
  };

  const handleContinue = () => {
    if (!phoneNumber) {
      Alert.alert('Hold on', 'Please enter your phone number.');
      return;
    }
    checkUserMutation.mutate(phoneNumber);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Join ApnaUstad</Text>
        <Text style={styles.subtitle}>Enter your phone number to proceed</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g. +923001234567"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          disabled={checkUserMutation.isPending}
          activeOpacity={0.8}
        >
          {checkUserMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
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
        >
          {googleAuthMutation.isPending ? (
            <ActivityIndicator color="#1F2937" />
          ) : (
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC', // Very light cool grey for a fresh look
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 32,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  input: {
    padding: 18,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#3B82F6', // Beautiful, modern blue
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
});

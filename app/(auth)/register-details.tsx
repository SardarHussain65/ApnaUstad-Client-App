import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

const BASE_URL = 'http://192.168.18.103:5000'; // Update this to your local IP for mobile dev

export default function RegisterDetailsScreen() {
  const router = useRouter();
  const { phone: otpPhone, idToken, email: googleEmail, fullName: googleName, profileImage, isGoogle } = useLocalSearchParams<{ 
    phone?: string, 
    idToken?: string, 
    email?: string, 
    fullName?: string, 
    profileImage?: string,
    isGoogle?: string
  }>();
  
  const [name, setName] = useState(googleName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch(`${BASE_URL}/api/v1/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      Alert.alert('Success', 'Account created successfully!');
      router.replace('/');
    },
    onError: (error: any) => {
      Alert.alert('Registration Error', error.message);
    }
  });

  const handleRegister = () => {
    const finalPhone = isGoogle === 'true' ? phoneNumber : otpPhone;
    const finalEmail = isGoogle === 'true' ? googleEmail : ''; // Standard OTP flow could collect email later
    
    if (!name || !password || (isGoogle === 'true' && !phoneNumber)) {
      Alert.alert('Required Fields', 'Please fill in all fields.');
      return;
    }
    
    registerMutation.mutate({
      phone: finalPhone,
      fullName: name,
      email: finalEmail,
      password: password,
      profileImage: profileImage || "",
      idToken: idToken || ""
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Profile</Text>
        <Text style={styles.subtitle}>Just a few more details to get started.</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#888"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
        </View>

        {isGoogle === 'true' && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Phone Number (e.g. +92...)"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Create Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegister}
          disabled={registerMutation.isPending}
          activeOpacity={0.8}
        >
          {registerMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Finalize Registration</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC', 
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
    marginBottom: 16,
  },
  input: {
    padding: 18,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#3B82F6', 
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

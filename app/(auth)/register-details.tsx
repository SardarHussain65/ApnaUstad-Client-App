import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Theme';

import { BASE_URL } from '../../constants/Config';

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
      Alert.alert('Success', 'Profile completed! Welcome to ApnaUstad.');
      router.replace('/');
    },
    onError: (error: any) => {
      Alert.alert('Registration Error', error.message);
    }
  });

  const handleRegister = () => {
    const finalPhone = isGoogle === 'true' ? phoneNumber : otpPhone;
    const finalEmail = isGoogle === 'true' ? googleEmail : '';

    if (!name || !password || (isGoogle === 'true' && !phoneNumber)) {
      Alert.alert('Details Missing', 'Please fill in all required fields to proceed.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <Text style={styles.title}>Complete{'\n'}<Text style={styles.accentText}>Profile</Text></Text>
            <Text style={styles.subtitle}>Help us get to know you better. These details will be shown on your profile.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                selectionColor={Colors.cyan}
              />
            </View>

            {isGoogle === 'true' && (
              <>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="+92 300 1234567"
                    placeholderTextColor={Colors.textDim}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    selectionColor={Colors.cyan}
                  />
                </View>
              </>
            )}

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textDim}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                selectionColor={Colors.cyan}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.cyan }]}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
              activeOpacity={0.8}
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.buttonText}>Finalize Setup</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              You can change these details later in your <Text style={styles.link}>Profile Settings</Text>.
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
  backButton: {
    marginTop: Spacing.m,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.text,
    marginTop: -4,
  },
  hero: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.s,
    lineHeight: 44,
  },
  accentText: {
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
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.m,
    marginBottom: Spacing.l,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    padding: 18,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  button: {
    marginTop: Spacing.s,
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
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textDim,
  },
  link: {
    color: Colors.cyan,
    fontWeight: '600',
  },
});

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Theme';
import { auth } from '../../firebaseConfig';

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, verificationId } = useLocalSearchParams<{ phone: string, verificationId: string }>();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }
    setIsVerifying(true);

    try {
      if (!verificationId) {
        Alert.alert('Error', 'Verification token missing. Please try signing up again.');
        return;
      }

      // @ts-ignore
      const credential = auth.PhoneAuthProvider.credential(verificationId, code);
      const result = await auth().signInWithCredential(credential);
      const idToken = await result.user.getIdToken();

      router.push({
        pathname: '/(auth)/register-details',
        params: {
          phone: phone || '',
          idToken: idToken || ''
        }
      });

    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
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
            <Text style={styles.title}>Confirm{'\n'}<Text style={styles.accentText}>Identity</Text></Text>
            <Text style={styles.subtitle}>Enter the 6-digit verification code we just sent to your phone <Text style={styles.phoneHighlight}>{phone}</Text></Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Verification Code</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor={Colors.textDim}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                selectionColor={Colors.cyan}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.cyan }]}
              onPress={handleVerify}
              disabled={isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendContainer} activeOpacity={0.6}>
              <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend Code</Text></Text>
            </TouchableOpacity>
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
    lineHeight: 40,
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
  phoneHighlight: {
    color: Colors.text,
    fontWeight: '700',
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
    textAlign: 'center',
  },
  inputWrapper: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.m,
    marginBottom: Spacing.l,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    paddingVertical: 24,
    fontSize: 32,
    color: Colors.text,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
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
  resendContainer: {
    marginTop: Spacing.l,
    alignItems: 'center',
  },
  resendText: {
    color: Colors.textDim,
    fontSize: 14,
    fontWeight: '500',
  },
  resendLink: {
    color: Colors.cyan,
    fontWeight: '700',
  }
});

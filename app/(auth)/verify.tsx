import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
      
      // Using native PhoneAuthProvider to create credential
      // @ts-ignore: Accessing PhoneAuthProvider on native auth instance
      const credential = auth.PhoneAuthProvider.credential(verificationId, code);
      
      // Sign in with the credential using the native auth instance
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
      <View style={styles.content}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {phone}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleVerify}
          disabled={isVerifying}
          activeOpacity={0.8}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend</Text></Text>
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
    marginBottom: 24,
  },
  input: {
    padding: 18,
    fontSize: 24,
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600'
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
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  resendContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: '#6B7280',
    fontSize: 15,
  },
  resendLink: {
    color: '#3B82F6',
    fontWeight: '600',
  }
});

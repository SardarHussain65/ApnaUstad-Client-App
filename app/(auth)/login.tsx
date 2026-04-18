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
  interpolate,
} from 'react-native-reanimated';
import { ChevronLeft, Eye, EyeOff, Mail, Phone, Lock } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';

import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';

export default function LoginScreen() {
  const router = useRouter();
  const { role: urlRole } = useLocalSearchParams<{ role: string }>();
  const { setRole, setAuth } = useAuth();

  // 🎨 Dynamic accent color based on role
  const accentColor = urlRole === 'worker' ? Colors.worker : Colors.cyan;

  const [loginType, setLoginType] = useState<'phone' | 'email'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleTabChange = (type: 'phone' | 'email') => {
    if (type === loginType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoginType(type);
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      const payload = loginType === 'email' 
        ? { email: identifier, password } 
        : { phone: identifier, password };

      const endpoint = urlRole === 'worker' ? '/api/v1/workers/login' : '/api/v1/users/login';
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Workers return 'worker' key, clients return 'user' key
      const token = data.token || data.data?.token;
      const user = data.user || data.data?.user || data.data?.worker;
      const finalRole = (urlRole || user?.role || 'client') as 'client' | 'worker';
      
      if (token && user) {
        await setAuth(token, finalRole, user);
      } else {
        await setRole(finalRole);
      }

      Alert.alert('Success', 'Logged in successfully!');
      router.replace('/(tabs)' as any);
    },
    onError: (error: any) => {
      Alert.alert('Login Error', error.message);
    }
  });

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, Typography.threeD]}>SECURE ENTRY</Text>
              <View style={{ width: 44 }} />
            </View>

            <Animated.View style={styles.hero}>
              <Text style={[styles.title, Typography.threeD]}>WELCOME {'\n'}BACK</Text>
              <Text style={styles.subtitle}>
                RE-ESTABLISHING CONNECTION AS <Text style={[styles.roleText, { color: accentColor }]}>{urlRole?.toUpperCase() || 'USER'}</Text>
              </Text>
            </Animated.View>

            {/* Glass Login Form */}
            <GlassCard intensity={25} style={styles.loginCard}>
              {/* Tab Selector */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                   style={[styles.tabBtn, loginType === 'phone' && { backgroundColor: accentColor + '30', borderColor: accentColor + '50' }]} 
                   onPress={() => handleTabChange('phone')}
                >
                  <Text style={[styles.tabLabel, loginType === 'phone' && { color: '#fff' }]}>PHONE</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.tabBtn, loginType === 'email' && { backgroundColor: accentColor + '30', borderColor: accentColor + '50' }]} 
                   onPress={() => handleTabChange('email')}
                >
                  <Text style={[styles.tabLabel, loginType === 'email' && { color: '#fff' }]}>EMAIL</Text>
                </TouchableOpacity>
              </View>

              {/* Input Fields */}
              <View style={styles.form}>
                <View style={styles.inputSection}>
                  <Text style={styles.label}>{loginType === 'email' ? 'QUANTUM MAIL' : 'COMM LINK'}</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      {loginType === 'email' 
                        ? <Mail size={18} color={accentColor} /> 
                        : <Phone size={18} color={accentColor} />}
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder={loginType === 'email' ? "address@system.com" : "+92 300 0000000"}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={identifier}
                      onChangeText={setIdentifier}
                      keyboardType={loginType === 'email' ? 'email-address' : 'phone-pad'}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={[styles.inputSection, { marginTop: 20 }]}>
                  <Text style={styles.label}>ACCESS KEY</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <Lock size={18} color={accentColor} />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      {showPassword ? <EyeOff size={18} color="rgba(255,255,255,0.5)" /> : <Eye size={18} color="rgba(255,255,255,0.5)" />}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
                  <Text style={[styles.forgotText, { color: accentColor }]}>FORGOT ACCESS KEY?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.signInBtn, { backgroundColor: accentColor }, loginMutation.isPending && { opacity: 0.7 }]} 
                  onPress={() => loginMutation.mutate()}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <ActivityIndicator color={urlRole === 'worker' ? '#000' : '#000'} />
                  ) : (
                    <Text style={styles.signInBtnText}>AUTHORIZE LOGIN</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    NEW TO THE SYSTEM?{' '}
                    <Text 
                      style={[styles.link, { color: accentColor }]} 
                      onPress={() => router.push({ pathname: '/(auth)/signup', params: { role: urlRole } })}
                    >
                      INITIALIZE ACCOUNT
                    </Text>
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
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 1,
  },
  roleText: {
    fontWeight: '900',
  },
  loginCard: {
    padding: 24,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 15,
    marginBottom: 35,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  signInBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  signInBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
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

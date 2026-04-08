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
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();

  // 🎨 Dynamic accent color based on role
  const accentColor = role === 'worker' ? Colors.orange : Colors.cyan;

  const [loginType, setLoginType] = useState<'phone' | 'email'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const entranceAnim = useSharedValue(0);
  const tabSlide = useSharedValue(1);

  useEffect(() => {
    entranceAnim.value = withDelay(100, withSpring(1, { damping: 15 }));
  }, []);

  const handleTabChange = (type: 'phone' | 'email') => {
    if (type === loginType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoginType(type);
    tabSlide.value = withSpring(type === 'phone' ? 0 : 1, { damping: 20 });
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      const payload = loginType === 'email' 
        ? { email: identifier, password } 
        : { phone: identifier, password };

      const endpoint = role === 'worker' ? '/api/v1/workers/login' : '/api/v1/users/login';
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
    onSuccess: () => {
      Alert.alert('Success', 'Logged in successfully!');
      router.replace('/');
    },
    onError: (error: any) => {
      Alert.alert('Login Error', error.message);
    }
  });

  const animatedHero = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: interpolate(entranceAnim.value, [0, 1], [30, 0]) }]
  }));

  const animatedForm = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: interpolate(entranceAnim.value, [0, 1], [50, 0]) }]
  }));

  const tabIndicator = useAnimatedStyle(() => {
    const tabWidth = (width - 48 - 8) / 2;
    return {
      transform: [{ translateX: tabSlide.value * tabWidth }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Header */}
          <Animated.View style={[styles.header, animatedHero]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sign In</Text>
            <View style={{ width: 44 }} />
          </Animated.View>

          {/* Hero */}
          <Animated.View style={[styles.hero, animatedHero]}>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>
              Sign in as a <Text style={[styles.roleText, { color: accentColor }]}>{role || 'User'}</Text> to continue.
            </Text>
          </Animated.View>

          {/* Animated Tab Control */}
          <Animated.View style={[styles.tabContainer, animatedForm]}>
            <Animated.View style={[styles.tabIndicator, tabIndicator, { backgroundColor: accentColor }]} />
            <TouchableOpacity style={styles.tabBtn} onPress={() => handleTabChange('phone')}>
              <Text style={[styles.tabLabel, loginType === 'phone' && styles.tabLabelActive]}>Phone Number</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => handleTabChange('email')}>
              <Text style={[styles.tabLabel, loginType === 'email' && styles.tabLabelActive]}>Email Address</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Inputs */}
          <Animated.View style={[styles.form, animatedForm]}>
            <Text style={styles.label}>{loginType === 'email' ? 'Email Address' : 'Phone Number'}</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}>
                {loginType === 'email' 
                  ? <Mail size={20} color={accentColor} /> 
                  : <Phone size={20} color={accentColor} />}
              </View>
              <TextInput
                style={styles.input}
                placeholder={loginType === 'email' ? "Enter email address" : "Enter phone number"}
                placeholderTextColor={Colors.textDim}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType={loginType === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Password</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}>
                <Lock size={20} color={accentColor} />
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter password"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={20} color={Colors.textDim} /> : <Eye size={20} color={Colors.textDim} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: accentColor }]}>Forget Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.signInBtn, { backgroundColor: accentColor, shadowColor: accentColor }, loginMutation.isPending && { opacity: 0.7 }]} 
              onPress={() => loginMutation.mutate()}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.signInBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Text 
                  style={[styles.link, { color: accentColor }]} 
                  onPress={() => router.push({ pathname: '/(auth)/signup', params: { role } })}
                >
                  Signup
                </Text>
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
  hero: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    ...Typography.h1,
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 16,
    color: Colors.textMuted,
  },
  roleText: {
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.m,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    width: (width - 48 - 8) / 2,
    borderRadius: BorderRadius.m - 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: '#000',
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
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 32,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signInBtn: {
    borderRadius: BorderRadius.m,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  signInBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
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
    fontWeight: '700',
  },
});

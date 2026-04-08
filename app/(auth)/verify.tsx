import React, { useState, useRef, useEffect } from 'react';
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
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withDelay, 
  withSequence,
  interpolate
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/Theme';
import { auth } from '../../firebaseConfig';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function VerifyScreen() {
  const router = useRouter();
  const { fullName, email, phone, secondaryPhone, verificationId, role } = useLocalSearchParams<{ 
    fullName: string;
    email: string;
    phone: string;
    secondaryPhone: string;
    verificationId: string;
    role: string;
  }>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // 🎨 Dynamic accent color based on role
  const accentColor = role === 'worker' ? Colors.orange : Colors.cyan;

  // Animation values
  const entranceAnim = useSharedValue(0);
  const progressAnim = useSharedValue(0.33); // Start from 33% (Step 1)
  const cellScales = useRef(otp.map(() => useSharedValue(1))).current;

  useEffect(() => {
    entranceAnim.value = withDelay(100, withSpring(1, { damping: 15 }));
    progressAnim.value = withSpring(0.66, { damping: 20 }); // Move to 66% (Step 2)
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value.length === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Animate hit
      cellScales[index].value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 100 }),
        withSpring(1, { damping: 15 })
      );

      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      if (!verificationId) {
        throw new Error('Verification session expired. Please go back and try again.');
      }

      // @ts-ignore
      const credential = auth.PhoneAuthProvider.credential(verificationId, otpString);
      const result = await auth().signInWithCredential(credential);
      const idToken = await result.user.getIdToken();

      router.push({
        pathname: '/(auth)/register-details',
        params: {
          fullName,
          email,
          phone,
          secondaryPhone,
          role,
          idToken
        }
      });
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid code.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
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
            <Text style={styles.headerTitle}>Verification</Text>
            <View style={{ width: 44 }} />
          </Animated.View>

          {/* Premium Progress Bar */}
          <Animated.View style={[styles.progressContainer, animatedHero]}>
            <View style={styles.progressBackground}>
              <Animated.View style={[styles.progressActive, animatedProgressBar, { backgroundColor: accentColor, shadowColor: accentColor }]} />
            </View>
            <View style={styles.stepsRow}>
              <Text style={styles.stepLabel}>Basic Info</Text>
              <Text style={[styles.stepLabel, { color: accentColor }]}>OTP</Text>
              <Text style={styles.stepLabel}>Finalize</Text>
            </View>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View style={[styles.hero, animatedHero]}>
            <Text style={styles.title}>Confirm{'\n'}<Text style={[styles.brandText, { color: accentColor }]}>Identity</Text></Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to your phone{'\n'}<Text style={styles.phoneLink}>{phone}</Text></Text>
          </Animated.View>

          {/* Segmented OTP Input */}
          <Animated.View style={[styles.otpContainer, animatedForm]}>
            {otp.map((digit, index) => {
              const animatedCell = useAnimatedStyle(() => ({
                transform: [{ scale: cellScales[index].value }],
                borderColor: digit ? accentColor : Colors.border,
                shadowOpacity: digit ? 0.3 : 0,
              }));

              return (
                <Animated.View key={index} style={[styles.otpCellWrapper, animatedCell]}>
                  <TextInput
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    selectionColor={accentColor}
                  />
                </Animated.View>
              );
            })}
          </Animated.View>

          <Animated.View style={[styles.actions, animatedForm]}>
            <TouchableOpacity 
              style={[styles.verifyBtn, { backgroundColor: accentColor, shadowColor: accentColor }, isVerifying && { opacity: 0.7 }]} 
              onPress={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <>
                  <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                  <ChevronRight size={20} color="#000" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendBtn} activeOpacity={0.7}>
              <Text style={styles.resendText}>Didn't receive the code? <Text style={[styles.link, { color: accentColor }]}>Resend OTP</Text></Text>
            </TouchableOpacity>
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
    marginBottom: 40,
  },
  title: {
    ...Typography.h1,
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 12,
  },
  brandText: {
    color: Colors.cyan,
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 24,
  },
  phoneLink: {
    color: Colors.text,
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  otpCellWrapper: {
    width: (width - 48 - 50) / 6,
    height: 60,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.m,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  actions: {
    flex: 1,
  },
  verifyBtn: {
    backgroundColor: Colors.cyan,
    borderRadius: BorderRadius.m,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  verifyBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  resendBtn: {
    marginTop: 24,
    alignItems: 'center',
    marginBottom: 40,
  },
  resendText: {
    ...Typography.caption,
    color: Colors.textDim,
  },
  link: {
    color: Colors.cyan,
    fontWeight: '700',
  },
});

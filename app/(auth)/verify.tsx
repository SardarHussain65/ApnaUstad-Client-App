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
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/Theme';
import { auth } from '../../firebaseConfig';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';

export default function VerifyScreen() {
  const router = useRouter();
  const { fullName, email, phone, verificationId, role } = useLocalSearchParams<{ 
    fullName: string;
    email: string;
    phone: string;
    verificationId: string;
    role: string;
  }>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // 🎨 Dynamic accent color based on role
  const accentColor = role === 'worker' ? Colors.worker : Colors.cyan;

  // Animation values
  const progressAnim = useSharedValue(0.33); 
  const cellScales = useRef(otp.map(() => useSharedValue(1))).current;

  useEffect(() => {
    progressAnim.value = withSpring(0.66, { damping: 20 }); 
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

  const animatedProgressBar = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, Typography.threeD]}>VERIFICATION</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Premium Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View style={[styles.progressActive, animatedProgressBar, { backgroundColor: accentColor }]} />
              </View>
              <View style={styles.stepsRow}>
                <Text style={styles.stepLabel}>PHASE 01</Text>
                <Text style={[styles.stepLabel, { color: accentColor }]}>PHASE 02</Text>
                <Text style={styles.stepLabel}>FINAL</Text>
              </View>
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={[styles.title, Typography.threeD]}>CONFIRM {'\n'}<Text style={[styles.brandText, { color: accentColor }]}>IDENTITY</Text></Text>
              <Text style={styles.subtitle}>CODE TRANSMITTED TO {'\n'}<Text style={styles.phoneLink}>{phone}</Text></Text>
            </View>

            {/* Segmented OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => {
                const animatedCell = useAnimatedStyle(() => ({
                  transform: [{ scale: cellScales[index].value }],
                  borderColor: digit ? accentColor : 'rgba(255,255,255,0.1)',
                }));

                return (
                  <Animated.View key={index} style={[styles.otpCellWrapper, animatedCell]}>
                    <GlassCard intensity={digit ? 30 : 10} style={styles.innerCell} padding={0}>
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
                    </GlassCard>
                  </Animated.View>
                );
              })}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.verifyBtn, { backgroundColor: accentColor }, isVerifying && { opacity: 0.7 }]} 
                onPress={handleVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.verifyBtnText}>AUTHORIZE ACCESS</Text>
                    <ChevronRight size={20} color="#000" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} activeOpacity={0.7}>
                <Text style={styles.resendText}>NO CODE RECEIVED? <Text style={[styles.link, { color: accentColor }]}>RE-TRANSMIT</Text></Text>
              </TouchableOpacity>
            </View>
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
  progressContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressActive: {
    height: '100%',
    borderRadius: 2,
    ...Shadows.glow,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  hero: {
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 46,
    letterSpacing: -1,
  },
  brandText: {
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 1,
  },
  phoneLink: {
    color: '#fff',
    fontWeight: '900',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 50,
  },
  otpCellWrapper: {
    width: (width - 48 - 50) / 6,
    height: 65,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  innerCell: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  actions: {
    flex: 1,
  },
  verifyBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Shadows.glow,
  },
  verifyBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 8,
  },
  resendBtn: {
    marginTop: 30,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '900',
    letterSpacing: 1,
  },
  link: {
    fontWeight: '900',
  },
});

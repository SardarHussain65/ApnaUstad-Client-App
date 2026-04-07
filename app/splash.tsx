import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withDelay, 
  withRepeat, 
  withSequence, 
  withSpring, 
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, Animation } from '../constants/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  
  // Animation values
  const logoScale = useSharedValue(0.2);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(30);
  const bgOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const loadingWidth = useSharedValue(0);

  useEffect(() => {
    // 1. Background Fade In
    bgOpacity.value = withTiming(1, { duration: 1200 });

    // 2. Logo Entrance - Pop & Settle (Spring with overshoot)
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 800 }));
    logoScale.value = withDelay(
      200,
      withSpring(1, { 
        damping: 10, 
        stiffness: 70,
        mass: 1,
        overshootClamping: false,
      } as any)
    );

    // 3. Floating Idle Animation (Rhythmic Y-axis movement)
    logoTranslateY.value = withDelay(
      1000,
      withRepeat(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );

    // 4. Tagline Entrance
    taglineOpacity.value = withDelay(1400, withTiming(1, { duration: 1000 }));
    taglineTranslateY.value = withDelay(
      1400,
      withSpring(0, { damping: 15, stiffness: 80 })
    );

    // 5. Pulsing Glow (Subtle support glow)
    glowOpacity.value = withDelay(1200, withTiming(0.4, { duration: 1500 }));
    glowScale.value = withDelay(
      1200,
      withRepeat(
        withTiming(1.3, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // 6. Loading Bar
    loadingWidth.value = withTiming(100, { duration: 3500 });

    // 7. Navigation Logic
    const timeout = setTimeout(async () => {
      // For development, forcing onboarding check
      router.replace('/onboarding');
    }, 4500);

    return () => clearTimeout(timeout);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value }
    ] as any,
    opacity: logoOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const loadingStyle = useAnimatedStyle(() => ({
    width: `${loadingWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <LinearGradient
          colors={[Colors.background, '#0A0A0A', Colors.background] as any}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Pulse Glow Effect (Centered behind logo) */}
      <Animated.View style={[styles.glow, glowStyle]} />

      <View style={styles.contentContainer}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Image 
            source={require('../assets/images/logo_premium.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[styles.taglineContainer, taglineStyle]}>
          <Text style={styles.tagline}>Expert Services at Your Doorstep</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingProgress, loadingStyle]} />
        </View>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: Colors.cyan,
    opacity: 0, // Driven by animation
    filter: 'blur(70px)',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: width * 0.65,
    height: width * 0.65,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    // Removed marginBottom to keep float centered
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  taglineContainer: {
    marginTop: Spacing.m,
  },
  tagline: {
    ...Typography.body,
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: width * 0.7,
  },
  loadingBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.m,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: Colors.cyan,
    borderRadius: 2,
  },
  versionText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 4,
    textTransform: 'uppercase',
  }
});

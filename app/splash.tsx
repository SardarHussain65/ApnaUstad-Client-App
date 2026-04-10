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

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  
  // Animation values
  const logoScale = useSharedValue(0.1);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const loadingWidth = useSharedValue(0);

  useEffect(() => {
    // 1. Logo Entrance - High Impact
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 1000 }));
    logoScale.value = withDelay(
      300,
      withSpring(1, { 
        damping: 12, 
        stiffness: 60,
        mass: 1,
      } as any)
    );

    // 2. Floating Idle 
    logoTranslateY.value = withDelay(
      1500,
      withRepeat(
        withTiming(-12, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );

    // 3. Tagline Entrance
    taglineOpacity.value = withDelay(1600, withTiming(1, { duration: 1200 }));
    taglineTranslateY.value = withDelay(
      1600,
      withSpring(0, { damping: 15, stiffness: 80 })
    );

    // 4. Pulsing Cosmic Glow
    glowOpacity.value = withDelay(800, withTiming(0.6, { duration: 2000 }));
    glowScale.value = withDelay(
      800,
      withRepeat(
        withTiming(1.5, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // 5. Loading Progress
    loadingWidth.value = withTiming(100, { duration: 4000 });

    // 6. Navigation Logic
    const timeout = setTimeout(async () => {
      const onboarded = await AsyncStorage.getItem('onboarding_completed');
      if (onboarded === 'true') {
        router.replace('/role-selection');
      } else {
        router.replace('/onboarding');
      }
    }, 5000);

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

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const loadingStyle = useAnimatedStyle(() => ({
    width: `${loadingWidth.value}%`,
  }));

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* Central Cosmic Glow */}
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
            <Text style={[styles.tagline, Typography.threeD]}>The Service Galaxy</Text>
            <Text style={styles.subtext}>EXPANDING POSSIBILITIES</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBar}>
              <Animated.View style={[styles.loadingProgress, loadingStyle]} />
            </View>
          </View>
          <Text style={styles.versionText}>VER 2.50.0 ALPHA</Text>
        </View>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: (width * 0.5) / 2,
    backgroundColor: Colors.cyan,
    opacity: 0,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 20,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoContainer: {
    width: width * 0.55,
    height: width * 0.55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  taglineContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 9,
    color: Colors.cyan,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    width: width * 0.7,
  },
  loadingContainer: {
    width: '100%',
    padding: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 15,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: Colors.cyan,
    borderRadius: 2,
  },
  versionText: {
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 5,
    fontWeight: '900',
  }
});

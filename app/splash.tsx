import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withDelay, 
  withRepeat, 
  withSpring, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Typography, useTheme, useThemeColors } from '../constants/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  
  // Animation values
  const logoScale = useSharedValue(0.2);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(0);
  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(18);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(14);
  const glowScale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0);
  const loadingWidth = useSharedValue(0);

  useEffect(() => {
    // 1. Logo Entrance - Snappy & High Impact
    logoOpacity.value = withDelay(80, withTiming(1, { duration: 420 }));
    logoScale.value = withDelay(
      80,
      withSpring(1, { 
        damping: 14, 
        stiffness: 95,
        mass: 0.8,
      } as any)
    );

    // 2. Floating Idle 
    logoTranslateY.value = withDelay(
      500,
      withRepeat(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );

    // 3. Brand Text Entrance
    brandOpacity.value = withDelay(250, withTiming(1, { duration: 450 }));
    brandTranslateY.value = withDelay(
      250,
      withSpring(0, { damping: 15, stiffness: 100 })
    );

    // 4. Tagline Entrance
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 450 }));
    taglineTranslateY.value = withDelay(
      400,
      withSpring(0, { damping: 15, stiffness: 100 })
    );

    // 5. Pulsing Glow
    glowOpacity.value = withDelay(150, withTiming(0.65, { duration: 550 }));
    glowScale.value = withDelay(
      150,
      withRepeat(
        withTiming(1.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // 6. Loading Progress (1.3s)
    loadingWidth.value = withTiming(100, { duration: 1300 });

    // 7. Navigation Logic (1.5s transition)
    const timeout = setTimeout(async () => {
      const onboarded = await AsyncStorage.getItem('onboarding_completed');
      if (onboarded === 'true') {
        router.replace('/role-selection');
      } else {
        router.replace('/onboarding');
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value }
    ] as any,
    opacity: logoOpacity.value,
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
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
        {/* Ambient Cosmic Backlight Glow */}
        <Animated.View style={[styles.glowCyan, glowStyle]} />
        <Animated.View style={[styles.glowGold, glowStyle]} />

        <View style={styles.contentContainer}>
          {/* 3D App Icon */}
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <Image 
              source={require('../assets/images/logo_premium.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Welcome & Brand Name */}
          <Animated.View style={[styles.brandContainer, brandStyle]}>
            <Text style={styles.welcomeKicker}>{t('splash.welcome', 'WELCOME TO')}</Text>
            
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitleWhite}>Apna</Text>
              <Text style={styles.brandTitleGold}>Ustad</Text>
            </View>
          </Animated.View>

          {/* Tagline & Expanding Subtext */}
          <Animated.View style={[styles.taglineContainer, taglineStyle]}>
            <Text style={styles.tagline}>{t('splash.tagline', 'Trusted Home Services')}</Text>
            
            <View style={styles.pillBadge}>
              <View style={styles.pillDot} />
              <Text style={styles.subtext}>{t('splash.expanding', 'SKILLED USTADS AT YOUR DOORSTEP')}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Footer with Shimmer Progress Bar */}
        <View style={styles.footer}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBar}>
              <Animated.View style={[styles.loadingProgress, loadingStyle]}>
                <LinearGradient
                  colors={['#06B6D4', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>
          <Text style={styles.versionText}>{t('splash.version', 'APNAUSTAD • VERIFIED SERVICES')}</Text>
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
  glowCyan: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    backgroundColor: '#0EA5E9',
    opacity: 0,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 70,
    elevation: 25,
  },
  glowGold: {
    position: 'absolute',
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: (width * 0.45) / 2,
    backgroundColor: '#F59E0B',
    opacity: 0,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 20,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: width * 0.46,
    height: width * 0.46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandContainer: {
    marginTop: Spacing.l,
    alignItems: 'center',
  },
  welcomeKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4.5,
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleWhite: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  brandTitleGold: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(245, 158, 11, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  taglineContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginTop: 12,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
    marginRight: 6,
  },
  subtext: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: '#38BDF8',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: width * 0.75,
  },
  loadingContainer: {
    width: '100%',
    padding: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginBottom: 12,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  versionText: {
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  }
});

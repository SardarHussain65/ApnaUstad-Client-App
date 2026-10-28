import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Spacing, useTheme, useThemeColors, useThemeTypography } from '../constants/Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();

  const logoScale = useSharedValue(0.82);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(12);
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const loadingWidth = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withDelay(40, withTiming(1, { duration: 420 }));
    logoScale.value = withDelay(
      40,
      withSpring(1, {
        damping: 14,
        stiffness: 90,
      })
    );

    taglineOpacity.value = withDelay(180, withTiming(1, { duration: 420 }));
    taglineTranslateY.value = withDelay(
      180,
      withSpring(0, { damping: 16, stiffness: 100 })
    );

    glowOpacity.value = withDelay(
      80,
      withTiming(theme.id === 'light' ? 0.18 : 0.45, { duration: 500 })
    );
    glowScale.value = withDelay(
      80,
      withRepeat(
        withTiming(1.25, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    loadingWidth.value = withTiming(100, { duration: 1050 });

    const timeout = setTimeout(async () => {
      const onboarded = await AsyncStorage.getItem('onboarding_completed');
      if (onboarded === 'true') {
        router.replace('/role-selection');
      } else {
        router.replace('/onboarding');
      }
    }, 1200);

    return () => clearTimeout(timeout);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
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
        <Animated.View style={[styles.glow, glowStyle, { backgroundColor: colors.cyan, shadowColor: colors.cyan }]} />

        <View style={styles.contentContainer}>
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <Image
              source={require('../assets/images/logo_premium.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={[styles.taglineContainer, taglineStyle]}>
            <Text style={[styles.tagline, typography.threeD, { color: theme.colors.text.primary }]}>
              {t('splash.title', 'ApnaUstad')}
            </Text>
            <Text style={[styles.subtext, { color: colors.cyan }]}>
              {t('splash.subtitle', 'TRUSTED LOCAL USTADS NEAR YOU')}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.loadingContainer,
              {
                borderColor: theme.colors.border.subtle,
                backgroundColor: theme.colors.surface.subtle,
              },
            ]}
          >
            <View style={styles.loadingBar}>
              <Animated.View style={[styles.loadingProgress, loadingStyle, { backgroundColor: colors.cyan }]} />
            </View>
          </View>
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
    width: width * 0.48,
    height: width * 0.48,
    borderRadius: (width * 0.48) / 2,
    opacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 16,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
  taglineContainer: {
    marginTop: Spacing.l,
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 72,
    alignItems: 'center',
    width: width * 0.56,
  },
  loadingContainer: {
    width: '100%',
    padding: 2,
    borderRadius: 10,
    borderWidth: 1,
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
  },
});

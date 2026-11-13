import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { AnimatedButton } from '../components/AnimatedButton';
import {
  OnboardingSlide,
  OnboardingSlideData,
} from '../components/OnboardingSlide';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import {
  alpha,
  BorderRadius,
  getAccessibleColor,
  Spacing,
  useTheme,
  useThemeColors,
} from '../constants/Theme';
import { changeAppLanguage, useIsRTL } from '../i18n';

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isRtl = useIsRTL();
  const { width, height } = useWindowDimensions();

  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isSmallDevice = height < 720;
  const currentLang = i18n.language === 'ur' ? 'ur' : 'en';

  const DATA: OnboardingSlideData[] = [
    {
      id: '1',
      eyebrow: t('onboarding.slide1.eyebrow', 'Trusted Home Services'),
      title: t('onboarding.slide1.title', 'Verified Ustads right when you need them'),
      description: t(
        'onboarding.slide1.description',
        'Book trusted electricians, plumbers, and AC experts in minutes for quick, reliable repairs.'
      ),
      image: require('../assets/images/onboarding1.webp'),
      accent: colors.cyan,
    },
    {
      id: '2',
      eyebrow: t('onboarding.slide2.eyebrow', 'For Skilled Ustads'),
      title: t('onboarding.slide2.title', 'Get local jobs & grow your earnings'),
      description: t(
        'onboarding.slide2.description',
        'Receive instant nearby job alerts, quote your fair price, and keep 100% of what you earn.'
      ),
      image: require('../assets/images/onboarding2.webp'),
      accent: colors.worker,
    },
    {
      id: '3',
      eyebrow: t('onboarding.slide3.eyebrow', 'Fair & Reliable'),
      title: t('onboarding.slide3.title', 'Transparent pricing & peace of mind'),
      description: t(
        'onboarding.slide3.description',
        'Agree on rates upfront, chat or call directly, and pay safely when the job is done.'
      ),
      image: require('../assets/images/onboarding3.webp'),
      accent: colors.success,
    },
  ];

  const currentSlide = DATA[currentIndex] || DATA[0];

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const completeOnboarding = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/theme-language');
  };

  const handleDirectSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/role-selection');
  };

  const handleNext = async () => {
    if (currentIndex < DATA.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({
        animated: true,
        index: nextIndex,
      });
      setCurrentIndex(nextIndex);
      return;
    }
    await completeOnboarding();
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({
        animated: true,
        index: prevIndex,
      });
      setCurrentIndex(prevIndex);
    }
  };

  const handleToggleLanguage = async (targetLang: 'en' | 'ur') => {
    if (currentLang === targetLang) return;
    Haptics.selectionAsync();
    await changeAppLanguage(targetLang);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* HEADER BAR (Simple, elegant, spacious) */}
        <View style={styles.header}>
          {/* Left: Optional Back Arrow + Brand */}
          <View
            style={[
              styles.headerLeft,
              { flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            {currentIndex > 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleBack}
                style={[
                  styles.headerBackButton,
                  {
                    backgroundColor: theme.isDark
                      ? 'rgba(15, 23, 42, 0.7)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderColor: theme.colors.border.default,
                    marginRight: isRtl ? 0 : 8,
                    marginLeft: isRtl ? 8 : 0,
                  },
                ]}
              >
                {isRtl ? (
                  <ChevronRight size={18} color={theme.colors.text.primary} strokeWidth={2.4} />
                ) : (
                  <ChevronLeft size={18} color={theme.colors.text.primary} strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            ) : null}

            <View style={styles.brandBadge}>
              <Image
                source={require('../assets/images/logo_premium.png')}
                style={styles.brandLogo}
              />
              <Text
                style={[
                  styles.brandName,
                  { color: theme.colors.text.primary },
                ]}
              >
                APNAUSTAD
              </Text>
            </View>
          </View>

          {/* Right: Language Pill + Skip */}
          <View
            style={[
              styles.headerRight,
              { flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            {/* Language Switcher */}
            <View
              style={[
                styles.langTogglePill,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(15, 23, 42, 0.75)'
                    : 'rgba(255, 255, 255, 0.9)',
                  borderColor: theme.colors.border.default,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleToggleLanguage('en')}
                style={[
                  styles.langOption,
                  currentLang === 'en' && [
                    styles.langOptionActive,
                    { backgroundColor: alpha(currentSlide.accent, theme.isDark ? 0.3 : 0.16) },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.langText,
                    {
                      color:
                        currentLang === 'en'
                          ? getAccessibleColor(currentSlide.accent, theme.isDark)
                          : theme.colors.text.muted,
                      fontWeight: currentLang === 'en' ? '800' : '600',
                    },
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleToggleLanguage('ur')}
                style={[
                  styles.langOption,
                  currentLang === 'ur' && [
                    styles.langOptionActive,
                    { backgroundColor: alpha(currentSlide.accent, theme.isDark ? 0.3 : 0.16) },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.langText,
                    {
                      color:
                        currentLang === 'ur'
                          ? getAccessibleColor(currentSlide.accent, theme.isDark)
                          : theme.colors.text.muted,
                      fontWeight: currentLang === 'ur' ? '800' : '600',
                    },
                  ]}
                >
                  اردو
                </Text>
              </TouchableOpacity>
            </View>

            {/* Skip Button */}
            {currentIndex < DATA.length - 1 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={completeOnboarding}
                style={[
                  styles.skipButton,
                  {
                    marginLeft: isRtl ? 0 : 8,
                    marginRight: isRtl ? 8 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.skipText,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  {t('onboarding.skip', 'Skip')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SLIDES HORIZONTAL LIST */}
        <Animated.FlatList
          {...({
            data: DATA,
            horizontal: true,
            keyExtractor: (item: any) => item.id,
            onScroll: scrollHandler,
            onViewableItemsChanged,
            pagingEnabled: true,
            ref: flatListRef,
            renderItem: ({ item, index }: any) => (
              <OnboardingSlide item={item} index={index} scrollX={scrollX} />
            ),
            scrollEventThrottle: 16,
            showsHorizontalScrollIndicator: false,
            viewabilityConfig: { itemVisiblePercentThreshold: 50 },
          } as any)}
          style={styles.slides}
        />

        {/* FOOTER CONTROLS */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, isSmallDevice ? 12 : 20),
            },
          ]}
        >
          {/* Pagination Dots */}
          <View
            style={[
              styles.paginationContainer,
              { flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            {DATA.map((item, index) => (
              <PaginationDot
                accentColor={item.accent}
                index={index}
                key={item.id}
                scrollX={scrollX}
                totalWidth={width}
              />
            ))}
          </View>

          {/* Primary CTA Button (Single, Full Width, Prominent) */}
          <AnimatedButton
            onPress={handleNext}
            style={styles.nextButton}
            title={
              currentIndex === DATA.length - 1
                ? t('onboarding.getStarted', 'Get Started')
                : t('onboarding.continue', 'Continue')
            }
            variant={
              currentIndex === 1
                ? 'orange'
                : currentIndex === 2
                ? 'success'
                : 'cyan'
            }
          />

          {/* Direct Sign-In Shortcut */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDirectSignIn}
            style={[
              styles.signInShortcut,
              { flexDirection: isRtl ? 'row-reverse' : 'row' },
            ]}
          >
            <Text
              style={[
                styles.signInShortcutText,
                { color: theme.colors.text.secondary },
              ]}
            >
              {t('onboarding.alreadyHaveAccount', 'Already have an account?')}{' '}
            </Text>
            <Text
              style={[
                styles.signInShortcutHighlight,
                { color: getAccessibleColor(currentSlide.accent, theme.isDark) },
              ]}
            >
              {t('onboarding.signIn', 'Sign In')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

interface PaginationDotProps {
  accentColor: string;
  index: number;
  scrollX: SharedValue<number>;
  totalWidth: number;
}

function PaginationDot({
  accentColor,
  index,
  scrollX,
  totalWidth,
}: PaginationDotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * totalWidth,
      index * totalWidth,
      (index + 1) * totalWidth,
    ];

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 26, 8],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      width: dotWidth,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: accentColor,
          shadowColor: accentColor,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingTop: Platform.OS === 'android' ? Spacing.s : 4,
    paddingBottom: Spacing.xs,
    zIndex: 10,
  },
  headerLeft: {
    alignItems: 'center',
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 26,
    height: 26,
    marginRight: 6,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerRight: {
    alignItems: 'center',
  },
  langTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 2,
  },
  langOption: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
  },
  langOptionActive: {},
  langText: {
    fontSize: 11,
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  skipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  slides: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xs,
    alignItems: 'center',
  },
  paginationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.m,
  },
  dot: {
    height: 7,
    borderRadius: BorderRadius.full,
    marginHorizontal: 3.5,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  nextButton: {
    width: '100%',
  },
  signInShortcut: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  signInShortcutText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  signInShortcutHighlight: {
    fontSize: 12.5,
    fontWeight: '800',
  },
});

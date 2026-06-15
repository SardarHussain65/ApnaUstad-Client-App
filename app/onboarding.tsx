import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import { AnimatedButton } from '../components/AnimatedButton';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../constants/Theme';

import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const DATA = [
    {
      id: '1',
      eyebrow: t('onboarding.slide1.eyebrow'),
      title: t('onboarding.slide1.title'),
      description: t('onboarding.slide1.description'),
      benefit: t('onboarding.slide1.benefit'),
      image: require('../assets/images/onboarding1.png'),
      accent: colors.cyan,
    },
    {
      id: '2',
      eyebrow: t('onboarding.slide2.eyebrow'),
      title: t('onboarding.slide2.title'),
      description: t('onboarding.slide2.description'),
      benefit: t('onboarding.slide2.benefit'),
      image: require('../assets/images/onboarding2.png'),
      accent: colors.worker,
    },
    {
      id: '3',
      eyebrow: t('onboarding.slide3.eyebrow'),
      title: t('onboarding.slide3.title'),
      description: t('onboarding.slide3.description'),
      benefit: t('onboarding.slide3.benefit'),
      image: require('../assets/images/onboarding3.png'),
      accent: colors.success,
    },
  ];

  const currentSlide = DATA[currentIndex];

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/role-selection');
  };

  const handleNext = async () => {
    if (currentIndex < DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ animated: true, index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
      return;
    }
    await completeOnboarding();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require('../assets/images/logo_premium.png')} style={styles.brandLogo} />
            <View>
              <Text style={[styles.brandName, { color: theme.colors.text.primary }]}>APNAUSTAD</Text>
              <Text style={[styles.brandTagline, { color: colors.cyan }]}>SERVICES, MADE SIMPLE</Text>
            </View>
          </View>
          {currentIndex < DATA.length - 1 && (
            <TouchableOpacity activeOpacity={0.7} onPress={completeOnboarding} style={[styles.skipButton, {
              backgroundColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.04 : 0.05),
              borderColor: alpha(theme.colors.text.primary, theme.id === 'light' ? 0.08 : 0.1),
            }]}>
              <Text style={[styles.skipText, { color: theme.colors.text.muted }]}>{t('common.skip')}</Text>
            </TouchableOpacity>
          )}
        </View>

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

        <View style={styles.footer}>
          <View style={styles.paginationRow}>
            <Text style={[styles.slideCount, { color: currentSlide.accent }]}>
              0{currentIndex + 1}
              <Text style={styles.slideTotal}> / 0{DATA.length}</Text>
            </Text>
            <View style={styles.pagination}>
              {DATA.map((item, index) => (
                <PaginationDot
                  accentColor={item.accent}
                  index={index}
                  key={item.id}
                  scrollX={scrollX}
                />
              ))}
            </View>
          </View>

          <AnimatedButton
            icon={<ArrowRight size={18} color={colors.cyan} strokeWidth={2.8} />}
            onPress={handleNext}
            style={styles.nextButton}
            title={currentIndex === DATA.length - 1 ? t('common.getStarted') : t('common.continue')}
            variant="cyan"
          />
        </View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

interface PaginationDotProps {
  accentColor: string;
  index: number;
  scrollX: SharedValue<number>;
}

function PaginationDot({ accentColor, index, scrollX }: PaginationDotProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.25, 1, 0.25],
      Extrapolate.CLAMP,
    ),
    width: interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [7, 24, 7],
      Extrapolate.CLAMP,
    ),
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: accentColor }, animatedStyle]} />;
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
    paddingTop: Spacing.s,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 42,
    height: 42,
    marginRight: 9,
  },
  brandName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  brandTagline: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 3,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  slides: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.l,
    paddingTop: Spacing.s,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.m,
  },
  slideCount: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  slideTotal: {
    fontSize: 13,
    fontWeight: '900',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 7,
    borderRadius: BorderRadius.full,
    marginLeft: 6,
  },
  nextButton: {
    width: '100%',
  },
});

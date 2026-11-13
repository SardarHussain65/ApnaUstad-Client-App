import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import {
  alpha,
  BorderRadius,
  getAccessibleColor,
  Spacing,
  useTheme,
  useThemeTypography,
} from '../constants/Theme';
import { useIsRTL } from '../i18n';

export interface OnboardingSlideData {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: any;
  accent: string;
}

interface OnboardingSlideProps {
  item: OnboardingSlideData;
  index: number;
  scrollX: SharedValue<number>;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  item,
  index,
  scrollX,
}) => {
  const theme = useTheme();
  const typography = useThemeTypography();
  const isRtl = useIsRTL();
  const { width, height } = useWindowDimensions();

  const isSmallDevice = height < 720;
  const contentMaxWidth = Math.min(width * 0.9, 420);
  const accessibleAccent = getAccessibleColor(item.accent, theme.isDark);
  const isDark = theme.isDark;

  // Compute responsive image sizing that always leaves ample room for text & controls
  const imageSize = isSmallDevice
    ? Math.min(width * 0.54, 190)
    : Math.min(width * 0.64, 240);

  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  // Smooth fade and gentle scale animation on swipe
  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0.35, 1, 0.35],
      Extrapolate.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          scrollX.value,
          inputRange,
          [0.85, 1, 0.85],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0.25, 1, 0.25],
      Extrapolate.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(
          scrollX.value,
          inputRange,
          [16, 0, 16],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  return (
    <View style={[styles.container, { width }]}>
      <View style={[styles.contentWrapper, { maxWidth: contentMaxWidth }]}>
        {/* HERO IMAGE SHOWCASE (Soft rounded corners, centered, zero sharp edges) */}
        <View style={styles.imageSection}>
          {/* Soft ambient back-glow */}
          <View
            style={[
              styles.ambientGlow,
              {
                backgroundColor: item.accent,
                opacity: isDark ? 0.2 : 0.12,
                width: imageSize * 1.15,
                height: imageSize * 1.15,
              },
            ]}
          />

          {/* Clean Rounded Image Frame */}
          <Animated.View
            style={[
              styles.imageCard,
              {
                width: imageSize,
                height: imageSize,
                borderColor: alpha(item.accent, isDark ? 0.35 : 0.22),
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.8)'
                  : 'rgba(255, 255, 255, 0.9)',
                shadowColor: item.accent,
              },
              animatedImageStyle,
            ]}
          >
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        {/* TEXT CONTENT (Clean, concise, guaranteed to fit comfortably) */}
        <Animated.View style={[styles.textSection, animatedTextStyle]}>
          {/* Eyebrow Pill */}
          <View
            style={[
              styles.eyebrowPill,
              {
                flexDirection: isRtl ? 'row-reverse' : 'row',
                backgroundColor: alpha(item.accent, isDark ? 0.14 : 0.09),
                borderColor: alpha(item.accent, isDark ? 0.4 : 0.25),
              },
            ]}
          >
            <Sparkles size={11} color={accessibleAccent} />
            <Text
              style={[
                styles.eyebrowText,
                { color: accessibleAccent },
              ]}
            >
              {item.eyebrow}
            </Text>
          </View>

          {/* Headline */}
          <Text
            style={[
              styles.title,
              typography.threeD,
              {
                color: theme.colors.text.primary,
                textAlign: isRtl ? 'right' : 'left',
                fontSize: isSmallDevice ? 21 : 24,
                lineHeight: isSmallDevice ? 27 : 30,
              },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Description */}
          <Text
            style={[
              styles.description,
              {
                color: theme.colors.text.secondary,
                textAlign: isRtl ? 'right' : 'left',
                fontSize: isSmallDevice ? 13.5 : 14.5,
                lineHeight: isSmallDevice ? 19 : 21,
              },
            ]}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.l,
  },
  ambientGlow: {
    position: 'absolute',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
  },
  imageCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    width: '100%',
    alignItems: 'center',
  },
  eyebrowPill: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 10,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 8,
    width: '100%',
  },
  description: {
    fontWeight: '500',
    width: '100%',
  },
});

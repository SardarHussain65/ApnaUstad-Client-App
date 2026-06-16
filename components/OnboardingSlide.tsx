import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { GlassCard } from './home/GlassCard';
import { alpha, BorderRadius, Spacing, useTheme, useThemeTypography } from '../constants/Theme';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
  item: {
    accent: string;
    benefit: string;
    description: string;
    eyebrow: string;
    id: string;
    image: any;
    title: string;
  };
  index: number;
  scrollX: SharedValue<number>;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item, index, scrollX }) => {
  const theme = useTheme();
  const typography = useThemeTypography();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0.2, 1, 0.2], Extrapolate.CLAMP),
    transform: [
      {
        scale: interpolate(scrollX.value, inputRange, [0.76, 1, 0.76], Extrapolate.CLAMP),
      },
      {
        translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolate.CLAMP),
      },
    ],
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0.1, 1, 0.1], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollX.value, inputRange, [30, 0, 30], Extrapolate.CLAMP),
      },
    ],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <View style={[styles.outerGlow, { backgroundColor: item.accent }]} />
        <View style={[styles.innerGlow, { borderColor: alpha(item.accent, 0.4) }]} />
        <Animated.Image
          resizeMode="contain"
          source={item.image}
          style={[styles.image, animatedImageStyle]}
        />
      </View>

      <Animated.View style={[styles.content, animatedCardStyle]}>
<GlassCard
           intensity={28}
           padding={Spacing.l}
           style={[styles.infoCard, { borderColor: theme.colors.border.subtle }]}
           gradient={[alpha(item.accent, 0.1), alpha(theme.colors.brand.secondary, 0.04)]}
         >
          <View style={[styles.eyebrow, { borderColor: alpha(item.accent, 0.4) }]}>
            <Sparkles size={13} color={item.accent} />
            <Text style={[styles.eyebrowText, { color: item.accent }]}>{item.eyebrow}</Text>
          </View>
          <Text style={[styles.title, typography.threeD, { color: theme.colors.text.primary }]}>{item.title}</Text>
          <Text style={[styles.description, { color: theme.colors.text.muted }]}>{item.description}</Text>
          <View style={styles.benefitRow}>
            <CheckCircle2 size={16} color={item.accent} strokeWidth={2.5} />
            <Text style={[styles.benefit, { color: theme.colors.text.secondary }]}>{item.benefit}</Text>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  imageContainer: {
    flex: 0.56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    width: width * 0.58,
    height: width * 0.58,
    borderRadius: width,
    opacity: 0.09,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 42,
  },
  innerGlow: {
    position: 'absolute',
    width: width * 0.67,
    height: width * 0.67,
    borderRadius: width,
    borderWidth: 1,
    opacity: 0.6,
  },
  image: {
    width: width * 0.78,
    height: width * 0.78,
  },
  content: {
    flex: 0.44,
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: BorderRadius.xxl,
    borderColor: alpha('#FFFFFF', 0.14),
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 14,
  },
  eyebrowText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 33,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
  },
  benefit: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginLeft: 8,
  },
});

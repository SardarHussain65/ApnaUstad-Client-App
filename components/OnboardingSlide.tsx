import React from 'react';
import { StyleSheet, Text, View, Dimensions, Image } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  interpolate,
  Extrapolate,
  SharedValue
} from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../constants/Theme';

import { GlassCard } from './home/GlassCard';

const { width, height } = Dimensions.get('window');

interface OnboardingSlideProps {
  item: {
    id: string;
    title: string;
    description: string;
    image: any;
  };
  index: number;
  scrollX: SharedValue<number>;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item, index, scrollX }) => {
  const animatedImageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.6, 1, 0.6],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [40, 0, 40],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity: interpolate(
        scrollX.value,
        [(index - 1) * width, index * width, (index + 1) * width],
        [0, 1, 0],
        Extrapolate.CLAMP
      ),
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {/* Subtle Backdrop Glow */}
        <View style={styles.slideGlow} />
        <Animated.Image 
          source={item.image} 
          style={[styles.image, animatedImageStyle]} 
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.content}>
        <GlassCard intensity={25} style={styles.glassInfo}>
          <Text style={[styles.title, Typography.threeD]}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </GlassCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    alignItems: 'center',
    padding: Spacing.xl,
  },
  imageContainer: {
    flex: 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  slideGlow: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    backgroundColor: Colors.cyan,
    opacity: 0.1,
    filter: 'blur(40px)',
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
  },
  content: {
    flex: 0.45,
    width: '100%',
    justifyContent: 'center',
  },
  glassInfo: {
    padding: 30,
    borderRadius: 35,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: Spacing.l,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  description: {
    ...Typography.body,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
    fontSize: 15,
    fontWeight: '500',
  },
});

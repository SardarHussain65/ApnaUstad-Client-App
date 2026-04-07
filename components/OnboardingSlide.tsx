import React from 'react';
import { StyleSheet, Text, View, Dimensions, Image } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  interpolate,
  Extrapolate,
  SharedValue
} from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../constants/Theme';

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
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0, 1, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [50, 0, 50],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Animated.Image 
          source={item.image} 
          style={[styles.image, animatedImageStyle]} 
          resizeMode="contain"
        />
      </View>
      <View style={styles.content}>
        <Animated.View style={animatedTextStyle}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    height,
    alignItems: 'center',
    padding: Spacing.l,
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: width * 0.85,
    height: width * 0.85,
  },
  content: {
    flex: 0.4,
    width: '100%',
    paddingTop: Spacing.m,
  },
  title: {
    ...Typography.h1,
    fontSize: 34,
    textAlign: 'center',
    marginBottom: Spacing.m,
    color: Colors.cyan,
  },
  description: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textMuted,
    lineHeight: 26,
    paddingHorizontal: Spacing.m,
  },
});

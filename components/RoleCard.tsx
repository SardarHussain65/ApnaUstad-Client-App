import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, Typography, Animation, Shadows } from '../constants/Theme';

const { width } = Dimensions.get('window');

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  variant: 'client' | 'worker';
  isSelected?: boolean;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  icon,
  onPress,
  variant,
  isSelected
}) => {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const colors = variant === 'client' ? Colors.cyanGradient : Colors.orangeGradient;
  const mainColor = variant === 'client' ? Colors.cyan : Colors.worker;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      borderColor: mainColor,
      borderWidth: isSelected ? 2 : 1,
      opacity: isSelected ? 1 : 0.8,
      backgroundColor: isSelected ? Colors.cardSelected : Colors.card,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98, Animation.spring);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Animation.spring);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.touchable}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={[styles.iconContainer, { backgroundColor: `${mainColor}20` }]}>
          {icon}
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {isSelected && (
          <LinearGradient
            colors={colors as any}
            style={styles.activeIndicator}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
    marginBottom: Spacing.m,
  },
  container: {
    padding: Spacing.l,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 120,
    ...Shadows.card,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.l,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.l,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.h3,
    marginBottom: 4,
  },
  description: {
    ...Typography.caption,
    lineHeight: 18,
  },
  activeIndicator: {
    position: 'absolute',
    right: Spacing.m,
    top: Spacing.m,
    width: 12,
    height: 12,
    borderRadius: 6,
  }
});

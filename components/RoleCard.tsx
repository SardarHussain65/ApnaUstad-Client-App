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

import { GlassCard } from './home/GlassCard';

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
  const mainColor = variant === 'client' ? Colors.cyan : Colors.worker;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.touchable}
    >
      <GlassCard 
        intensity={isSelected ? 40 : 15} 
        style={[styles.container, isSelected && { borderColor: mainColor + '60' }]}
        hasGlow={isSelected}
        glowColor={mainColor}
      >
        <View style={[styles.iconContainer, { backgroundColor: isSelected ? mainColor + '30' : 'rgba(255,255,255,0.05)' }]}>
          {icon}
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, Typography.threeD, isSelected && { color: '#fff' }]}>{title}</Text>
          <Text style={[styles.description, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>{description}</Text>
        </View>
        {isSelected && (
           <View style={[styles.activeIndicator, { backgroundColor: mainColor }]} />
        )}
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
    marginBottom: Spacing.m,
  },
  container: {
    padding: 24,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 18,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 0.8,
    shadowRadius: 5,
  }
});

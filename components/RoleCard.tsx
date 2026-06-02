import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { GlassCard } from './home/GlassCard';
import { BorderRadius, Colors, Spacing } from '../constants/Theme';

interface RoleCardProps {
  description: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  label: string;
  onPress: () => void;
  title: string;
  variant: 'client' | 'worker';
}

export const RoleCard: React.FC<RoleCardProps> = ({
  description,
  icon,
  isSelected,
  label,
  onPress,
  title,
  variant,
}) => {
  const mainColor = variant === 'client' ? Colors.cyan : Colors.worker;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.touchable}>
      <GlassCard
        contentStyle={styles.cardContent}
        glowColor={mainColor}
        gradient={[`${mainColor}18`, 'rgba(191,90,242,0.04)']}
        hasGlow={isSelected}
        intensity={isSelected ? 38 : 20}
        padding={Spacing.m}
        style={[
          styles.container,
          isSelected && {
            borderColor: `${mainColor}70`,
            backgroundColor: `${mainColor}0B`,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${mainColor}18` }]}>
          {icon}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: mainColor }]}>{label}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <CheckCircle2
          color={isSelected ? mainColor : 'rgba(255,255,255,0.18)'}
          size={21}
          strokeWidth={isSelected ? 2.8 : 1.8}
        />
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginBottom: Spacing.m,
    width: '100%',
  },
  container: {
    borderRadius: BorderRadius.xl,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 104,
  },
  iconContainer: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: Spacing.m,
  },
  copy: {
    flex: 1,
    paddingRight: Spacing.s,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 5,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { GlassCard } from './home/GlassCard';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../constants/Theme';

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
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const mainColor = variant === 'client' ? colors.cyan : colors.worker;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.touchable}>
      <GlassCard
        contentStyle={styles.cardContent}
        glowColor={mainColor}
        gradient={[alpha(mainColor, 0.1), alpha(theme.colors.brand.secondary, 0.04)]}
        hasGlow={isSelected}
        intensity={isSelected ? 38 : 20}
        padding={Spacing.m}
        style={[
          styles.container,
          {
            borderColor: alpha(mainColor, theme.id === 'light' ? 0.35 : 0.45),
            backgroundColor: alpha(mainColor, theme.id === 'light' ? 0.05 : 0.06),
          },
          isSelected && {
            borderColor: alpha(mainColor, 0.85),
            backgroundColor: alpha(mainColor, theme.id === 'light' ? 0.1 : 0.12),
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: alpha(mainColor, 0.18), borderColor: alpha(mainColor, theme.id === 'light' ? 0.4 : 0.5) }]}>
          {icon}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: mainColor }]}>{label}</Text>
          <Text style={[styles.title, typography.threeD, { color: theme.colors.text.primary }]}>{title}</Text>
          <Text style={[styles.description, { color: theme.colors.text.secondary }]}>{description}</Text>
        </View>
        <CheckCircle2
          color={isSelected ? mainColor : theme.colors.text.dim}
          size={22}
          strokeWidth={isSelected ? 2.8 : 2}
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
    borderWidth: 1.8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 108,
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.l,
    borderWidth: 1.5,
    marginRight: Spacing.m,
  },
  copy: {
    flex: 1,
    paddingRight: Spacing.s,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 5,
  },
  description: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
});

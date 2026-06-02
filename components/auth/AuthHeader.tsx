import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/Theme';

interface AuthHeaderProps {
  title: string;
  onBack: () => void;
  accentColor?: string;
}

export function AuthHeader({ title, onBack, accentColor = Colors.cyan }: AuthHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        accessibilityLabel="Go back"
        activeOpacity={0.75}
        onPress={onBack}
        style={styles.backButton}
      >
        <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.titleWrap}>
        <View style={[styles.statusDot, { backgroundColor: accentColor, shadowColor: accentColor }]} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.m,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
    marginRight: 8,
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  title: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  placeholder: {
    width: 44,
  },
});

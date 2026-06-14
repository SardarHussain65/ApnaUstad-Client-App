import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { alpha, Spacing, BorderRadius, useTheme, useThemeTypography } from '../../constants/Theme';
import { BlurView } from 'expo-blur';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: 'header' | 'section';
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search services...',
  variant = 'section'
}: SearchBarProps) {
  const theme = useTheme();
  const typography = useThemeTypography();

  if (variant === 'header') {
    // Header version - compact
    return (
      <View style={styles.headerContainer}>
        <BlurView
          intensity={theme.id === 'current' ? 10 : 6}
          tint={theme.blurTint}
          style={[
            styles.headerInner,
            {
              borderColor: theme.colors.border.subtle,
              backgroundColor: theme.colors.surface.subtle,
            },
          ]}
        >
          <Search size={18} color={theme.colors.text.muted} strokeWidth={1.5} />
          <TextInput
            style={[styles.headerInput, { color: theme.colors.input.text }]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.input.placeholder}
            value={value}
            onChangeText={onChangeText}
            selectionColor={theme.colors.brand.primary}
          />
          {value.length > 0 && (
            <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <X size={16} color={theme.colors.text.muted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>
    );
  }

  // Section version - better styling
  return (
    <View style={styles.container}>
      <BlurView
        intensity={theme.id === 'current' ? 15 : 6}
        tint={theme.blurTint}
        style={[
          styles.searchInner,
          {
            borderColor: alpha(theme.colors.brand.primary, 0.2),
            backgroundColor: alpha(theme.colors.brand.primary, theme.id === 'current' ? 0.05 : 0.06),
          },
        ]}
      >
        <Search size={20} color={theme.colors.brand.primary} strokeWidth={2} />
        <TextInput
          style={[typography.body, styles.input, { color: theme.colors.input.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.input.placeholder}
          value={value}
          onChangeText={onChangeText}
          selectionColor={theme.colors.brand.primary}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <X size={20} color={theme.colors.brand.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: Spacing.l,
    overflow: 'hidden',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.l,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
  },
  headerInput: {
    flex: 1,
    marginHorizontal: Spacing.m,
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    marginBottom: Spacing.l,
    marginHorizontal: Spacing.l,
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Platform.OS === 'ios' ? Spacing.m : 0,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  input: {
    flex: 1,
    marginHorizontal: Spacing.m,
    fontWeight: '600',
  },
});

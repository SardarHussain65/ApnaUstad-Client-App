import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { alpha, Spacing, BorderRadius, useTheme, useThemeTypography } from '../../constants/Theme';
import { useIsRTL } from '../../context/LanguageContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: 'header' | 'section';
}

export const SearchBar = React.memo(function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search services...',
  variant = 'section',
}: SearchBarProps) {
  const theme = useTheme();
  const typography = useThemeTypography();
  const isRTL = useIsRTL();
  const [isFocused, setIsFocused] = useState(false);

  const isDark = theme.isDark;
  const activeCyan = theme.colors.brand.primary || '#00F5FF';

  // High-contrast visible card background so search bar is crystal clear on dark starry wallpapers
  const containerBg = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.96)';
  const borderColor = isFocused
    ? activeCyan
    : isDark
    ? 'rgba(0, 245, 255, 0.38)'
    : 'rgba(0, 0, 0, 0.16)';
  const placeholderColor = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(15, 23, 42, 0.55)';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';

  const isHeader = variant === 'header';

  return (
    <View style={isHeader ? styles.headerContainer : styles.container}>
      <View
        style={[
          isHeader ? styles.headerInner : styles.searchInner,
          {
            borderColor,
            backgroundColor: containerBg,
            borderWidth: isFocused ? 1.5 : 1.2,
          },
          isFocused && styles.focusedGlow,
        ]}
      >
        <View style={[styles.iconContainer, isRTL ? { marginLeft: 10, marginRight: 0 } : { marginRight: 10 }]}>
          <Search
            size={isHeader ? 18 : 20}
            color={isFocused ? activeCyan : isDark ? 'rgba(0, 245, 255, 0.9)' : activeCyan}
            strokeWidth={2.2}
          />
        </View>

        <TextInput
          style={[
            isHeader ? styles.headerInput : styles.input,
            {
              color: textColor,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={activeCyan}
          textAlignVertical="center"
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            style={[styles.clearBtn, isRTL ? { marginRight: 8, marginLeft: 0 } : { marginLeft: 8 }]}
            activeOpacity={0.7}
          >
            <View style={styles.clearBadge}>
              <X size={14} color="#000" strokeWidth={3} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: Spacing.l,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.l,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.full,
  },
  headerInput: {
    flex: 1,
    marginHorizontal: Spacing.s,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  container: {
    marginBottom: Spacing.l,
    marginHorizontal: Spacing.l,
    borderRadius: BorderRadius.lg,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: BorderRadius.lg,
  },
  focusedGlow: {
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

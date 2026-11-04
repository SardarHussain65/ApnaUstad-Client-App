import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Spacing, BorderRadius, useTheme } from '../../constants/Theme';
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
  const isRTL = useIsRTL();
  const [localText, setLocalText] = useState(value);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local text in sync if parent clears or changes value externally
  useEffect(() => {
    setLocalText(value);
  }, [value]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalText(text);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // 120ms debounce prevents parent re-renders from interrupting native typing
      debounceTimer.current = setTimeout(() => {
        onChangeText(text);
      }, 120);
    },
    [onChangeText]
  );

  const handleClear = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setLocalText('');
    onChangeText('');
  }, [onChangeText]);

  // Clean theme styling
  const isDark = theme.isDark;
  const isHeader = variant === 'header';

  const containerBg = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.98)';
  const borderColor = isDark ? 'rgba(0, 245, 255, 0.35)' : 'rgba(0, 0, 0, 0.14)';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const placeholderColor = isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.45)';
  const iconColor = isDark ? '#00F5FF' : theme.colors.brand.primary;

  return (
    <View style={isHeader ? styles.headerContainer : styles.container}>
      <View
        style={[
          styles.inner,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            backgroundColor: containerBg,
            borderColor,
          },
        ]}
      >
        <Search size={18} color={iconColor} strokeWidth={2.2} />

        <TextInput
          style={[
            styles.input,
            {
              color: textColor,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={localText}
          onChangeText={handleChangeText}
          returnKeyType="search"
          selectionColor={iconColor}
        />

        {localText.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            style={styles.clearBtn}
            activeOpacity={0.7}
          >
            <View style={styles.clearBadge}>
              <X size={12} color="#000" strokeWidth={2.5} />
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
    paddingHorizontal: Spacing.l,
  },
  container: {
    marginBottom: Spacing.l,
    marginHorizontal: Spacing.l,
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.2,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 0,
  },
  clearBtn: {
    padding: 2,
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Spacing, useTheme } from '../../constants/Theme';
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

  useEffect(() => {
    setLocalText(value);
  }, [value]);

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

  const isHeader = variant === 'header';
  const containerBg = theme.colors.input.background;
  const borderColor = theme.colors.input.border;
  const textColor = theme.colors.input.text;
  const placeholderColor = theme.colors.input.placeholder;
  const iconColor = theme.colors.brand.primary;

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
        <Search size={20} color={iconColor} strokeWidth={2.4} />

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
            <View
              style={[
                styles.clearBadge,
                { backgroundColor: theme.colors.brand.primary },
              ]}
            >
              <X size={13} color={theme.colors.text.onBrand} strokeWidth={2.5} />
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
    marginBottom: Spacing.m,
    marginHorizontal: Spacing.l,
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 0,
  },
  clearBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

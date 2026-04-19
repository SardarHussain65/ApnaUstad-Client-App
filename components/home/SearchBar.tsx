import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/Theme';
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
  if (variant === 'header') {
    // Header version - compact
    return (
      <View style={styles.headerContainer}>
        <BlurView intensity={10} tint="light" style={styles.headerInner}>
          <Search size={18} color={Colors.textMuted} strokeWidth={1.5} />
          <TextInput
            style={styles.headerInput}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            selectionColor={Colors.primary}
          />
          {value.length > 0 && (
            <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <X size={16} color={Colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>
    );
  }

  // Section version - better styling
  return (
    <View style={styles.container}>
      <BlurView intensity={15} tint="light" style={styles.searchInner}>
        <Search size={20} color={Colors.primary} strokeWidth={2} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          selectionColor={Colors.primary}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <X size={20} color={Colors.primary} strokeWidth={2} />
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.full,
  },
  headerInput: {
    flex: 1,
    marginHorizontal: Spacing.m,
    color: Colors.text,
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
    paddingVertical: Spacing.m,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  input: {
    flex: 1,
    marginHorizontal: Spacing.m,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    ...Typography.body,
  },
});

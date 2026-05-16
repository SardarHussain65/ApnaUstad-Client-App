/**
 * ClientToast.tsx
 * Fixed: toast now uses correct accent color for 'success' vs 'error' type.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated as RNAnimated,
  Platform,
} from 'react-native';
import { AlertCircle, CheckCircle } from 'lucide-react-native';
import { Spacing } from '../../constants/Theme';

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'error' | 'success';
}

interface ClientToastProps {
  toast: ToastState;
  onDismiss: () => void;
}

export const ClientToast = React.memo(({ toast, onDismiss }: ClientToastProps) => {
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!toast.visible) return;

    RNAnimated.sequence([
      RNAnimated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      RNAnimated.delay(3000),
      RNAnimated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [toast.visible, toast.message]);

  if (!toast.visible) return null;

  const isError = toast.type === 'error';
  const accentColor = isError ? '#FF6B6B' : '#34C759';
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <RNAnimated.View
      style={[styles.container, { opacity, borderLeftColor: accentColor }]}
    >
      <Icon size={16} color={accentColor} />
      <Text style={styles.message}>{toast.message}</Text>
    </RNAnimated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: Spacing.l,
    right: Spacing.l,
    backgroundColor: '#12122a',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 4,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  message: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
});

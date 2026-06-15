/**
 * ClientToast.tsx
 * Fixed: toast now uses theme-aware colors for 'success' vs 'error' type.
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
import { useTheme } from '../../constants/Theme';

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
  const theme = useTheme();

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
  const accentColor = isError ? theme.colors.status.error : theme.colors.status.success;
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <RNAnimated.View
      style={[styles.container, { opacity, borderLeftColor: accentColor }]}
    >
      <Icon size={16} color={accentColor} />
      <Text style={[styles.message, { color: theme.colors.text.primary }]}>{toast.message}</Text>
    </RNAnimated.View>
  );
});
ClientToast.displayName = 'ClientToast';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    flex: 1,
    lineHeight: 18,
  },
});
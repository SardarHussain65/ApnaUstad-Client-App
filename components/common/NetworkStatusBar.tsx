import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wifi, WifiOff } from 'lucide-react-native';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../constants/Theme';
import { useTranslation } from 'react-i18next';

export function NetworkStatusBar() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const { token } = useAuth();

  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnected'>('connected');
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('connected');
      return;
    }

    const unsubDisconnect = socketService.on('socket:disconnected', () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      setStatus('disconnected');
    });

    const unsubConnect = socketService.on('socket:connected', () => {
      setStatus((prev) => {
        if (prev === 'disconnected') {
          // Temporarily show reconnected badge, then hide after 2.5s
          dismissTimerRef.current = setTimeout(() => {
            setStatus('connected');
          }, 2500);
          return 'reconnected';
        }
        return 'connected';
      });
    });

    const unsubReconnect = socketService.on('socket:reconnected', () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      setStatus('reconnected');
      dismissTimerRef.current = setTimeout(() => {
        setStatus('connected');
      }, 2500);
    });

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      unsubDisconnect();
      unsubConnect();
      unsubReconnect();
    };
  }, [token]);

  // Don't render anything if the user isn't logged in or network is healthy
  if (!token || status === 'connected') {
    return null;
  }

  const isReconnected = status === 'reconnected';
  const bgColor = isReconnected ? '#10B981' : '#EF4444';
  const label = isReconnected
    ? t('network.connected', 'Online • Synced')
    : t('network.reconnecting', 'Offline • Reconnecting...');

  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 8),
          backgroundColor: bgColor,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        {isReconnected ? (
          <Wifi size={14} color="#FFFFFF" strokeWidth={2.5} />
        ) : (
          <WifiOff size={14} color="#FFFFFF" strokeWidth={2.5} />
        )}
        <Text style={styles.text}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});


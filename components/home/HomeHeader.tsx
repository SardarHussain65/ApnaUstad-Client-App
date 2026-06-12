import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Bell, MapPin } from 'lucide-react-native';
import { Colors, Spacing, Typography, Shadows } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications, useUserLocation } from '../../hooks';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { socketService } from '../../services/socketService';
import { useTranslation } from 'react-i18next';

export function HomeHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const { location } = useUserLocation();
  const { data: notificationsData, refetch: refetchNotifications } = useNotifications({ enabled: !!user?._id });
  const accentColor = role === 'worker' ? Colors.orange : Colors.primary;
  const unreadCount = notificationsData?.unreadCount || 0;

  useEffect(() => {
    const unsubscribe = socketService.on('notification:new', () => {
      refetchNotifications();
    });
    return () => unsubscribe();
  }, [refetchNotifications]);

  // Format location display
  const locationDisplay = location
    ? `${location.address || location.city || t('home.yourLocation', 'Your Location')}`
    : t('home.loadingLocation', 'Loading location...');

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8}>
            {/* Glowing Ring */}
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGlow}
            />
            <Image
              source={{ uri: user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'Guest')}&background=random` }}
              style={styles.avatar}
            />
            <View style={[styles.activeIndicator, { backgroundColor: Colors.success }]} />
          </TouchableOpacity>
          <View style={styles.welcomeText}>
            <Text style={styles.greetingLabel} numberOfLines={1}>{role === 'worker' ? t('home.worker.workerName', 'Worker Name') : t('home.client.clientName', 'Client Name')}</Text>
            <Text style={styles.greetingHeader} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.6}>{user?.fullName || t('home.client.welcomeBack', 'Welcome Back')}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7} onPress={() => router.push('/notifications' as any)}>
          <BlurView intensity={20} tint="light" style={styles.iconBlur}>
            <Bell size={22} color={Colors.text} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: accentColor }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </BlurView>
        </TouchableOpacity>
      </View>

      <View style={styles.locationContainer}>
        <MapPin size={14} color={accentColor} />
        <Text style={styles.locationText} numberOfLines={1}>{locationDisplay}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.m,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    padding: 3,
  },
  avatarGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 22,
    opacity: 0.8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  welcomeText: {
    marginLeft: Spacing.m,
    flex: 1,
  },
  greetingLabel: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 2,
  },
  greetingHeader: {
    ...Typography.h3,
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.l,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  locationText: {
    ...Typography.caption,
    marginLeft: 6,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    ...Shadows.glow,
  },
  badgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
});

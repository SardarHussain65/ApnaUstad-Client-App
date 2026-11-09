import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Bell, MapPin, BadgeCheck } from 'lucide-react-native';
import { alpha, Spacing, useTheme, useThemeColors } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications, useUserLocation } from '../../hooks';
import { useRouter } from 'expo-router';
import { socketService } from '../../services/socketService';
import { useTranslation } from 'react-i18next';

const getInitials = (name?: string) => {
  if (!name?.trim()) return 'AU';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

const formatCleanLocation = (rawAddress?: string) => {
  if (!rawAddress) return '';
  return rawAddress
    .replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},?\s*/gi, '')
    .replace(/\b-?\d{1,3}\.\d{3,},?\s*/g, '')
    .replace(/^,\s*|\s*,\s*$/g, '')
    .replace(/,\s*,+/g, ', ')
    .trim();
};

export function HomeHeader() {
  const theme = useTheme();
  const colors = useThemeColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const { location } = useUserLocation();
  const { data: notificationsData, refetch: refetchNotifications } = useNotifications({ enabled: !!user?._id });
  const [imageError, setImageError] = useState(false);

  const accentColor = theme.colors.brand.primary;
  const unreadCount = notificationsData?.unreadCount || 0;

  useEffect(() => {
    setImageError(false);
  }, [user?.profileImage]);

  useEffect(() => {
    const unsubscribe = socketService.on('notification:new', () => {
      refetchNotifications();
    });
    return () => unsubscribe();
  }, [refetchNotifications]);

  const locationDisplay = useMemo(() => {
    if (!location) return t('home.loadingLocation', 'Loading location...');
    const cleaned = formatCleanLocation(location.address);
    return cleaned || location.city || location.address || t('home.yourLocation', 'Your Location');
  }, [location, t]);

  const initials = useMemo(() => getInitials(user?.fullName), [user?.fullName]);

  const hasValidAvatar = Boolean(
    user?.profileImage &&
    !imageError &&
    user.profileImage !== 'null' &&
    user.profileImage !== 'undefined' &&
    !user.profileImage.includes('via.placeholder.com')
  );

  const avatarBg = useMemo(() => {
    if (theme.id === 'current') return 'rgba(0, 245, 255, 0.14)';
    return theme.isDark ? '#13284C' : '#DBEAFE';
  }, [theme.id, theme.isDark]);

  const locationBg = useMemo(() => {
    if (theme.id === 'current') return 'rgba(14, 20, 36, 0.84)';
    return theme.isDark ? '#111822' : '#FFFFFF';
  }, [theme.id, theme.isDark]);

  const notifBg = useMemo(() => {
    if (theme.id === 'current') return 'rgba(14, 20, 36, 0.84)';
    return theme.isDark ? '#131B26' : '#FFFFFF';
  }, [theme.id, theme.isDark]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={[
              styles.avatarCircle,
              {
                borderColor: accentColor,
                backgroundColor: avatarBg,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            {hasValidAvatar ? (
              <Image
                source={{ uri: user!.profileImage }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                onError={() => setImageError(true)}
              />
            ) : (
              <Text style={[styles.avatarInitials, { color: accentColor }]}>
                {initials}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.welcomeText}>
            <Text
              style={[styles.greetingLabel, { color: accentColor }]}
              numberOfLines={1}
            >
              {role === 'worker'
                ? t('home.worker.workerName', 'USTAD')
                : t('home.client.clientName', 'CUSTOMER')}
            </Text>
            <View style={styles.nameRow}>
              <Text
                style={[styles.greetingHeader, { color: theme.colors.text.primary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {user?.fullName || t('home.client.welcomeBack', 'Welcome Back')}
              </Text>
              {Boolean(user?.isVerified) && (
                <View style={styles.verifiedIconWrap}>
                  <BadgeCheck size={19} color={colors.success} fill={alpha(colors.success, 0.18)} />
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.notificationBtn,
            {
              borderColor: theme.colors.border.default,
              backgroundColor: notifBg,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => router.push('/notifications' as any)}
        >
          <Bell size={22} color={theme.colors.text.primary} strokeWidth={2.2} />
          {unreadCount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: accentColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.text.onBrand },
                ]}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.locationContainer,
          {
            backgroundColor: locationBg,
            borderColor: theme.colors.border.default,
          },
        ]}
      >
        <MapPin size={18} color={accentColor} strokeWidth={2.2} />
        <Text
          style={[styles.locationText, { color: theme.colors.text.secondary }]}
          numberOfLines={1}
        >
          {locationDisplay}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.s,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  welcomeText: {
    marginLeft: 14,
    flex: 1,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  greetingHeader: {
    fontSize: 23,
    fontWeight: '800',
    flexShrink: 1,
    letterSpacing: -0.3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 28,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 26,
    borderWidth: 1.6,
  },
  locationText: {
    marginLeft: 9,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});

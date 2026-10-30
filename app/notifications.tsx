import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Star,
  Scale,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { Spacing, useTheme, useThemeColors, useThemeTypography, alpha } from '../constants/Theme';
import { useLanguage } from '../context/LanguageContext';
import { useMarkNotificationReadMutation, useNotifications, type AppNotification } from '../hooks';
import { socketService } from '../services/socketService';
import {
  localizeNotificationTitle,
  localizeNotificationMessage,
  formatLocalizedTime,
} from '../utils/notificationLocalization';

type FilterKey = 'all' | 'unread' | 'missions' | 'payments';

const FILTERS: { key: FilterKey }[] = [
  { key: 'all' },
  { key: 'unread' },
  { key: 'missions' },
  { key: 'payments' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const legacyColors = theme.legacy;
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const { data, isLoading, isRefetching, refetch } = useNotifications();
  const { mutate: markRead, isPending: isMarkingRead } = useMarkNotificationReadMutation();

  const notifications = useMemo(() => data?.notifications || [], [data?.notifications]);
  const unreadCount = data?.unreadCount || 0;

  useEffect(() => {
    const unsubscribe = socketService.on('notification:new', () => {
      refetch();
    });
    return () => unsubscribe();
  }, [refetch]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') return notifications.filter((item) => !item.isRead);
    if (activeFilter === 'payments') return notifications.filter((item) => item.type === 'payment_received');
    if (activeFilter === 'missions') {
      return notifications.filter((item) => [
        'booking_accepted',
        'booking_cancelled',
        'job_started',
        'job_completed',
        'dispute',
      ].includes(item.type));
    }
    return notifications;
  }, [activeFilter, notifications]);

  const markAllRead = () => {
    notifications
      .filter((notification) => !notification.isRead)
      .forEach((notification) => markRead({ notificationId: notification._id }));
  };

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead) {
      markRead({ notificationId: notification._id });
    }

    const bookingId = notification.booking ? String(notification.booking) : null;
    const disputeId = (notification as any).disputeId || (notification as any).data?.disputeId;
    if (notification.type === 'dispute') {
      if (disputeId) {
        router.push({
          pathname: '/dispute-room' as any,
          params: { id: disputeId },
        });
      } else {
        router.push('/profile/my-disputes' as any);
      }
      return;
    }
    if (bookingId) {
      router.push({
        pathname: '/transaction-details',
        params: { id: bookingId },
      });
    }
  };

  return (
    <BackgroundWrapper>
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <Animated.View entering={FadeInUp.duration(520)} style={styles.header}>
          <TouchableOpacity 
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : alpha(theme.colors.text.primary, 0.03),
                borderColor: theme.isDark ? 'rgba(255,255,255,0.14)' : theme.colors.border.subtle,
              }
            ]} 
            onPress={() => router.back()} 
            activeOpacity={0.8}
          >
            {isRTL ? (
              <ChevronRight color={theme.colors.text.primary} size={24} />
            ) : (
              <ChevronLeft color={theme.colors.text.primary} size={24} />
            )}
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={[styles.headerEyebrow, { color: theme.colors.text.muted }]}>{t('notifications.eyebrow')}</Text>
            <Text style={[styles.headerTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('notifications.title')}</Text>
          </View>

          <View style={[
            styles.unreadPill,
            {
              borderColor: theme.isDark ? 'rgba(0,245,255,0.42)' : theme.colors.border.subtle,
            }
          ]}>
            <LinearGradient
              colors={['rgba(0,245,255,0.28)', 'rgba(191,90,242,0.14)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.unreadText, { color: theme.colors.brand.primary }]}>{unreadCount}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(520)}>
          <GlassCard
            padding={0}
            intensity={28}
            hasGlow={unreadCount > 0}
            glowColor={theme.colors.brand.primary}
            style={styles.summaryCard}
            contentStyle={styles.summaryContent}
          >
            <View style={styles.summaryLeft}>
              <View style={styles.summaryIcon}>
                <Sparkles size={18} color={theme.colors.brand.primary} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryTitle, { color: theme.colors.text.primary }]}>{t('notifications.updatesTitle')}</Text>
                <Text style={[styles.summaryText, { color: theme.colors.text.muted }]}>
                  {unreadCount > 0
                    ? (unreadCount === 1 ? t('notifications.waitingSingular') : t('notifications.waitingPlural', { count: unreadCount }))
                    : t('notifications.upToDate')}
                </Text>
              </View>
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity disabled={isMarkingRead} onPress={markAllRead} style={styles.markAllBtn} activeOpacity={0.8}>
                <CheckCircle2 size={13} color={theme.colors.brand.primary} />
                <Text style={[styles.markAllText, { color: theme.colors.brand.primary }]}>{t('notifications.readBtn')}</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(520)} style={styles.filters}>
          {FILTERS.map((filter) => {
            const selected = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.82}
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.10)' : theme.colors.border.subtle,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.colors.surface.subtle,
                  },
                  selected && [styles.filterChipActive, { borderColor: theme.colors.brand.primary }]
                ]}
              >
                {selected && (
                  <LinearGradient
                    colors={['rgba(0,245,255,0.34)', 'rgba(255,20,147,0.18)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    { color: theme.colors.text.muted },
                    selected && [styles.filterTextActive, { color: theme.isDark ? '#fff' : theme.colors.text.primary }]
                  ]}
                >
                  {t('notifications.' + filter.key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.brand.primary} size="large" />
            <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>{t('notifications.loading')}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={theme.colors.brand.primary}
              />
            }
          >
            {filteredNotifications.map((notification, index) => (
              <Animated.View
                key={notification._id}
                entering={FadeInDown.delay(index * 55).springify().damping(16)}
                layout={Layout.springify().damping(18)}
              >
                <NotificationCard
                  notification={notification}
                  onPress={() => openNotification(notification)}
                  onMarkRead={() => markRead({ notificationId: notification._id })}
                  theme={theme}
                  isUrdu={language === 'ur'}
                  isRTL={isRTL}
                />
              </Animated.View>
            ))}

            {filteredNotifications.length === 0 && (
              <Animated.View entering={FadeInDown.duration(420)}>
                <GlassCard intensity={20} style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Bell size={34} color={theme.colors.brand.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>{t('notifications.emptyTitle')}</Text>
                  <Text style={[styles.emptyText, { color: theme.colors.text.muted }]}>{t('notifications.emptyDesc')}</Text>
                </GlassCard>
              </Animated.View>
            )}
          </ScrollView>
        )}
      </View>
    </BackgroundWrapper>
  );
}

function NotificationCard({
  notification,
  onPress,
  onMarkRead,
  theme,
  isUrdu,
  isRTL,
}: {
  notification: AppNotification;
  onPress: () => void;
  onMarkRead: () => void;
  theme: ReturnType<typeof useTheme>;
  isUrdu: boolean;
  isRTL: boolean;
}) {
  const Icon = getNotificationIcon(notification.type);
  const accent = notification.color || getNotificationColor(notification.type, theme);
  const unread = !notification.isRead;
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const title = localizeNotificationTitle(notification.title, isUrdu);
  const message = localizeNotificationMessage(notification.message, isUrdu);
  const time = formatLocalizedTime(notification.createdAt, t, isUrdu);
  const isLongMessage = (message?.length || 0) > 55;
  const hasAction = Boolean(notification.booking || (notification as any).disputeId || (notification as any).data?.disputeId);

  const handleCardPress = () => {
    if (unread) {
      onMarkRead();
    }
    if (isLongMessage) {
      setIsExpanded((prev) => !prev);
    } else if (hasAction) {
      onPress();
    }
  };

  const handleActionPress = () => {
    if (unread) {
      onMarkRead();
    }
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={handleCardPress}>
      <GlassCard
        padding={0}
        intensity={unread ? 34 : 18}
        style={[styles.notificationShell, unread && { borderColor: accent + '66' }]}
        contentStyle={styles.notificationContent}
      >
        <LinearGradient
          colors={[accent + '40', 'rgba(255,255,255,0.00)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardWash}
          pointerEvents="none"
        />

        <View style={[styles.iconBox, { backgroundColor: accent + '18', borderColor: accent + '45' }]}>
          <Icon size={20} color={accent} strokeWidth={2.25} />
          {unread && <PulseDot color={accent} />}
        </View>

        <View style={styles.notificationBody}>
          <View style={styles.notificationTop}>
            <Text style={[styles.typeLabel, { color: theme.colors.brand.primary }]}>{getTypeLabel(notification.type, t)}</Text>
            <Text style={[styles.notificationTime, { color: theme.colors.text.muted }]}>{time}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text
              style={[styles.notificationTitle, { color: theme.colors.text.primary }]}
              numberOfLines={isExpanded ? undefined : 1}
            >
              {title}
            </Text>
            {unread && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
          </View>

          <Text
            style={[styles.notificationMessage, { color: theme.colors.text.secondary }]}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {message}
          </Text>

          {isLongMessage && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsExpanded((prev) => !prev)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.expandToggle}
            >
              <Text style={[styles.expandToggleText, { color: theme.colors.brand.primary }]}>
                {isExpanded ? t('notifications.showLess', 'Show less') : t('notifications.showMore', 'Read more')}
              </Text>
              <ChevronDown
                size={12}
                color={theme.colors.brand.primary}
                style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          )}

          <View style={styles.footerRow}>
            <Text style={[styles.statusText, unread ? { color: accent } : { color: theme.colors.text.muted }]}>
              {unread ? t('notifications.statusNew') : t('notifications.statusRead')}
            </Text>
            {hasAction && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleActionPress}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.openHint}
              >
                <Text style={[styles.openHintText, { color: theme.colors.brand.primary }]}>
                  {t('notifications.hintOpen')}
                </Text>
                {isRTL ? (
                  <ChevronLeft size={13} color={theme.colors.brand.primary} />
                ) : (
                  <ChevronRight size={13} color={theme.colors.brand.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.9, { duration: 950 }), withTiming(1, { duration: 0 })),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 950 }), withTiming(0.7, { duration: 0 })),
      -1,
      false,
    );
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, { borderColor: color }, animatedStyle]} />
      <View style={[styles.pulseCore, { backgroundColor: color }]} />
    </View>
  );
}

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'booking_accepted': return Briefcase;
    case 'booking_cancelled': return XCircle;
    case 'job_started': return Zap;
    case 'job_completed': return CheckCircle2;
    case 'payment_received': return CreditCard;
    case 'new_review': return Star;
    case 'worker_verified': return ShieldCheck;
    case 'dispute': return Scale;
    default: return Bell;
  }
}

function getNotificationColor(type: AppNotification['type'], theme: ReturnType<typeof useTheme>) {
  switch (type) {
    case 'booking_cancelled': return theme.colors.status.error;
    case 'job_completed':
    case 'worker_verified': return theme.colors.status.success;
    case 'payment_received':
    case 'new_review': return theme.legacy.yellow;
    case 'job_started': return theme.legacy.orange;
    case 'dispute': return theme.colors.status.error;
    default: return theme.colors.brand.primary;
  }
}

function getTypeLabel(type: AppNotification['type'], t: any) {
  return t(`notifications.types.${type}`) || t('notifications.types.general');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.m,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    alignItems: 'center',
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 5,
  },
  unreadPill: {
    width: 54,
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 19,
    fontWeight: '900',
  },
  summaryCard: {
    borderRadius: 24,
    marginBottom: Spacing.m,
    overflow: 'hidden',
  },
  summaryContent: {
    minHeight: 84,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(0,245,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  markAllBtn: {
    flexDirection: 'row',
    gap: 5,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: 'rgba(0,245,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.m,
  },
  filterChip: {
    height: 38,
    minWidth: 74,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterChipActive: {
    borderColor: 'rgba(0,245,255,0.32)',
  },
  filterText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#fff',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 120,
  },
  notificationShell: {
    borderRadius: 20,
    minHeight: 82,
    overflow: 'hidden',
  },
  notificationContent: {
    minHeight: 82,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardWash: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '58%',
    opacity: 0.78,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pulseWrap: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  pulseCore: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  notificationBody: {
    flex: 1,
    minWidth: 0,
  },
  notificationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  notificationTime: {
    color: 'rgba(255,255,255,0.36)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusText: {
    color: 'rgba(255,255,255,0.34)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 9,
    paddingRight: 6,
    height: 24,
    borderRadius: 9,
    backgroundColor: 'rgba(0,245,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.22)',
  },
  openHintText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 28,
    padding: 30,
    marginTop: 40,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.24)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});
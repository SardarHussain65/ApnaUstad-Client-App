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
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Star,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { Colors, Spacing, Typography } from '../constants/Theme';
import { useMarkNotificationReadMutation, useNotifications, type AppNotification } from '../hooks';
import { socketService } from '../services/socketService';

type FilterKey = 'all' | 'unread' | 'missions' | 'payments';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'missions', label: 'Missions' },
  { key: 'payments', label: 'Payments' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>SIGNAL CENTER</Text>
            <Text style={[styles.headerTitle, Typography.threeD]}>Notifications</Text>
          </View>

          <View style={styles.unreadPill}>
            <LinearGradient
              colors={['rgba(0,245,255,0.28)', 'rgba(191,90,242,0.14)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(520)}>
          <GlassCard
            padding={0}
            intensity={28}
            hasGlow={unreadCount > 0}
            glowColor={Colors.cyan}
            style={styles.summaryCard}
            contentStyle={styles.summaryContent}
          >
            <View style={styles.summaryLeft}>
              <View style={styles.summaryIcon}>
                <Sparkles size={18} color={Colors.cyan} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>Mission updates</Text>
                <Text style={styles.summaryText}>
                  {unreadCount > 0 ? `${unreadCount} unread signal${unreadCount === 1 ? '' : 's'} waiting` : 'Everything is up to date'}
                </Text>
              </View>
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity disabled={isMarkingRead} onPress={markAllRead} style={styles.markAllBtn} activeOpacity={0.8}>
                <CheckCircle2 size={13} color={Colors.cyan} />
                <Text style={styles.markAllText}>READ</Text>
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
                style={[styles.filterChip, selected && styles.filterChipActive]}
              >
                {selected && (
                  <LinearGradient
                    colors={['rgba(0,245,255,0.34)', 'rgba(255,20,147,0.18)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.cyan} size="large" />
            <Text style={styles.loadingText}>Loading signal stream...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.cyan}
              />
            }
          >
            {filteredNotifications.map((notification, index) => (
              <Animated.View
                key={notification._id}
                entering={FadeInDown.delay(index * 55).springify().damping(16)}
                layout={Layout.springify().damping(18)}
              >
                <NotificationCard notification={notification} onPress={() => openNotification(notification)} />
              </Animated.View>
            ))}

            {filteredNotifications.length === 0 && (
              <Animated.View entering={FadeInDown.duration(420)}>
                <GlassCard intensity={20} style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Bell size={34} color={Colors.cyan} />
                  </View>
                  <Text style={styles.emptyTitle}>No Signals</Text>
                  <Text style={styles.emptyText}>Your activity is clear right now.</Text>
                </GlassCard>
              </Animated.View>
            )}
          </ScrollView>
        )}
      </View>
    </BackgroundWrapper>
  );
}

function NotificationCard({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const Icon = getNotificationIcon(notification.type);
  const accent = notification.color || getNotificationColor(notification.type);
  const unread = !notification.isRead;

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
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
          <Icon size={22} color={accent} strokeWidth={2.25} />
          {unread && <PulseDot color={accent} />}
        </View>

        <View style={styles.notificationBody}>
          <View style={styles.notificationTop}>
            <Text style={styles.typeLabel}>{getTypeLabel(notification.type)}</Text>
            <Text style={styles.notificationTime}>{formatNotificationTime(notification.createdAt)}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle} numberOfLines={1}>{notification.title}</Text>
            {unread && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
          </View>

          <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>

          <View style={styles.footerRow}>
            <Text style={[styles.statusText, unread ? { color: accent } : null]}>
              {unread ? 'NEW SIGNAL' : 'READ'}
            </Text>
            {notification.booking && (
              <View style={styles.openHint}>
                <Text style={styles.openHintText}>OPEN</Text>
                <ChevronRight size={13} color={Colors.cyan} />
              </View>
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
    default: return Bell;
  }
}

function getNotificationColor(type: AppNotification['type']) {
  switch (type) {
    case 'booking_cancelled': return Colors.error;
    case 'job_completed':
    case 'worker_verified': return Colors.success;
    case 'payment_received':
    case 'new_review': return Colors.yellow;
    case 'job_started': return Colors.orange;
    default: return Colors.cyan;
  }
}

function getTypeLabel(type: AppNotification['type']) {
  switch (type) {
    case 'booking_accepted': return 'Booking accepted';
    case 'booking_cancelled': return 'Booking cancelled';
    case 'job_started': return 'Job started';
    case 'job_completed': return 'Job completed';
    case 'payment_received': return 'Payment';
    case 'new_review': return 'Review';
    case 'worker_verified': return 'Verified';
    default: return 'General';
  }
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    color: Colors.cyan,
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
    color: Colors.textMuted,
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
    color: Colors.cyan,
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
    color: Colors.textMuted,
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
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 120,
  },
  notificationShell: {
    borderRadius: 24,
    minHeight: 124,
    overflow: 'hidden',
  },
  notificationContent: {
    minHeight: 124,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    color: Colors.cyan,
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
    marginTop: 6,
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
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
    marginTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
    color: Colors.cyan,
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
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});

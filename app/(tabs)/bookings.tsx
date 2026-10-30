import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Image } from 'react-native';
import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import Animated, { FadeInDown, LinearTransition, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar, Clock, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Zap, Star, Inbox, Scale } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMyBookings, useWorkerBookings, useMyJobPosts } from '../../hooks';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { useIsRTL } from '../../context/LanguageContext';
import { SkeletonList } from '../../components/ui';
import { useTranslation } from 'react-i18next';

const TABS = ['Active', 'Completed', 'Cancelled'] as const;
type TabType = typeof TABS[number];

const formatMissionDate = (date?: string) => {
  if (!date) return 'Today';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date.split('T')[0] || date;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const initialsFor = (name?: string) => {
  if (!name) return 'AU';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AU';
};

const statusLabel = (status: string) => {
  if (status === 'in-progress') return 'In Progress';
  return status.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

const entityId = (entity?: string | { _id?: string } | null) => {
  if (!entity) return '';
  return typeof entity === 'string' ? entity : entity._id || '';
};

const isWithinJobResponseWindow = (bookingCreatedAt: string, jobCreatedAt: string, jobExpiresAt: string) => {
  const bookingTime = new Date(bookingCreatedAt).getTime();
  const jobTime = new Date(jobCreatedAt).getTime();
  const expiresTime = new Date(jobExpiresAt).getTime();
  if ([bookingTime, jobTime, expiresTime].some(Number.isNaN)) return true;
  return bookingTime >= jobTime && bookingTime <= expiresTime + (5 * 60 * 1000);
};

export default function BookingsTab() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const themedTypography = useThemeTypography();
  const router = useRouter();
  const { role } = useAuth();
  const isWorker = role === 'worker';
  const isRTL = useIsRTL();
  const [activeTab, setActiveTab] = useState<TabType>('Active');

  const getMissionCardGradient = (status: string, isInstant: boolean, statusColor: string, isDisputed?: boolean): [string, string, string] => {
    if (theme.id !== 'current') {
      return [
        alpha(statusColor, theme.id === 'light' ? 0.08 : 0.14),
        theme.colors.surface.card,
        theme.colors.surface.cardMuted,
      ];
    }

    if (isDisputed) {
      return ['rgba(255,69,0,0.24)', 'rgba(12,10,28,0.95)', 'rgba(255,59,48,0.12)'];
    }
    if (status === 'completed' || status === 'closed') {
      return ['rgba(0,255,127,0.28)', 'rgba(5,16,29,0.94)', 'rgba(0,245,255,0.14)'];
    }
    if (status === 'cancelled') {
      return ['rgba(255,59,48,0.24)', 'rgba(12,10,28,0.95)', 'rgba(191,90,242,0.12)'];
    }
    if (status === 'ongoing' || status === 'in-progress') {
      return ['rgba(191,90,242,0.28)', 'rgba(4,17,34,0.95)', 'rgba(0,245,255,0.18)'];
    }
    if (isInstant) {
      return ['rgba(255,140,0,0.26)', 'rgba(5,18,32,0.95)', 'rgba(0,245,255,0.16)'];
    }
    return ['rgba(0,245,255,0.23)', 'rgba(7,13,35,0.95)', 'rgba(191,90,242,0.15)'];
  };

  // React Query hooks
  const userBookingsQuery = useMyBookings({ enabled: !isWorker });
  const workerBookingsQuery = useWorkerBookings({ enabled: isWorker });
  const bookingsQuery = isWorker ? workerBookingsQuery : userBookingsQuery;

  const {
    data: myBookings = [],
    isLoading: loadingBookings,
    refetch: refetchBookings,
    isRefetching: isRefetchingBookings
  } = bookingsQuery;

  const { 
    data: myJobPosts = [], 
    isLoading: loadingJobs, 
    refetch: refetchJobs, 
    isRefetching: isRefetchingJobs 
  } = useMyJobPosts({ enabled: !isWorker });

  const isLoading = loadingBookings || (loadingJobs && !isWorker);
  const isRefetching = isRefetchingBookings || isRefetchingJobs;

  const handleRefresh = useCallback(() => {
    refetchBookings();
    if (!isWorker) refetchJobs();
  }, [isWorker, refetchBookings, refetchJobs]);

  useEffect(() => {
    // Listen for real-time socket updates
    const unsubNew = socketService.on('booking:new', () => handleRefresh());
    const unsubStatus = socketService.on('booking:status', () => handleRefresh());
    const unsubJob = socketService.on('job:new', () => handleRefresh());
    const unsubBid = socketService.on('bid:new', () => handleRefresh());

    return () => {
      unsubNew();
      unsubStatus();
      unsubJob();
      unsubBid();
    };
  }, [handleRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': 
      case 'in-progress': return colors.cyan;
      case 'accepted': 
      case 'assigned': return colors.orange;
      case 'completed': 
      case 'closed': return colors.success;
      case 'cancelled': return colors.error;
      case 'pending':
      case 'open':
      case 'reviewing': return colors.primary;
      default: return colors.primary;
    }
  };

  const getStatusIcon = (status: string, color: string) => {
    switch (status) {
      case 'completed': 
      case 'closed': return <CheckCircle2 size={12} color={color} />;
      case 'cancelled': return <XCircle size={12} color={color} />;
      case 'ongoing': 
      case 'in-progress': return <Zap size={12} color={color} />;
      default: return <Clock size={12} color={color} />;
    }
  };

  // A bid-created booking is the operational record once an Ustad is assigned.
  // Hide its original job post so clients see one mission card throughout the lifecycle.
  const visibleJobPosts = useMemo(() => {
    if (isWorker) return [];

    return myJobPosts.filter(job => {
      return !myBookings.some(booking => {
        if (entityId(booking.jobPost) === job._id) return true;

        const acceptedWorkerId = entityId(job.acceptedBid?.worker);
        return Boolean(
          acceptedWorkerId
          && entityId(booking.worker) === acceptedWorkerId
          && booking.category === job.category
          && booking.description === job.description
          && booking.address === job.address
          && booking.bookingType === job.urgency
          && isWithinJobResponseWindow(booking.createdAt, job.createdAt, job.expiresAt)
        );
      });
    });
  }, [isWorker, myBookings, myJobPosts]);

  const combinedData = useMemo(() => [
    ...myBookings.map(b => ({ ...b, _type: 'booking' as const })),
    ...visibleJobPosts.map(j => ({ ...j, _type: 'job' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [myBookings, visibleJobPosts]);

  const filteredData = combinedData.filter(item => {
    const status = item.status;
    const isDisputed = item._type === 'booking' && item.disputeMeta?.hasDispute && (item.disputeMeta.disputeStatus === 'open' || item.disputeMeta.disputeStatus === 'under_review');

    if (activeTab === 'Active') {
      if (isDisputed) return false;
      return ['pending', 'accepted', 'ongoing', 'in-progress', 'open', 'assigned', 'reviewing'].includes(status);
    }
    if (activeTab === 'Completed') {
      if (isDisputed) return false;
      return ['completed', 'closed'].includes(status);
    }
    if (activeTab === 'Cancelled') {
      if (isDisputed) return true;
      return status === 'cancelled';
    }
    return false;
  });

  return (
    <BackgroundWrapper>
      <View style={[styles.container, { paddingTop: insets.top + Spacing.m }]}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, themedTypography.threeD, { color: theme.colors.text.primary }]}>{t('bookings.myBookings')}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.text.muted }]}>{t('bookings.subtitle')}</Text>
        </View>

        {/* Custom Tab Bar */}
        <View
          style={[
            styles.tabContainer,
            {
              backgroundColor: theme.colors.surface.subtle,
              borderColor: theme.colors.border.subtle,
            },
          ]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            const tabKey = tab === 'Active' ? 'activeTab' : tab === 'Completed' ? 'completedTab' : 'cancelledTab';
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab)}
              >
                {isActive && (
                  <Animated.View
                    layout={LinearTransition.springify().damping(15)}
                    style={StyleSheet.absoluteFillObject}
                  >
                    <LinearGradient
                      colors={theme.id === 'current'
                        ? ['rgba(0,245,255,0.4)', 'rgba(255,20,147,0.4)']
                        : [alpha(theme.colors.brand.primary, 0.16), alpha(theme.colors.brand.secondary, 0.12)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeTabGradient}
                    />
                  </Animated.View>
                )}
                <Text style={[
                  styles.tabText,
                  { color: isActive ? theme.colors.text.primary : theme.colors.text.muted },
                  isActive && styles.activeTabText
                ]}>
                  {t(`bookings.${tabKey}`)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* List of Bookings */}
        {isLoading && combinedData.length === 0 ? (
          <SkeletonList count={3} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={colors.cyan}
              />
            }
          >
            {filteredData.map((item, index) => {
              const isDisputed = item._type === 'booking' && item.disputeMeta?.hasDispute && (item.disputeMeta.disputeStatus === 'open' || item.disputeMeta.disputeStatus === 'under_review');
              const statusColor = isDisputed ? colors.error : getStatusColor(item.status);
              const isBooking = '_type' in item && item._type === 'booking';
              
              // Type safety helpers
              const booking = isBooking ? (item as any) : null;
              const job = !isBooking ? (item as any) : null;

              const meta = item.cardMeta;
              const title = meta?.title || (isBooking ? booking.category : job.category);
              const scheduledDate = isBooking ? booking.scheduledDate : job.scheduledDate;
              const scheduledTime = isBooking ? booking.scheduledTime : job.scheduledTime;
              const address = isBooking ? booking.address : job.address;
              const status = item.status;
              const canReview = !isWorker && isBooking && status === 'completed' && !booking?.isReviewed;
              const isAwaitingProposals = !isBooking && ['open', 'reviewing'].includes(status);
              const missionKind = meta?.missionKind || (isBooking ? booking.bookingType : job.urgency);
              const isInstant = missionKind === 'instant';
              const amountValue = Number(meta?.financial?.amount ?? (isBooking
                ? Number(isWorker ? booking.workerEarning : booking.totalAmount || 0)
                : Number(job.amount || 0)));
              
              const rawAddress = address || meta?.location?.address || '';
              const cleanLocation = (() => {
                if (!rawAddress) return t('bookings.openDetailsToViewLocation', 'View in details');
                const cleaned = rawAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '').trim();
                const parts = cleaned.split(',').map((p: string) => p.trim()).filter(Boolean);
                if (parts.length > 2) {
                  return `${parts[0]}, ${parts[parts.length - 1]}`;
                }
                return cleaned || rawAddress;
              })();

              const rawDateLabel = meta?.schedule?.dateLabel || formatMissionDate(scheduledDate);
              const dateLabel = rawDateLabel === 'Today' ? t('common.today', 'Today') : rawDateLabel;
              const rawTimeLabel = meta?.schedule?.timeLabel || scheduledTime || 'ASAP';
              const timeLabel = (!rawTimeLabel || rawTimeLabel === 'ASAP') ? t('common.asap', 'Right Away') : rawTimeLabel;

              const amountDisplay = amountValue ? `Rs. ${amountValue.toLocaleString()}` : '';

              const getLocalizedRole = (role: string) => {
                if (role === 'Ustad' || role === 'Accepted Ustad') return t('common.ustad', 'Ustad');
                if (role === 'Client' || role === 'Customer') return t('common.client', 'Customer');
                if (role === 'Bids' || role === 'Offers') return t('findingWorker.offersLabel', 'Offers');
                if (role === 'Mission' || role === 'Job' || role === 'Request') return t('bookings.jobRoleLabel', 'Request');
                return role;
              };
              const localizeCounterPartyName = (rawName?: string) => {
                if (!rawName || rawName === 'Open broadcast' || rawName === 'Finding Ustads' || rawName === 'Searching...') {
                  return t('bookings.searching', 'Finding Ustads...');
                }
                if (/^\d+\s+(bids|offers)\s+received$/i.test(rawName)) {
                  const count = Number(job?.bidCount || parseInt(rawName, 10) || 0);
                  return t('bookings.bidsReceived', { count });
                }
                return rawName;
              };
              let counterPartyName = localizeCounterPartyName(meta?.counterParty?.fullName);
              let counterPartyImage = meta?.primaryImageUrl || meta?.counterParty?.profileImage || '';
              let counterPartyRole = getLocalizedRole(meta?.counterParty?.roleLabel || (isWorker ? 'Customer' : 'Ustad'));
              if (isBooking) {
                const person = isWorker ? booking.customer : booking.worker;
                counterPartyName = meta?.counterParty?.fullName || person?.fullName || t('bookings.searching', 'Finding Ustads...');
                counterPartyImage = meta?.primaryImageUrl || meta?.counterParty?.profileImage || person?.profileImage || '';
              } else if (!meta?.counterParty) {
                counterPartyName = job.bidCount > 0
                  ? t('bookings.bidsReceived', { count: job.bidCount })
                  : t('bookings.searching', 'Finding Ustads...');
                counterPartyImage = job.imageUrl || job.imageUrls?.[0] || '';
                counterPartyRole = getLocalizedRole(job.bidCount > 0 ? 'Offers' : 'Request');
              }

              const openDetails = () => {
                if (isBooking) {
                  router.push({
                    pathname: '/transaction-details',
                    params: { id: item._id }
                  });
                } else if (isAwaitingProposals) {
                  router.push({
                    pathname: '/finding-worker',
                    params: { jobId: item._id }
                  });
                } else {
                  router.push({
                    pathname: '/job-details',
                    params: { id: item._id }
                  });
                }
              };

              return (
                <Animated.View
                  key={item._id}
                  entering={FadeInDown.delay(index * 100).duration(500)}
                  layout={Layout.springify()}
                >
                  <GlassCard
                    style={styles.bookingCard}
                    intensity={30}
                    glowColor={statusColor}
                    hasGlow
                    gradient={getMissionCardGradient(status, isInstant, statusColor, isDisputed)}
                    padding={0}
                    onPress={openDetails}
                  >
                    <LinearGradient
                      colors={[statusColor, colors.cyan, alpha(statusColor, 0.4)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.cardAccentLine}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={[alpha(statusColor, 0.22), 'rgba(0,0,0,0)', alpha(colors.cyan, 0.06)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardAtmosphere}
                    />
                    <View style={[styles.cardSideAccent, { backgroundColor: statusColor }]} />

                    <View style={styles.cardBody}>
                      {/* Top Header: Service Title + Urgent Badge + Status Badge */}
                      <View style={styles.topRow}>
                        <View style={styles.titleArea}>
                          <Text style={[styles.categoryTitle, themedTypography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>
                            {title}
                          </Text>
                          {isInstant && (
                            <View style={[styles.instantBadge, { backgroundColor: alpha(colors.worker, 0.12), borderColor: alpha(colors.worker, 0.25) }]}>
                              <Zap size={10} color={colors.worker} strokeWidth={2.5} />
                              <Text style={[styles.instantBadgeText, { color: colors.worker }]}>
                                {t('home.worker.instant', 'Urgent')}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: alpha(statusColor, theme.isDark ? 0.12 : 0.08),
                              borderColor: alpha(statusColor, theme.isDark ? 0.32 : 0.24),
                            },
                          ]}
                        >
                          {isDisputed ? <Scale size={11} color={statusColor} /> : getStatusIcon(status, statusColor)}
                          <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
                            {isDisputed ? t('bookings.disputed', 'DISPUTED') : t(`bookingStatus.${status}.label`, statusLabel(status))}
                          </Text>
                        </View>
                      </View>

                      {/* Middle Row: Counterparty info + Date & Time */}
                      <View style={styles.middleRow}>
                        <View style={styles.personContainer}>
                          <View style={[styles.avatarShell, { borderColor: alpha(statusColor, 0.35) }]}>
                            {counterPartyImage ? (
                              <Image source={{ uri: counterPartyImage }} style={styles.avatarImage} />
                            ) : (
                              <LinearGradient
                                colors={[alpha(statusColor, 0.35), alpha(colors.cyan, 0.2)]}
                                style={styles.avatarFallback}
                              >
                                <Text style={[styles.avatarText, { color: theme.colors.text.primary }]}>
                                  {initialsFor(counterPartyName)}
                                </Text>
                              </LinearGradient>
                            )}
                          </View>
                          <View style={styles.personTextGroup}>
                            <Text style={[styles.personName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                              {counterPartyName}
                            </Text>
                            <Text style={[styles.personRole, { color: theme.colors.text.dim }]} numberOfLines={1}>
                              {counterPartyRole}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.scheduleRow}>
                          <Calendar size={12} color={theme.colors.text.muted} />
                          <Text style={[styles.scheduleText, { color: theme.colors.text.muted }]}>{dateLabel}</Text>
                          <View style={styles.scheduleDot} />
                          <Clock size={12} color={theme.colors.text.muted} />
                          <Text style={[styles.scheduleText, { color: theme.colors.text.muted }]}>{timeLabel}</Text>
                        </View>
                      </View>

                      {/* Footer Row: Clean Location on Left, Price & Action Button on Right */}
                      <View style={[styles.footerRow, { borderTopColor: alpha(theme.colors.text.primary, 0.08) }]}>
                        <View style={styles.locationGroup}>
                          <MapPin size={12} color={theme.colors.text.muted} />
                          <Text style={[styles.locationText, { color: theme.colors.text.muted }]} numberOfLines={1}>
                            {cleanLocation}
                          </Text>
                        </View>

                        <View style={styles.footerRight}>
                          {!!amountDisplay && (
                            <Text style={[styles.amountValue, { color: colors.success }]}>
                              {amountDisplay}
                            </Text>
                          )}
                          <View style={[styles.openIconBtn, { backgroundColor: alpha(statusColor, 0.14), borderColor: alpha(statusColor, 0.28) }]}>
                            {isRTL ? (
                              <ChevronLeft size={13} color={statusColor} strokeWidth={2.8} />
                            ) : (
                              <ChevronRight size={13} color={statusColor} strokeWidth={2.8} />
                            )}
                          </View>
                        </View>
                      </View>

                      {canReview && (
                        <TouchableOpacity
                          style={styles.reviewBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            router.push({
                              pathname: '/review',
                              params: { bookingId: item._id }
                            });
                          }}
                        >
                          <LinearGradient
                            colors={['#FFD700', '#FFB300']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.reviewGradient}
                          >
                            <Star size={13} color="#000" fill="#000" />
                            <Text style={styles.reviewBtnText}>{t('bookings.rateUstad', 'RATE USTAD')}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </GlassCard>
                </Animated.View>
              );
            })}
            {filteredData.length === 0 && (() => {
              const tabColor = activeTab === 'Active' ? colors.cyan : activeTab === 'Completed' ? colors.success : colors.error;
              const emptyTitleKey = activeTab === 'Active' ? 'noActiveBookings' : activeTab === 'Completed' ? 'noCompletedBookings' : 'noCancelledBookings';
              const emptySubKey = activeTab === 'Active' ? 'activeEmpty' : activeTab === 'Completed' ? 'completedEmpty' : 'cancelledEmpty';
              return (
                <Animated.View entering={FadeInDown.duration(600)} style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { borderColor: tabColor + '38', backgroundColor: tabColor + '10', shadowColor: tabColor }]}>
                    <Inbox size={42} color={tabColor} />
                  </View>
                  <Text style={[styles.emptyTitle, themedTypography.threeD, { color: theme.colors.text.primary }]}>
                    {t(`bookings.${emptyTitleKey}`).toUpperCase()}
                  </Text>
                  <Text style={[styles.emptySub, { color: theme.colors.text.muted }]}>
                    {t(`bookings.${emptySubKey}`)}
                  </Text>
                </Animated.View>
              );
            })()}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    marginBottom: Spacing.l,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  activeTabGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  tabText: {
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    zIndex: 1,
  },
  activeTabText: {
    fontWeight: '900',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  bookingCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccentLine: {
    height: 3,
  },
  cardAtmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  cardSideAccent: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 0,
    width: 3,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  instantBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarShell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  personTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  personRole: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scheduleDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  openIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtn: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  reviewGradient: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reviewBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 60,
    gap: 16,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
    maxWidth: 280,
  }
});

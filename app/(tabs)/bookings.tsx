import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Image } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import Animated, { FadeInDown, LinearTransition, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar, Clock, ChevronRight, CheckCircle2, XCircle, Zap, Star, BriefcaseBusiness, Banknote, Radio, Inbox } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMyBookings, useWorkerBookings, useMyJobPosts } from '../../hooks';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
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

const getMissionCardGradient = (status: string, isInstant: boolean): [string, string, string] => {
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
  const router = useRouter();
  const { role } = useAuth();
  const isWorker = role === 'worker';
  const [activeTab, setActiveTab] = useState<TabType>('Active');

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
      case 'in-progress': return Colors.cyan;
      case 'accepted': 
      case 'assigned': return Colors.orange;
      case 'completed': 
      case 'closed': return Colors.success;
      case 'cancelled': return Colors.error;
      case 'pending':
      case 'open':
      case 'reviewing': return Colors.primary;
      default: return Colors.primary;
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
    if (activeTab === 'Active') {
      return ['pending', 'accepted', 'ongoing', 'in-progress', 'open', 'assigned', 'reviewing'].includes(status);
    }
    if (activeTab === 'Completed') {
      return ['completed', 'closed'].includes(status);
    }
    if (activeTab === 'Cancelled') {
      return status === 'cancelled';
    }
    return false;
  });

  return (
    <BackgroundWrapper>
      <View style={[styles.container, { paddingTop: insets.top + Spacing.m }]}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, Typography.threeD]}>{t('bookings.myBookings')}</Text>
          <Text style={styles.headerSubtitle}>{t('bookings.subtitle')}</Text>
        </View>

        {/* Custom Tab Bar */}
        <View style={styles.tabContainer}>
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
                      colors={['rgba(0,245,255,0.4)', 'rgba(255,20,147,0.4)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.activeTabGradient}
                    />
                  </Animated.View>
                )}
                <Text style={[
                  styles.tabText,
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
                tintColor={Colors.cyan}
              />
            }
          >
            {filteredData.map((item, index) => {
              const statusColor = getStatusColor(item.status);
              const isBooking = '_type' in item && item._type === 'booking';
              
              // Type safety helpers
              const booking = isBooking ? (item as any) : null;
              const job = !isBooking ? (item as any) : null;

              const meta = item.cardMeta;
              const title = meta?.title || (isBooking ? booking.category : job.category);
              const scheduledDate = isBooking ? booking.scheduledDate : job.scheduledDate;
              const scheduledTime = isBooking ? booking.scheduledTime : job.scheduledTime;
              const address = isBooking ? booking.address : job.address;
              const workerLoc = isBooking
                ? (booking.worker?.address || booking.worker?.city)
                : (job?.acceptedBid?.worker?.address || job?.acceptedBid?.worker?.city);
              const status = item.status;
              const canReview = !isWorker && isBooking && status === 'completed' && !booking?.isReviewed;
              const isAwaitingProposals = !isBooking && ['open', 'reviewing'].includes(status);
              const description = meta?.description || (isBooking ? booking.description : job.description);
              const missionKind = meta?.missionKind || (isBooking ? booking.bookingType : job.urgency);
              const isInstant = missionKind === 'instant';
              const amountValue = Number(meta?.financial?.amount ?? (isBooking
                ? Number(isWorker ? booking.workerEarning : booking.totalAmount || 0)
                : Number(job.amount || 0)));
              const getLocalizedAmountLabel = (label: string) => {
                if (label === 'Total') return t('bookings.totalLabel', 'Total');
                if (label === 'Earning') return t('bookings.earningLabel', 'Earning');
                if (label === 'Budget') return t('bookings.budgetLabel', 'Budget');
                return label;
              };
              const amountLabel = getLocalizedAmountLabel(meta?.financial?.label || (isBooking ? (isWorker ? 'Earning' : 'Total') : 'Budget'));
              
              const getLocalizedActionLabel = (label: string) => {
                if (label === 'View details' || label === 'View Details') return t('bookings.actionViewDetails', 'View Details');
                if (label === 'View Receipt') return t('bookings.actionViewReceipt', 'View Receipt');
                if (label === 'Track Live Job') return t('bookings.actionTrackLiveJob', 'Track Live Job');
                if (label === 'Track Job') return t('bookings.actionTrackJob', 'Track Job');
                if (label === 'Review Proposals') return t('bookings.actionReviewProposals', 'Review Proposals');
                if (label === 'Resume Search') return t('bookings.actionResumeSearch', 'Resume Search');
                return label;
              };
              const actionLabel = getLocalizedActionLabel(isAwaitingProposals
                ? Number(job.bidCount || 0) > 0 ? 'Review Proposals' : 'Resume Search'
                : status === 'completed' || status === 'closed'
                ? 'View Receipt'
                : status === 'cancelled'
                  ? 'View Details'
                  : status === 'ongoing'
                    ? 'Track Live Job'
                    : status === 'assigned' || status === 'accepted'
                      ? 'Track Job'
                      : 'View Details');

              const getLocalizedRole = (role: string) => {
                if (role === 'Ustad') return t('common.ustad', 'Ustad');
                if (role === 'Client') return t('common.client', 'Client');
                return role;
              };
              let counterPartyName = meta?.counterParty?.fullName || 'Searching...';
              let counterPartyImage = meta?.primaryImageUrl || meta?.counterParty?.profileImage || '';
              let counterPartyRole = getLocalizedRole(meta?.counterParty?.roleLabel || (isWorker ? 'Client' : 'Ustad'));
              if (isBooking) {
                const person = isWorker ? booking.customer : booking.worker;
                counterPartyName = meta?.counterParty?.fullName || person?.fullName || 'Searching...';
                counterPartyImage = meta?.primaryImageUrl || meta?.counterParty?.profileImage || person?.profileImage || '';
              } else if (!meta?.counterParty) {
                counterPartyName = job.bidCount > 0 ? `${job.bidCount} bids received` : 'Open broadcast';
                counterPartyImage = job.imageUrl || job.imageUrls?.[0] || '';
                counterPartyRole = 'Job';
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
                    gradient={getMissionCardGradient(status, isInstant)}
                    padding={0}
                    onPress={openDetails}
                  >
                    <LinearGradient
                      colors={[statusColor, 'rgba(0,245,255,0.85)', statusColor + '70']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.cardAccentLine}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={[statusColor + '30', 'rgba(0,0,0,0)', 'rgba(0,245,255,0.08)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardAtmosphere}
                    />
                    <View style={[styles.cardSideAccent, { backgroundColor: statusColor }]} />
                    <View style={styles.cardBody}>
                      <View style={styles.cardTopStrip}>
                        <View style={styles.missionTypePill}>
                          {isInstant ? <Zap size={12} color={Colors.cyan} /> : <Calendar size={12} color={Colors.cyan} />}
                          <Text style={styles.missionTypeText}>{isInstant ? t('home.worker.instant') : t('home.worker.scheduled')}</Text>
                        </View>
                        <View style={[styles.statusBadge, { borderColor: statusColor + '45', backgroundColor: statusColor + '13' }]}>
                          {getStatusIcon(status, statusColor)}
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {t(`bookingStatus.${status}.label`, statusLabel(status))}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.identityRow}>
                        <View style={[styles.avatarRing, { borderColor: statusColor + '55' }]}>
                          {counterPartyImage ? (
                            <Image source={{ uri: counterPartyImage }} style={styles.avatarImage} />
                          ) : (
                            <LinearGradient
                              colors={[statusColor + '55', 'rgba(0,245,255,0.25)']}
                              style={styles.avatarFallback}
                            >
                              <Text style={styles.avatarInitials}>{initialsFor(counterPartyName)}</Text>
                            </LinearGradient>
                          )}
                        </View>

                        <View style={styles.identityTextGroup}>
                          <Text style={styles.personRole}>{counterPartyRole}</Text>
                          <Text style={[styles.personName, Typography.threeD]} numberOfLines={1}>
                            {counterPartyName}
                          </Text>
                        </View>

                        {!!amountValue && (
                          <View style={styles.amountPill}>
                            <Banknote size={13} color={Colors.success} />
                            <View>
                              <Text style={styles.amountLabel}>{amountLabel}</Text>
                              <Text style={styles.amountValue}>Rs. {amountValue.toLocaleString()}</Text>
                            </View>
                          </View>
                        )}
                      </View>

                      <LinearGradient
                        colors={['rgba(255,255,255,0.075)', statusColor + '0D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.serviceBlock}
                      >
                        <View style={styles.serviceIconBox}>
                          <BriefcaseBusiness size={19} color={Colors.cyan} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemTitle, Typography.threeD]} numberOfLines={1}>{title}</Text>
                          {!!description && (
                            <Text style={styles.descriptionText} numberOfLines={2}>
                              {description}
                            </Text>
                          )}
                        </View>
                      </LinearGradient>

                      <View style={styles.detailGrid}>
                        <View style={styles.detailChip}>
                          <Calendar size={14} color={Colors.cyan} />
                          <Text style={styles.detailText}>{formatMissionDate(scheduledDate)}</Text>
                        </View>
                        <View style={styles.detailChip}>
                          <Clock size={14} color={Colors.orange} />
                          <Text style={styles.detailText}>{scheduledTime || 'ASAP'}</Text>
                        </View>
                      </View>

                      <View style={styles.locationBox}>
                        <MapPin size={15} color={Colors.textMuted} />
                        <Text style={styles.locationText} numberOfLines={2}>
                          {address || t('bookings.openDetailsToViewLocation', 'Open details to view the service location')}
                        </Text>
                      </View>

                      <View style={styles.actionDivider} />

                      <LinearGradient
                        colors={['rgba(0,245,255,0.15)', statusColor + '16']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionPanel}
                      >
                        <TouchableOpacity
                          style={styles.actionBtn}
                          activeOpacity={0.85}
                          onPress={openDetails}
                        >
                          <View style={styles.actionLabelGroup}>
                            <Radio size={14} color={Colors.cyan} />
                            <Text style={styles.actionBtnText}>{actionLabel}</Text>
                          </View>
                          <View style={styles.actionCircle}>
                            <ChevronRight size={16} color="#001014" />
                          </View>
                        </TouchableOpacity>
                      </LinearGradient>

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
                            <Star size={15} color="#000" fill="#000" />
                            <Text style={styles.reviewBtnText}>{t('bookings.rateUstad', 'RATE USTAD')}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </GlassCard>
                </Animated.View>
              )
            })}
            {filteredData.length === 0 && (() => {
              const tabColor = activeTab === 'Active' ? Colors.cyan : activeTab === 'Completed' ? Colors.success : Colors.error;
              const emptyTitleKey = activeTab === 'Active' ? 'noActiveBookings' : activeTab === 'Completed' ? 'noCompletedBookings' : 'noCancelledBookings';
              const emptySubKey = activeTab === 'Active' ? 'activeEmpty' : activeTab === 'Completed' ? 'completedEmpty' : 'cancelledEmpty';
              return (
                <Animated.View entering={FadeInDown.duration(600)} style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { borderColor: tabColor + '38', backgroundColor: tabColor + '10', shadowColor: tabColor }]}>
                    <Inbox size={42} color={tabColor} />
                  </View>
                  <Text style={[styles.emptyTitle, Typography.threeD]}>
                    {t(`bookings.${emptyTitleKey}`).toUpperCase()}
                  </Text>
                  <Text style={styles.emptySub}>
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
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 4,
    marginBottom: Spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    zIndex: 1,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '900',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  bookingCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  cardAccentLine: {
    height: 3,
  },
  cardAtmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  cardSideAccent: {
    position: 'absolute',
    top: 22,
    bottom: 22,
    left: 0,
    width: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  cardBody: {
    padding: 16,
  },
  cardTopStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  missionTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
  },
  missionTypeText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 21,
    borderWidth: 1.5,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  identityTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  personRole: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  personName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  amountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.22)',
  },
  amountLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  amountValue: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  serviceBlock: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 13,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  serviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
  },
  itemTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#fff',
  },
  descriptionText: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 5,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  detailChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    color: '#D8D7E8',
    fontWeight: '800',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.065)',
  },
  locationText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  actionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 14,
    marginBottom: 10,
  },
  actionPanel: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.14)',
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: Colors.cyan,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionCircle: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: Colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtn: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  reviewGradient: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reviewBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
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
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
    maxWidth: 280,
  }
});

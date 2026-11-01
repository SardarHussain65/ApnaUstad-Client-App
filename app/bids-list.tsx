import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Star,
  Clock,
  ShieldCheck,
  Users,
  ChevronRight,
  Zap,
  RefreshCw,
} from 'lucide-react-native';
import AnimatedRN, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';

import { alpha, BorderRadius, Spacing, useTheme, useThemeColors } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { Skeleton, useShimmerTranslateX } from '../components/ui/Skeleton';
import { useIsRTL } from '../context/LanguageContext';
import { socketService } from '../services/socketService';
import api from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name?: string) {
  if (!name?.trim()) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');
}

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, reviewCount }: { value: number; reviewCount?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.starRow}>
      <Star size={12} color="#FFB800" fill="#FFB800" />
      <Text style={[styles.ratingScore, { color: theme.colors.text.primary }]}>
        {(value || 5.0).toFixed(1)}
      </Text>
      {reviewCount !== undefined && reviewCount > 0 && (
        <Text style={[styles.reviewCountText, { color: theme.colors.text.muted }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
}

// ─── Proposal Card Skeleton ───────────────────────────────────────────────────
function ProposalCardSkeleton({ translateX }: { translateX?: any }) {
  const theme = useTheme();
  const cardBg = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const borderColor = theme.isDark ? 'rgba(255,255,255,0.06)' : theme.colors.border.subtle;

  return (
    <View style={[styles.skeletonCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.skeletonTopRow}>
        <Skeleton width={52} height={52} borderRadius={16} translateX={translateX} />
        <View style={{ flex: 1, gap: 6, marginHorizontal: 12 }}>
          <Skeleton width="65%" height={16} borderRadius={6} translateX={translateX} />
          <Skeleton width="45%" height={12} borderRadius={4} translateX={translateX} />
        </View>
        <Skeleton width={88} height={36} borderRadius={12} translateX={translateX} />
      </View>

      <Skeleton width="100%" height={46} borderRadius={12} style={{ marginBottom: 12 }} translateX={translateX} />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Skeleton width={80} height={24} borderRadius={12} translateX={translateX} />
        <Skeleton width={96} height={24} borderRadius={12} translateX={translateX} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton width="38%" height={44} borderRadius={14} translateX={translateX} />
        <Skeleton width="58%" height={44} borderRadius={14} translateX={translateX} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BidsListScreen() {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const theme = useTheme();
  const colors = useThemeColors();
  const primaryColor = theme.colors.brand?.primary || colors.primary;
  const secondaryColor = theme.colors.brand?.secondary || colors.secondary;
  const shimmerTranslateX = useShimmerTranslateX();

  const [bids, setBids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const fetchBids = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const res = await api.get(`/jobs/${jobId}/bids`);
      setBids(res.data.data || []);
    } catch (e: any) {
      console.error('Fetch bids error:', e?.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  // Real-time socket updates for incoming and withdrawn bids
  useEffect(() => {
    if (!jobId) return;

    const unsubNewBid = socketService.on('bid:new', (newBid: any) => {
      const incomingJobId = typeof newBid.jobPost === 'object' ? newBid.jobPost?._id : newBid.jobPost;
      if (String(incomingJobId) === String(jobId)) {
        setBids(prev => {
          if (prev.some(b => String(b._id) === String(newBid._id))) {
            return prev.map(b => (String(b._id) === String(newBid._id) ? newBid : b));
          }
          return [newBid, ...prev];
        });
      }
    });

    const unsubWithdrawn = socketService.on('bid:withdrawn', (payload: any) => {
      const withdrawnBidId = payload?.bidId || payload?._id;
      if (withdrawnBidId) {
        setBids(prev => prev.filter(b => String(b._id) !== String(withdrawnBidId)));
      }
    });

    return () => {
      if (typeof unsubNewBid === 'function') unsubNewBid();
      if (typeof unsubWithdrawn === 'function') unsubWithdrawn();
    };
  }, [jobId]);

  const handleAccept = async (bidId: string) => {
    setAccepting(bidId);
    try {
      const res = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`, {});
      router.replace({ pathname: '/transaction-details', params: { id: res.data.data._id } });
    } catch (e: any) {
      console.error('Accept bid error:', e?.response?.data || e.message);
      Toast.show({
        type: 'error',
        text1: 'Could not hire Ustad',
        text2: e?.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setAccepting(null);
    }
  };

  const handleRefresh = () => {
    fetchBids(true);
  };

  return (
    <BackgroundWrapper>
      <View style={{ flex: 1 }}>

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <AnimatedRN.View
          entering={FadeInUp.duration(400)}
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12),
              borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.colors.border.subtle,
            },
          ]}
        >
          <BlurView intensity={70} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />

          <TouchableOpacity
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border.subtle,
              },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft
              color={theme.colors.text.primary}
              size={20}
              style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={[styles.topBarTitle, { color: theme.colors.text.primary }]}>
              {t('bidsList.headerTitle', 'USTAD OFFERS')}
            </Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: alpha(primaryColor, 0.1),
                  borderColor: alpha(primaryColor, 0.25),
                },
              ]}
            >
              <Users size={11} color={primaryColor} />
              <Text style={[styles.countBadgeText, { color: primaryColor }]}>
                {t('bidsList.countLabel', { count: bids.length, defaultValue: `${bids.length} Offers` })}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.refreshHeaderBtn,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.colors.border.subtle,
              },
            ]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <RefreshCw
              size={18}
              color={isRefreshing ? primaryColor : theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </AnimatedRN.View>

        {/* ── Main List ─────────────────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + (Platform.OS === 'ios' ? 76 : 84),
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 16,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={primaryColor}
              colors={[primaryColor]}
            />
          }
        >
          {/* ── Loading Skeleton ─────────────────────────────────────────── */}
          {isLoading && bids.length === 0 && (
            <View style={{ gap: 14 }}>
              <ProposalCardSkeleton translateX={shimmerTranslateX} />
              <ProposalCardSkeleton translateX={shimmerTranslateX} />
              <ProposalCardSkeleton translateX={shimmerTranslateX} />
            </View>
          )}

          {/* ── Empty State ──────────────────────────────────────────────── */}
          {!isLoading && bids.length === 0 && (
            <AnimatedRN.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.emptyContainer}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: alpha(primaryColor, 0.08),
                    borderColor: alpha(primaryColor, 0.2),
                  },
                ]}
              >
                <Users size={32} color={primaryColor} />
              </View>

              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                {t('bidsList.noBidsYet', 'WAITING FOR OFFERS')}
              </Text>

              <Text style={[styles.emptySub, { color: theme.colors.text.muted }]}>
                {t('bidsList.noBidsSub', 'Nearby Ustads are checking your job and will send their rates soon.')}
              </Text>

              <TouchableOpacity
                style={[
                  styles.emptyRefreshBtn,
                  {
                    backgroundColor: alpha(primaryColor, 0.1),
                    borderColor: alpha(primaryColor, 0.25),
                  },
                ]}
                onPress={handleRefresh}
                activeOpacity={0.8}
              >
                <RefreshCw size={15} color={primaryColor} />
                <Text style={[styles.emptyRefreshBtnText, { color: primaryColor }]}>
                  {t('common.refresh', 'Refresh Offers')}
                </Text>
              </TouchableOpacity>
            </AnimatedRN.View>
          )}

          {/* ── Bid Proposals ────────────────────────────────────────────── */}
          {!isLoading &&
            bids.map((bid, index) => {
              const isDeploying = accepting === bid._id;
              const rating = bid.worker?.rating ?? bid.worker?.averageRating ?? 5.0;
              const reviewCount = bid.worker?.totalReviews ?? bid.worker?.totalJobs ?? 0;
              const categoryOrExp =
                bid.worker?.category ||
                (bid.worker?.experience
                  ? `${bid.worker.experience} yrs exp`
                  : t('common.verifiedUstad', 'Verified Professional'));

              return (
                <AnimatedRN.View
                  key={bid._id}
                  entering={FadeInDown.delay(index * 80).duration(400)}
                  style={styles.cardContainer}
                >
                  <View
                    style={[
                      styles.proposalCard,
                      {
                        backgroundColor: theme.isDark ? 'rgba(17, 24, 39, 0.82)' : theme.colors.surface.card,
                        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
                      },
                    ]}
                  >
                    {/* Top sheen overlay */}
                    <LinearGradient
                      colors={[
                        theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
                        'transparent',
                      ]}
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                    />

                    {/* ── Top Row: Ustad Identity & Quoted Price ── */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: '/worker-details',
                          params: {
                            id: bid.worker?._id,
                            jobId,
                            bidId: bid._id,
                            proposedPrice: String(bid.proposedPrice || ''),
                          },
                        })
                      }
                      style={styles.cardHeader}
                    >
                      {/* Avatar */}
                      <View style={styles.avatarWrap}>
                        {bid.worker?.profileImage ? (
                          <Image source={{ uri: bid.worker.profileImage }} style={styles.avatar} />
                        ) : (
                          <View
                            style={[
                              styles.avatarFallback,
                              { backgroundColor: alpha(primaryColor, 0.12) },
                            ]}
                          >
                            <Text style={[styles.avatarInitials, { color: primaryColor }]}>
                              {getInitials(bid.worker?.fullName)}
                            </Text>
                          </View>
                        )}
                        {bid.worker?.isAvailable !== false && (
                          <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                        )}
                      </View>

                      {/* Info & Rating */}
                      <View style={styles.workerInfo}>
                        <View style={styles.nameRow}>
                          <Text
                            style={[styles.workerName, { color: theme.colors.text.primary }]}
                            numberOfLines={1}
                          >
                            {bid.worker?.fullName || t('common.anonymous', 'Ustad')}
                          </Text>
                          {bid.worker?.isVerified && (
                            <ShieldCheck size={14} color={colors.success} strokeWidth={2.4} />
                          )}
                        </View>

                        <Text style={[styles.workerSub, { color: theme.colors.text.muted }]} numberOfLines={1}>
                          {categoryOrExp}
                        </Text>

                        <StarRating value={rating} reviewCount={reviewCount} />
                      </View>

                      {/* Quoted Price Badge */}
                      <View
                        style={[
                          styles.priceBox,
                          {
                            backgroundColor: alpha(colors.success, 0.08),
                            borderColor: alpha(colors.success, 0.22),
                          },
                        ]}
                      >
                        <Text style={[styles.priceTag, { color: alpha(colors.success, 0.85) }]}>
                          {t('bidsList.quotedPrice', 'RATE')}
                        </Text>
                        <Text style={[styles.priceAmount, { color: colors.success }]}>
                          Rs. {Number(bid.proposedPrice || 0).toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* ── Proposal Message Note ── */}
                    {Boolean(bid.message) && (
                      <View
                        style={[
                          styles.messageContainer,
                          {
                            backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.border.subtle,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.messageText, { color: theme.colors.text.secondary }]}
                          numberOfLines={3}
                        >
                          "{bid.message}"
                        </Text>
                      </View>
                    )}

                    {/* ── Highlights Badges ── */}
                    <View style={styles.chipsRow}>
                      {bid.worker?.isVerified && (
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: alpha(colors.success, 0.08),
                              borderColor: alpha(colors.success, 0.2),
                            },
                          ]}
                        >
                          <ShieldCheck size={11} color={colors.success} strokeWidth={2.2} />
                          <Text style={[styles.chipText, { color: colors.success }]}>
                            {t('findingWorker.verified', 'VERIFIED')}
                          </Text>
                        </View>
                      )}

                      {bid.estimatedDays ? (
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: alpha(colors.cyan, 0.08),
                              borderColor: alpha(colors.cyan, 0.2),
                            },
                          ]}
                        >
                          <Clock size={11} color={colors.cyan} strokeWidth={2.2} />
                          <Text style={[styles.chipText, { color: colors.cyan }]}>
                            {t('bidsList.estDaysLabel', {
                              count: bid.estimatedDays,
                              defaultValue: `${bid.estimatedDays} Days`,
                            })}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: alpha(primaryColor, 0.08),
                              borderColor: alpha(primaryColor, 0.2),
                            },
                          ]}
                        >
                          <Clock size={11} color={primaryColor} strokeWidth={2.2} />
                          <Text style={[styles.chipText, { color: primaryColor }]}>
                            {t('findingWorker.available', 'AVAILABLE NOW')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* ── Action Buttons ── */}
                    <View style={styles.actionRow}>
                      {/* Profile Button */}
                      <TouchableOpacity
                        style={[
                          styles.profileBtn,
                          {
                            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border.default,
                            backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                          },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: '/worker-details',
                            params: {
                              id: bid.worker?._id,
                              jobId,
                              bidId: bid._id,
                              proposedPrice: String(bid.proposedPrice || ''),
                            },
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.profileBtnText, { color: theme.colors.text.primary }]}>
                          {t('bidsList.profileBtn', 'Profile')}
                        </Text>
                        <ChevronRight
                          size={13}
                          color={theme.colors.text.muted}
                          style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                        />
                      </TouchableOpacity>

                      {/* Hire Button */}
                      <TouchableOpacity
                        style={[styles.hireBtn, (isDeploying || !!accepting) && { opacity: 0.65 }]}
                        onPress={() => handleAccept(bid._id)}
                        disabled={isDeploying || !!accepting}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={[primaryColor, secondaryColor || '#16a34a']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        {isDeploying ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <View style={styles.hireInner}>
                            <Zap size={14} color="#FFFFFF" fill="#FFFFFF" />
                            <Text style={styles.hireBtnText}>
                              {t('bidsList.hireUstad', 'Hire Ustad')}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </AnimatedRN.View>
              );
            })}
        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
    gap: 4,
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Skeleton Card
  skeletonCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  // Proposal Card
  cardContainer: {
    marginBottom: 14,
  },
  proposalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0B0F17',
  },
  workerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  workerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewCountText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Quoted Price
  priceBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  priceTag: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '900',
  },

  // Message Container
  messageContainer: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hireBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hireInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hireBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyRefreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

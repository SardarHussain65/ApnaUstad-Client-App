import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Star,
  Clock,
  Banknote,
  ShieldCheck,
  Users,
  ChevronRight,
  Zap,
  TrendingUp,
} from 'lucide-react-native';
import AnimatedRN, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { alpha, BorderRadius, useTheme } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../services/api';

const GOLD = '#F59E0B';

function StarRating({ value, textColor }: { value: number; textColor: string }) {
  return (
    <View style={styles.starRow}>
      <Star size={12} color={GOLD} fill={GOLD} />
      <Text style={[styles.ratingNum, { color: textColor }]}>{value?.toFixed(1) || '5.0'}</Text>
    </View>
  );
}

function StatChip({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <View style={[styles.statChip, { borderColor: alpha(color, 0.22), backgroundColor: alpha(color, 0.08) }]}>
      <Icon size={11} color={color} />
      <Text style={[styles.statChipText, { color }]}>{label}</Text>
    </View>
  );
}

export default function BidsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = theme.colors;
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [bids, setBids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    fetchBids();
  }, [jobId]);

  const fetchBids = async () => {
    try {
      const res = await api.get(`/jobs/${jobId}/bids`);
      setBids(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (bidId: string) => {
    setAccepting(bidId);
    try {
      const res = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`);
      router.replace({ pathname: '/transaction-details', params: { id: res.data.data._id } });
    } catch (e) {
      console.error(e);
    } finally {
      setAccepting(null);
    }
  };

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={[styles.loadingTitle, { color: colors.text.primary }]}>{t('bidsList.findingUstads')}</Text>
          <Text style={[styles.loadingSub, { color: colors.text.muted }]}>{t('bidsList.fetchingBids')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <View style={{ flex: 1 }}>
        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + 8,
              backgroundColor: theme.isDark ? 'rgba(5,5,16,0.82)' : colors.background.screen,
              borderBottomColor: colors.border.subtle,
            },
          ]}
        >
          <BlurView intensity={40} tint={theme.blurTint} style={StyleSheet.absoluteFillObject} />

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface.subtle, borderColor: colors.border.subtle }]}
            onPress={() => router.back()}
          >
            <ArrowLeft color={colors.text.primary} size={20} />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={[styles.topBarTitle, { color: colors.text.primary }]}>{t('bidsList.headerTitle')}</Text>
            <View
              style={[
                styles.countPill,
                { borderColor: alpha(colors.brand.primary, 0.25), backgroundColor: alpha(colors.brand.primary, 0.08) },
              ]}
            >
              <Users size={10} color={colors.brand.primary} />
              <Text style={[styles.countPillText, { color: colors.brand.primary }]}>
                {t('bidsList.countLabel', { count: bids.length })}
              </Text>
            </View>
          </View>

          <View style={{ width: 42 }} />
        </View>

        {/* ── List ─────────────────────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 86,
            paddingBottom: 40,
            paddingHorizontal: 16,
          }}
        >
          {bids.length === 0 && (
            <AnimatedRN.View entering={FadeInDown.delay(150).duration(500)} style={styles.emptyBox}>
              <View style={[styles.emptyIconRing, { borderColor: colors.border.subtle, backgroundColor: colors.surface.card }]}>
                <TrendingUp size={26} color={colors.text.muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('bidsList.noBidsYet')}</Text>
              <Text style={[styles.emptySub, { color: colors.text.muted }]}>{t('bidsList.noBidsSub')}</Text>
            </AnimatedRN.View>
          )}

          {bids.map((bid, index) => {
            const isDeploying = accepting === bid._id;
            const rating = bid.worker?.averageRating ?? bid.worker?.rating ?? 5;

            return (
              <AnimatedRN.View
                key={bid._id}
                entering={FadeInDown.delay(index * 80).duration(450)}
                style={{ marginBottom: 14 }}
              >
                <View
                  style={[
                    styles.offerCard,
                    {
                      backgroundColor: colors.surface.card,
                      borderColor: index === 0 ? alpha(colors.brand.primary, 0.4) : colors.border.subtle,
                    },
                  ]}
                >
                  {/* ── Card Header ────────────────────────────────────── */}
                  <View style={styles.cardTop}>
                    <View style={styles.workerRow}>
                      <View style={styles.avatarWrap}>
                        <Image
                          source={{
                            uri:
                              bid.worker?.profileImage ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(bid.worker?.fullName || 'U')}&background=random`,
                          }}
                          style={[styles.avatar, { borderColor: colors.border.subtle }]}
                        />
                        <View style={[styles.avatarOnline, { backgroundColor: colors.status.success, borderColor: colors.surface.card }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.workerName, { color: colors.text.primary }]} numberOfLines={1}>
                          {bid.worker?.fullName || t('common.anonymous', { defaultValue: 'Ustad' })}
                        </Text>
                        <StarRating value={rating} textColor={colors.text.secondary} />
                      </View>
                    </View>

                    <View style={styles.priceBlock}>
                      <Text style={[styles.priceLabel, { color: colors.text.muted }]}>{t('bidsList.quotedPrice')}</Text>
                      <Text style={[styles.priceValue, { color: colors.brand.primary }]}>
                        Rs. {Number(bid.proposedPrice || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {!!bid.message && (
                    <View style={[styles.msgBox, { backgroundColor: colors.surface.subtle, borderLeftColor: colors.brand.primary }]}>
                      <Text style={[styles.msgText, { color: colors.text.secondary }]} numberOfLines={3}>
                        {bid.message}
                      </Text>
                    </View>
                  )}

                  <View style={styles.chipsRow}>
                    <StatChip icon={ShieldCheck} label={t('findingWorker.verified', { defaultValue: 'Verified' })} color={colors.status.success} />
                    <StatChip icon={Clock} label={t('findingWorker.available', { defaultValue: 'Available' })} color={colors.brand.worker} />
                    {bid.estimatedDays ? (
                      <StatChip icon={Banknote} label={t('bidsList.estDaysLabel', { count: bid.estimatedDays })} color={colors.brand.primary} />
                    ) : null}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.reviewBtn, { borderColor: colors.border.subtle, backgroundColor: colors.surface.subtle }]}
                      onPress={() =>
                        router.push({
                          pathname: '/worker-details',
                          params: { id: bid.worker?._id, jobId, bidId: bid._id },
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.reviewBtnText, { color: colors.text.primary }]}>{t('bidsList.profileBtn')}</Text>
                      <ChevronRight size={13} color={colors.text.muted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.deployBtn, isDeploying && { opacity: 0.6 }]}
                      onPress={() => handleAccept(bid._id)}
                      disabled={isDeploying || !!accepting}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={colors.gradients.primary as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {isDeploying ? (
                        <ActivityIndicator size="small" color={colors.button.primaryText} />
                      ) : (
                        <>
                          <Zap size={15} color={colors.button.primaryText} fill={colors.button.primaryText} />
                          <Text style={[styles.deployText, { color: colors.button.primaryText }]}>{t('bidsList.hireUstad')}</Text>
                        </>
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

const styles = StyleSheet.create({
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingTitle: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  loadingSub: { fontSize: 13 },

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
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { alignItems: 'center', gap: 4 },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  countPillText: { fontSize: 10, fontWeight: '800' },

  offerCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
  },
  avatarOnline: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  workerName: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontSize: 12, fontWeight: '700' },

  priceBlock: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  priceValue: { fontSize: 19, fontWeight: '900' },

  msgBox: {
    borderRadius: 12,
    padding: 11,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  msgText: { fontSize: 13, lineHeight: 19 },

  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statChipText: { fontSize: 10, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 10 },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewBtnText: { fontSize: 12, fontWeight: '700' },

  deployBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deployText: { fontSize: 13, fontWeight: '800' },

  emptyBox: { alignItems: 'center', marginTop: 72, paddingHorizontal: 32 },
  emptyIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
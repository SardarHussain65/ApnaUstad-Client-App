import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  CreditCard,
  Receipt,
  CalendarDays,
  Banknote,
  Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';

import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { GlassCard } from '../home/GlassCard';
import { Skeleton, useShimmerTranslateX } from '../ui/Skeleton';

// ─── Filter Constants ──────────────────────────────────────────────────────────
const FILTERS = ['All', 'Paid', 'Pending'] as const;
type FilterType = typeof FILTERS[number];

interface PaymentEntry {
  _id: string;
  status: string;
  amount: number;
  updatedAt: string;
  paymentMethod?: string;
  booking?: {
    _id: string;
    category?: string;
    description?: string;
  };
  worker?: {
    _id?: string;
    fullName?: string;
    profileImage?: string;
  };
}

interface ClientWalletViewProps {
  payments: PaymentEntry[];
  summary: {
    total: number;
    paid: number;
    payable: number;
    pending: number;
    cancelled: number;
  };
  activeFilter: string;
  onFilterChange: (filter: any) => void;
  refreshing: boolean;
  onRefresh: () => void;
  walletBalance?: number;
  walletTransactions?: any[];
  isLoading?: boolean;
}

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'AU';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');
};

export function ClientWalletView({
  payments,
  summary,
  activeFilter,
  onFilterChange,
  refreshing,
  onRefresh,
  isLoading = false,
}: ClientWalletViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const insets = useSafeAreaInsets();
  const translateX = useShimmerTranslateX();

  // Normalize and sort payments chronologically descending
  const paymentList = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [payments]);

  // Filter based on user selection
  const filteredPayments = useMemo(() => {
    if (activeFilter === 'All') return paymentList;
    if (activeFilter === 'Paid') {
      return paymentList.filter(p => p.status?.toLowerCase() === 'paid');
    }
    if (activeFilter === 'Pending' || activeFilter === 'Payable') {
      return paymentList.filter(p => p.status?.toLowerCase() !== 'paid');
    }
    return paymentList;
  }, [paymentList, activeFilter]);

  const totalSpent = summary?.paid || summary?.total || 0;
  const pendingAmount = summary?.payable || summary?.pending || 0;
  const paidCount = paymentList.filter(p => p.status?.toLowerCase() === 'paid').length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.m }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.cyan}
          colors={[colors.cyan]}
        />
      }
    >
      {/* ── 1. Clean Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, typography.threeD, { color: theme.colors.text.primary }]}>
          {t('wallet.clientPaymentsTitle', 'Payments & Spending')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.text.muted }]}>
          {t('wallet.clientPaymentsDesc', 'Receipts and spending history for your home services')}
        </Text>
      </View>

      {/* ── 2. Total Spending Overview Hero Card ── */}
      {isLoading && payments.length === 0 ? (
        <View style={styles.heroSection}>
          <Skeleton width="100%" height={140} borderRadius={24} translateX={translateX} />
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(450)} style={styles.heroSection}>
          <GlassCard
            style={styles.heroCard}
            intensity={36}
            glowColor={colors.success}
            hasGlow
            gradient={[alpha(colors.success, 0.22), alpha(theme.colors.surface.card, 0.9), alpha(colors.cyan, 0.08)]}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <View style={styles.heroLabelRow}>
                  <Receipt size={14} color={colors.success} strokeWidth={2.4} />
                  <Text style={[styles.heroLabel, { color: colors.success }]}>
                    {t('wallet.totalPaidLabel', 'TOTAL SPENT ON SERVICES')}
                  </Text>
                </View>

                <Text style={[styles.heroAmount, typography.threeD, { color: theme.colors.text.primary }]}>
                  Rs. {totalSpent.toLocaleString()}
                </Text>

                {/* Sub-metrics pill row */}
                <View style={styles.heroMetricsRow}>
                  <View style={[styles.metricPill, { backgroundColor: alpha(colors.success, 0.12) }]}>
                    <CheckCircle2 size={11} color={colors.success} strokeWidth={2.5} />
                    <Text style={[styles.metricText, { color: colors.success }]}>
                      {paidCount} {t('wallet.paidServices', 'Jobs Paid')}
                    </Text>
                  </View>

                  {pendingAmount > 0 ? (
                    <View style={[styles.metricPill, { backgroundColor: alpha(colors.worker, 0.14) }]}>
                      <Clock size={11} color={colors.worker} strokeWidth={2.5} />
                      <Text style={[styles.metricText, { color: colors.worker }]}>
                        Rs. {pendingAmount.toLocaleString()} {t('wallet.due', 'Due')}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.metricPill, { backgroundColor: alpha(theme.colors.text.primary, 0.05) }]}>
                      <Sparkles size={11} color={theme.colors.text.muted} strokeWidth={2.2} />
                      <Text style={[styles.metricText, { color: theme.colors.text.muted }]}>
                        {t('wallet.allSettled', 'All settled')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.walletIconWrap, { backgroundColor: alpha(colors.success, 0.12), borderColor: alpha(colors.success, 0.25) }]}>
                <Banknote size={26} color={colors.success} strokeWidth={2} />
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* ── 3. Simple Filter Pills ── */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter || (filter === 'Pending' && activeFilter === 'Payable');
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => onFilterChange(filter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? alpha(colors.cyan, 0.14) : alpha(theme.colors.text.primary, 0.04),
                    borderColor: isActive ? alpha(colors.cyan, 0.38) : theme.colors.border.subtle,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? colors.cyan : theme.colors.text.muted },
                  ]}
                >
                  {filter === 'All'
                    ? t('wallet.all', 'All Receipts')
                    : filter === 'Paid'
                    ? t('wallet.paid', 'Paid')
                    : t('wallet.payable', 'Pending Payment')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── 4. Receipts & Payment History List ── */}
      <View style={styles.listSection}>
        {isLoading && payments.length === 0 ? (
          <View style={styles.cardsContainer}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                width="100%"
                height={76}
                borderRadius={18}
                translateX={translateX}
                style={{ marginBottom: 10 }}
              />
            ))}
          </View>
        ) : filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: alpha(theme.colors.text.primary, 0.05) }]}>
              <Receipt size={32} color={theme.colors.text.muted} strokeWidth={1.8} />
            </View>
            <Text style={[styles.emptyTitle, typography.threeD, { color: theme.colors.text.primary }]}>
              {t('wallet.noPaymentsTitle', 'No Payment Receipts Yet')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.text.muted }]}>
              {t('wallet.noPaymentsDesc', 'When an Ustad completes your job and you settle payment, your receipts will be tracked here.')}
            </Text>

            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.cyan }]}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.82}
            >
              <Text style={styles.emptyBtnText}>{t('home.client.bookServiceBtn', 'Browse Services')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {filteredPayments.map((payment, index) => {
              const isPaid = payment.status?.toLowerCase() === 'paid';
              const serviceTitle = payment.booking?.category || t('wallet.serviceBooking', 'Home Service');
              const workerName = payment.worker?.fullName || t('common.ustad', 'Ustad');
              const workerAvatar = payment.worker?.profileImage || '';
              const paymentDate = new Date(payment.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <Animated.View
                  key={payment._id}
                  entering={FadeInRight.delay(index * 50).duration(400)}
                  layout={Layout.springify()}
                >
                  <TouchableOpacity
                    activeOpacity={0.84}
                    onPress={() => {
                      if (payment.booking?._id) {
                        router.push({
                          pathname: '/transaction-details',
                          params: { id: payment.booking._id },
                        });
                      }
                    }}
                    style={[
                      styles.receiptCard,
                      {
                        backgroundColor: theme.isDark ? alpha(theme.colors.background.screen, 0.9) : theme.colors.surface.card,
                        borderColor: isPaid ? alpha(colors.success, 0.25) : alpha(colors.worker, 0.3),
                        borderLeftWidth: 3.5,
                        borderLeftColor: isPaid ? colors.success : colors.worker,
                      },
                    ]}
                  >
                    {/* Top Row: Service Category & Status Pill */}
                    <View style={styles.cardTopRow}>
                      <Text
                        style={[styles.serviceTitle, typography.threeD, { color: theme.colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {serviceTitle}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isPaid ? alpha(colors.success, 0.12) : alpha(colors.worker, 0.12),
                            borderColor: isPaid ? alpha(colors.success, 0.3) : alpha(colors.worker, 0.3),
                          },
                        ]}
                      >
                        {isPaid ? (
                          <CheckCircle2 size={11} color={colors.success} strokeWidth={2.5} />
                        ) : (
                          <Clock size={11} color={colors.worker} strokeWidth={2.5} />
                        )}
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isPaid ? colors.success : colors.worker },
                          ]}
                        >
                          {isPaid ? t('wallet.paid', 'Paid') : t('wallet.payable', 'Cash to Pay')}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Row: Ustad Info & Date */}
                    <View style={styles.cardMiddleRow}>
                      <View style={styles.workerInfo}>
                        <View style={[styles.workerAvatarWrap, { borderColor: alpha(theme.colors.text.primary, 0.12) }]}>
                          {workerAvatar ? (
                            <Image source={{ uri: workerAvatar }} style={styles.workerAvatarImg} />
                          ) : (
                            <Text style={[styles.workerInitials, { color: colors.cyan }]}>
                              {initialsFor(workerName)}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.workerName, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                          {t('wallet.paidTo', 'Paid to')} {workerName}
                        </Text>
                      </View>

                      <View style={styles.dateInfo}>
                        <CalendarDays size={11} color={theme.colors.text.muted} strokeWidth={2} />
                        <Text style={[styles.dateText, { color: theme.colors.text.muted }]}>
                          {paymentDate}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Cash Payment Method & Amount */}
                    <View style={[styles.cardFooterRow, { borderTopColor: alpha(theme.colors.text.primary, 0.06) }]}>
                      <View style={styles.paymentMethodGroup}>
                        <CreditCard size={13} color={theme.colors.text.muted} strokeWidth={2.2} />
                        <Text style={[styles.paymentMethodText, { color: theme.colors.text.muted }]}>
                          {payment.paymentMethod === 'online' ? t('wallet.onlinePayment', 'Online') : t('wallet.cashPayment', 'Cash Settlement')}
                        </Text>
                      </View>

                      <View style={styles.amountRightGroup}>
                        <Text style={[styles.amountValue, { color: isPaid ? colors.success : colors.worker }]}>
                          Rs. {Number(payment.amount || 0).toLocaleString()}
                        </Text>
                        <ChevronRight size={15} color={alpha(theme.colors.text.primary, 0.35)} strokeWidth={2.4} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.m,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  heroSection: {
    marginBottom: Spacing.m,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  heroLeft: {
    flex: 1,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  metricText: {
    fontSize: 10,
    fontWeight: '800',
  },
  walletIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listSection: {
    marginTop: 4,
  },
  cardsContainer: {
    gap: 10,
  },
  receiptCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  workerAvatarWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  workerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  workerInitials: {
    fontSize: 9,
    fontWeight: '900',
  },
  workerName: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  paymentMethodGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: 10,
  },
  emptyBtnText: {
    color: '#001014',
    fontSize: 13,
    fontWeight: '800',
  },
});

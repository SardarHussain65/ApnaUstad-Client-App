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

import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography, getBookingCardPalette } from '../../constants/Theme';
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
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.id === 'current'
                  ? 'rgba(8, 38, 28, 0.86)'
                  : theme.isDark
                    ? '#0B2B1E'
                    : '#DCFCE7',
                borderColor: '#22C55E',
              },
            ]}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <View style={styles.heroLabelRow}>
                  <Receipt size={15} color={theme.isDark ? '#4ADE80' : '#064E3B'} strokeWidth={2.4} />
                  <Text style={[styles.heroLabel, { color: theme.isDark ? '#4ADE80' : '#064E3B' }]}>
                    {t('wallet.totalPaidLabel', 'TOTAL SPENT ON SERVICES')}
                  </Text>
                </View>

                <Text style={[styles.heroAmount, { color: theme.colors.text.primary }]}>
                  Rs. {totalSpent.toLocaleString()}
                </Text>

                {/* Sub-metrics pill row */}
                <View style={styles.heroMetricsRow}>
                  <View
                    style={[
                      styles.metricPill,
                      {
                        backgroundColor: theme.isDark ? 'rgba(34, 197, 94, 0.22)' : '#A7F3D0',
                      },
                    ]}
                  >
                    <CheckCircle2 size={12} color={theme.isDark ? '#4ADE80' : '#064E3B'} strokeWidth={2.5} />
                    <Text style={[styles.metricText, { color: theme.isDark ? '#4ADE80' : '#064E3B' }]}>
                      {paidCount} {t('wallet.paidServices', 'Jobs Paid')}
                    </Text>
                  </View>

                  {pendingAmount > 0 ? (
                    <View
                      style={[
                        styles.metricPill,
                        {
                          backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.24)' : '#FDE68A',
                        },
                      ]}
                    >
                      <Clock size={12} color={theme.isDark ? '#FBBF24' : '#78350F'} strokeWidth={2.5} />
                      <Text style={[styles.metricText, { color: theme.isDark ? '#FBBF24' : '#78350F' }]}>
                        Rs. {pendingAmount.toLocaleString()} {t('wallet.due', 'Due')}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.metricPill,
                        {
                          backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                        },
                      ]}
                    >
                      <Sparkles size={12} color={theme.colors.text.secondary} strokeWidth={2.2} />
                      <Text style={[styles.metricText, { color: theme.colors.text.secondary }]}>
                        {t('wallet.allSettled', 'All settled')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View
                style={[
                  styles.walletIconWrap,
                  {
                    backgroundColor: theme.isDark ? '#164E35' : '#A7F3D0',
                    borderColor: '#22C55E',
                  },
                ]}
              >
                <Banknote size={27} color={theme.isDark ? '#4ADE80' : '#064E3B'} strokeWidth={2.2} />
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── 3. Simple Filter Pills ── */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter || (filter === 'Pending' && activeFilter === 'Payable');
            const activeBg = theme.isDark ? theme.colors.tabBar.activeBackground : '#1D4ED8';
            const activeBorder = theme.isDark ? colors.cyan : '#1D4ED8';
            const activeText = theme.isDark ? colors.cyan : '#FFFFFF';
            const inactiveBg = theme.isDark ? theme.colors.surface.card : '#F1F5F9';
            const inactiveBorder = theme.colors.border.default;
            const inactiveText = theme.colors.text.secondary;

            return (
              <TouchableOpacity
                key={filter}
                onPress={() => onFilterChange(filter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? activeBg : inactiveBg,
                    borderColor: isActive ? activeBorder : inactiveBorder,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive ? activeText : inactiveText,
                      fontWeight: isActive ? '800' : '600',
                    },
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
              <Text style={[styles.emptyBtnText, { color: theme.isDark ? '#001014' : '#FFFFFF' }]}>
                {t('wallet.browseServices', 'Browse Services')}
              </Text>
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

              const palette = getBookingCardPalette(theme, isPaid ? 'completed' : 'pending', !isPaid);

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
                        backgroundColor: palette.cardBg,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    {/* Top Row: Service Category & Status Pill */}
                    <View style={styles.cardTopRow}>
                      <Text
                        style={[styles.serviceTitle, { color: theme.colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {serviceTitle}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: palette.statusPillBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: palette.statusPillText },
                          ]}
                        >
                          {isPaid ? t('wallet.paid', 'Paid') : t('wallet.payable', 'Cash to Pay')}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Row: Ustad Info & Date */}
                    <View style={styles.cardMiddleRow}>
                      <View style={styles.workerInfo}>
                        <View style={[styles.workerAvatarWrap, { backgroundColor: palette.avatarBg }]}>
                          {workerAvatar ? (
                            <Image source={{ uri: workerAvatar }} style={styles.workerAvatarImg} />
                          ) : (
                            <Text style={[styles.workerInitials, { color: palette.avatarText }]}>
                              {initialsFor(workerName)}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.workerName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                          {t('wallet.paidTo', 'Paid to')} {workerName}
                        </Text>
                      </View>

                      <Text style={[styles.dateText, { color: theme.colors.text.secondary }]}>
                        {paymentDate}
                      </Text>
                    </View>

                    {/* Bottom Row: Cash Payment Method & Amount */}
                    <View style={[styles.cardFooterRow, { borderTopColor: palette.dividerColor }]}>
                      <Text style={[styles.paymentMethodText, { color: theme.colors.text.secondary }]}>
                        {payment.paymentMethod === 'online' ? t('wallet.onlinePayment', 'Online') : t('wallet.cashPayment', 'Cash Settlement')}
                      </Text>

                      <View style={styles.amountRightGroup}>
                        <Text style={[styles.amountValue, { color: theme.colors.text.primary }]}>
                          Rs. {Number(payment.amount || 0).toLocaleString()}
                        </Text>
                        <ChevronRight size={17} color={theme.colors.text.secondary} strokeWidth={2.4} />
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
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 3,
  },
  heroSection: {
    marginBottom: Spacing.m,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1.8,
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
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
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '700',
  },
  walletIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1.6,
  },
  filterText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  listSection: {
    marginTop: 4,
  },
  cardsContainer: {
    gap: 14,
  },
  receiptCard: {
    borderRadius: 20,
    borderWidth: 1.8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
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
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  workerAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  workerInitials: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1.2,
    gap: 8,
  },
  paymentMethodText: {
    fontSize: 14.5,
    fontWeight: '500',
  },
  amountRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountValue: {
    fontSize: 16.5,
    fontWeight: '800',
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
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: 12,
  },
  emptyBtnText: {
    color: '#001014',
    fontSize: 14,
    fontWeight: '800',
  },
});

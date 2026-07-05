import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  RefreshCw,
  Info,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { GlassCard } from '../home/GlassCard';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WorkerWallet } from '../../hooks';

// ─── Constants & Types ────────────────────────────────────────────────────────
interface WalletTransaction {
  _id: string;
  type: 'recharge' | 'commission_deduction' | 'specialty_subscription' | 'refund' | 'adjustment';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

interface WalletTopUpRequest {
  _id: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface PaymentEntry {
  _id: string;
  status: string;
  amount: number;
  updatedAt: string;
  booking?: {
    _id: string;
    category?: string;
  };
}

interface WorkerWalletViewProps {
  wallet: WorkerWallet | null;
  transactions: WalletTransaction[];
  topUps: WalletTopUpRequest[];
  payments: PaymentEntry[];
  summary: {
    total: number;
    paid: number;
    payable: number;
    pending: number;
    cancelled: number;
  };
  workerTab: 'wallet' | 'topups' | 'earnings';
  onTabChange: (tab: 'wallet' | 'topups' | 'earnings') => void;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenRecharge: () => void;
}

const formatMoney = (value = 0) => `Rs. ${Number(value || 0).toLocaleString(undefined, {
  maximumFractionDigits: 2,
})}`;

function SummaryChip({ label, value, color, theme }: { label: string; value: number; color: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <GlassCard
      intensity={24}
      padding={12}
      style={[styles.chipCard, { borderColor: color + '48' }]}
      glowColor={color}
      gradient={[color + '5C', theme.colors.brand.primary + '26', alpha(theme.colors.surface.card, 0.18)]}
    >
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {formatMoney(value)}
      </Text>
      <Text style={[styles.chipLabel, { color: theme.colors.text.secondary }]}>{label}</Text>
    </GlassCard>
  );
}

export function WorkerWalletView({
  wallet,
  transactions,
  topUps,
  payments,
  summary,
  workerTab,
  onTabChange,
  refreshing,
  onRefresh,
  onOpenRecharge,
}: WorkerWalletViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();

  const requiredBalance = wallet?.requiredBalance ?? 500;
  const availableBalance = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const reservedBalance = wallet?.reservedBalance ?? 0;
  const isBalanceLow = wallet ? availableBalance < requiredBalance : false;

  const totalEarnings = (summary.paid || 0) + (summary.payable || 0);

  const topUpSummary = topUps.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + item.amount;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 } as Record<WalletTopUpRequest['status'], number>);

  const cardGradient = (color: string, secondary: string): [string, string, ...string[]] => [
    color + '5C',
    secondary + '26',
    alpha(theme.colors.surface.card, 0.18),
  ];

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('wallet.title')}</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.text.muted }]}>{t('wallet.workerSub')}</Text>
      </View>

      {/* Low Balance Warning Banner */}
      {isBalanceLow && (
        <Animated.View entering={FadeInDown.duration(600)} style={[styles.warningBanner, {
          backgroundColor: alpha(colors.error, 0.12),
          borderColor: alpha(colors.error, 0.24),
        }]}>
          <AlertCircle size={20} color={colors.error} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.warningTitle, { color: '#FF6B63' }]}>{t('wallet.lowWalletBalance')}</Text>
            <Text style={[styles.warningSub, { color: theme.colors.text.muted }]}>
              {t('wallet.lowBalanceWarning', { amount: requiredBalance.toLocaleString() })}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Wallet balance hero */}
      <Animated.View entering={FadeInDown.duration(800)} style={styles.balanceSection}>
        <GlassCard
          style={styles.balanceCard}
          intensity={44}
          padding={20}
          hasGlow
          glowColor={isBalanceLow ? colors.error : colors.cyan}
          gradient={isBalanceLow
            ? [alpha(colors.error, 0.68), alpha(theme.colors.brand.accent, 0.28), alpha(theme.colors.surface.card, 0.16)]
            : [alpha(colors.cyan, 0.62), alpha(theme.colors.brand.primary, 0.36), alpha(theme.colors.brand.secondary, 0.18)]}
        >
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceEyebrowRow}>
              <Wallet size={14} color={colors.cyan} strokeWidth={2.2} />
              <Text style={[styles.balanceEyebrow, { color: colors.cyan }]}>{t('wallet.workWallet').toUpperCase()}</Text>
            </View>
            <View style={[
              styles.balanceEligibilityPill,
              { borderColor: (isBalanceLow ? colors.error : colors.success) + '55' },
            ]}>
              <View style={[styles.statusIndicator, { backgroundColor: isBalanceLow ? colors.error : colors.success }]} />
              <Text style={[styles.balanceEligibilityText, { color: isBalanceLow ? '#FF6B63' : colors.success }]}>
                {isBalanceLow ? t('wallet.topUpNeeded') : t('wallet.jobReady')}
              </Text>
            </View>
          </View>

          <View style={[styles.balanceContent, styles.workerBalanceContent]}>
            <View style={styles.balanceTextGroup}>
              <Text style={[styles.balanceLabel, { color: theme.colors.text.muted }]}>{t('wallet.availableBalance').toUpperCase()}</Text>
              <Text
                style={[styles.balanceAmount, typography.threeD, { color: isBalanceLow ? '#FF6B63' : theme.colors.text.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {formatMoney(availableBalance)}
              </Text>
              <Text style={[styles.balanceReserveText, { color: theme.colors.text.muted }]}>
                {reservedBalance > 0
                  ? `${formatMoney(reservedBalance)} ${t('wallet.heldActiveJobs')}`
                  : `${t('wallet.minimumReserve')} ${formatMoney(requiredBalance)}`}
              </Text>
            </View>
            <View style={[styles.walletIconWrap,
              { borderColor: alpha(colors.cyan, 0.35), backgroundColor: alpha(colors.cyan, 0.06) },
              isBalanceLow && { borderColor: alpha(colors.error, 0.4), backgroundColor: alpha(colors.error, 0.08) }
            ]}>
              <Wallet size={28} color={isBalanceLow ? colors.error : colors.cyan} strokeWidth={1.8} />
            </View>
          </View>

          {/* Quick actions inside card */}
          <TouchableOpacity
            style={[styles.rechargeBtn,
              { borderColor: alpha(colors.cyan, 0.35) },
              isBalanceLow && { backgroundColor: alpha(colors.error, 0.25), borderColor: alpha(colors.error, 0.4) }
            ]}
            onPress={onOpenRecharge}
          >
            <Plus size={18} color={isBalanceLow ? '#FF4F4F' : colors.cyan} strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={[styles.rechargeBtnText, { color: isBalanceLow ? '#FF4F4F' : colors.cyan }]}>{t('wallet.topUpWallet')}</Text>
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>

      {/* Earnings overview card */}
      <Animated.View entering={FadeInDown.delay(80).duration(700)} style={styles.earningsSection}>
        <GlassCard
          intensity={34}
          padding={0}
          style={styles.earningsOverviewCard}
          glowColor={colors.success}
          gradient={cardGradient(colors.success, colors.cyan)}
        >
          <View style={[styles.earningsOverviewHead, { borderBottomColor: theme.colors.border.subtle }]}>
            <View style={styles.earningsOverviewLead}>
              <View style={[styles.balanceEarningsIcon, {
                backgroundColor: alpha(colors.success, 0.1),
                borderColor: alpha(colors.success, 0.2),
              }]}>
                <Banknote size={22} color={colors.success} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.balanceEarningsLabel, { color: colors.success }]}>{t('wallet.totalEarnings').toUpperCase()}</Text>
                <Text style={[styles.balanceEarningsSub, { color: theme.colors.text.muted }]}>{t('wallet.totalEarningsDesc')}</Text>
              </View>
            </View>
            <Text
              style={[styles.balanceEarningsAmount, typography.threeD, { color: theme.colors.text.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatMoney(totalEarnings)}
            </Text>
          </View>

          <View style={[styles.balanceEarningsGrid, { borderTopColor: theme.colors.border.subtle }]}>
            <View style={[styles.balanceEarningsMetric, { borderRightColor: theme.colors.border.subtle }]}>
              <View style={[styles.earningsMetricDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.balanceEarningsMiniLabel, { color: theme.colors.text.muted }]}>{t('wallet.received')}</Text>
              <Text style={[styles.balanceEarningsMiniValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                {formatMoney(summary.paid)}
              </Text>
            </View>
            <View style={[styles.balanceEarningsMetric, { borderRightColor: theme.colors.border.subtle }]}>
              <View style={[styles.earningsMetricDot, { backgroundColor: '#00B8FF' }]} />
              <Text style={[styles.balanceEarningsMiniLabel, { color: theme.colors.text.muted }]}>{t('wallet.ready')}</Text>
              <Text style={[styles.balanceEarningsMiniValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                {formatMoney(summary.payable)}
              </Text>
            </View>
            <View style={[styles.balanceEarningsMetric, styles.balanceEarningsMetricLast, { borderRightColor: 'transparent' }]}>
              <View style={[styles.earningsMetricDot, { backgroundColor: '#FFB020' }]} />
              <Text style={[styles.balanceEarningsMiniLabel, { color: theme.colors.text.muted }]}>{t('wallet.upcoming')}</Text>
              <Text style={[styles.balanceEarningsMiniValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                {formatMoney(summary.pending)}
              </Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>

      {/* Wallet Statistics Grid */}
      <View style={styles.walletStatsHeader}>
        <Text style={[styles.walletStatsTitle, { color: theme.colors.text.primary }]}>{t('wallet.walletActivity')}</Text>
        <Text style={[styles.walletStatsCaption, { color: theme.colors.text.muted }]}>{t('wallet.walletActivityDesc')}</Text>
      </View>
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.summaryRow}>
        <GlassCard
          intensity={24}
          padding={12}
          style={[styles.chipCard, { borderColor: colors.success + '48' }]}
          glowColor={colors.success}
          gradient={cardGradient(colors.success, colors.cyan)}
        >
          <View style={[styles.chipDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.chipValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {formatMoney(wallet?.totalRecharged)}
          </Text>
          <Text style={[styles.chipLabel, { color: theme.colors.text.secondary }]}>{t('wallet.approvedTopUps')}</Text>
        </GlassCard>

        <GlassCard
          intensity={24}
          padding={12}
          style={[styles.chipCard, { borderColor: '#FF8C0048' }]}
          glowColor="#FF8C00"
          gradient={cardGradient('#FF8C00', '#FF1493')}
        >
          <View style={[styles.chipDot, { backgroundColor: '#FF8C00' }]} />
          <Text style={[styles.chipValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {formatMoney(wallet?.totalCommissionDeducted)}
          </Text>
          <Text style={[styles.chipLabel, { color: theme.colors.text.secondary }]}>{t('wallet.commissionsTaken')}</Text>
        </GlassCard>

        <GlassCard
          intensity={24}
          padding={12}
          style={[styles.chipCard, { borderColor: '#BF5AF248' }]}
          glowColor="#BF5AF2"
          gradient={cardGradient('#BF5AF2', colors.cyan)}
        >
          <View style={[styles.chipDot, { backgroundColor: '#BF5AF2' }]} />
          <Text style={[styles.chipValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {formatMoney(wallet?.totalSubscriptionDeducted)}
          </Text>
          <Text style={[styles.chipLabel, { color: theme.colors.text.secondary }]}>{t('wallet.categoryRenewals')}</Text>
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.summaryRow}>
        <SummaryChip label={t('wallet.pendingProofs')} value={topUpSummary.pending} color="#FFB020" theme={theme} />
        <SummaryChip label={t('wallet.rejectedProofs')} value={topUpSummary.rejected} color={colors.error} theme={theme} />
      </Animated.View>

      {/* Wallet & Earnings History Section */}
      <View style={styles.transactionsSection}>
        <View style={styles.walletRecordsHeader}>
          <View>
            <Text style={[styles.walletRecordsTitle, { color: theme.colors.text.primary }]}>{t('wallet.walletRecords')}</Text>
            <Text style={[styles.walletRecordsCaption, { color: theme.colors.text.muted }]}>{t('wallet.walletRecordsDesc')}</Text>
          </View>
          <View style={[styles.walletRecordsCount, { borderColor: alpha(colors.cyan, 0.3), backgroundColor: alpha(colors.cyan, 0.08) }]}>
            <Text style={[styles.walletRecordsCountText, { color: colors.cyan }]}>
              {workerTab === 'wallet' ? transactions.length : workerTab === 'topups' ? topUps.length : payments.length}
            </Text>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={[styles.segmentContainer, {
          backgroundColor: alpha(theme.colors.text.primary, 0.03),
          borderColor: alpha(theme.colors.text.primary, 0.06),
        }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              workerTab === 'wallet' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.subtle,
                }
              ]
            ]}
            onPress={() => onTabChange('wallet')}
          >
            <Text style={[styles.segmentText, workerTab === 'wallet' && styles.segmentTextActive, {
              color: workerTab === 'wallet' ? theme.colors.text.primary : theme.colors.text.muted,
            }]}>
              {t('wallet.tabLedger')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              workerTab === 'topups' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.subtle,
                }
              ]
            ]}
            onPress={() => onTabChange('topups')}
          >
            <Text style={[styles.segmentText, workerTab === 'topups' && styles.segmentTextActive, {
              color: workerTab === 'topups' ? theme.colors.text.primary : theme.colors.text.muted,
            }]}>
              {t('wallet.tabTopUps')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              workerTab === 'earnings' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.subtle,
                }
              ]
            ]}
            onPress={() => onTabChange('earnings')}
          >
            <Text style={[styles.segmentText, workerTab === 'earnings' && styles.segmentTextActive, {
              color: workerTab === 'earnings' ? theme.colors.text.primary : theme.colors.text.muted,
            }]}>
              {t('wallet.tabEarnings')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Switch View lists */}
        <View style={styles.transactionList}>
          {workerTab === 'wallet' && (
            <>
              {transactions.map((tx, index) => {
                const txConf = {
                  recharge: { color: colors.success, icon: ArrowDownLeft, labelKey: 'wallet.recharge' },
                  commission_deduction: { color: colors.worker, icon: ArrowUpRight, labelKey: 'wallet.commission' },
                  specialty_subscription: { color: theme.colors.brand.secondary, icon: ArrowUpRight, labelKey: 'wallet.categoryRenewal' },
                  refund: { color: '#00B8FF', icon: RefreshCw, labelKey: 'wallet.refund' },
                  adjustment: { color: colors.cyan, icon: Info, labelKey: 'wallet.adjustment' },
                }[tx.type] || { color: colors.cyan, icon: Info, labelKey: 'wallet.adjustment' };
                const IconComponent = txConf.icon;
                const isPositive = ['recharge', 'refund'].includes(tx.type);
                const dateStr = new Date(tx.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Animated.View
                    key={tx._id}
                    entering={FadeInRight.delay(index * 80).duration(500)}
                    layout={Layout.springify()}
                  >
                    <GlassCard
                      intensity={20}
                      style={[styles.transactionCard, { borderColor: txConf.color + '48' }]}
                      padding={14}
                      gradient={cardGradient(txConf.color, isPositive ? '#00B8FF' : '#FF1493')}
                    >
                      <View style={styles.txRow}>
                        <View style={[
                          styles.txIconBox,
                          { backgroundColor: txConf.color + '18', borderColor: txConf.color + '30' },
                        ]}>
                          <IconComponent size={18} color={txConf.color} strokeWidth={2} />
                        </View>

                        <View style={styles.txInfo}>
                          <Text style={[styles.txTitle, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>
                            {tx.description}
                          </Text>
                          <Text style={[styles.txDate, { color: theme.colors.text.muted }]}>{dateStr}</Text>
                        </View>

                        <View style={styles.txAmountGroup}>
                          <Text style={[styles.txAmount, { color: isPositive ? colors.success : colors.error }]}>
                            {isPositive ? '+' : '-'}Rs. {tx.amount.toLocaleString()}
                          </Text>
                          <Text style={[styles.txBalanceAfter, { color: theme.colors.text.muted }]}>Bal: Rs. {tx.balanceAfter.toLocaleString()}</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}

              {transactions.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Wallet size={40} color={theme.colors.text.muted} strokeWidth={1.2} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>{t('wallet.emptyTitle')}</Text>
                  <Text style={[styles.emptySub, { color: theme.colors.text.muted }]}>{t('wallet.noLedgerDesc')}</Text>
                </View>
              )}
            </>
          )}

          {workerTab === 'topups' && (
            <>
              {topUps.map((req, index) => {
                const conf = {
                  pending: { color: '#FFB020', icon: Clock, labelKey: 'wallet.pending' },
                  approved: { color: colors.success, icon: CheckCircle2, labelKey: 'wallet.approved' },
                  rejected: { color: colors.error, icon: XCircle, labelKey: 'wallet.rejected' },
                }[req.status] || { color: '#FFB020', icon: Clock, labelKey: 'wallet.pending' };
                const IconComponent = conf.icon;
                const dateStr = new Date(req.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Animated.View
                    key={req._id}
                    entering={FadeInRight.delay(index * 80).duration(500)}
                    layout={Layout.springify()}
                  >
                    <GlassCard
                      intensity={20}
                      style={[styles.transactionCard, { borderColor: conf.color + '48' }]}
                      padding={14}
                      gradient={cardGradient(conf.color, '#00B8FF')}
                    >
                      <View style={styles.txRow}>
                        <View style={[
                          styles.txIconBox,
                          { backgroundColor: conf.color + '18', borderColor: conf.color + '30' },
                        ]}>
                          <IconComponent size={18} color={conf.color} strokeWidth={2} />
                        </View>

                        <View style={styles.txInfo}>
                          <Text style={[styles.txTitle, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>
                            {t('wallet.topUpRequest')} ({req.method.toUpperCase()})
                          </Text>
                          <View style={styles.txMeta}>
                            <Text style={[styles.txDate, { color: theme.colors.text.muted }]}>{dateStr}</Text>
                            <View style={[styles.txStatusBadge, { backgroundColor: conf.color + '15' }]}>
                              <Text style={[styles.txStatusText, { color: conf.color }]}>
                                {t('wallet.' + req.status)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.txAmountGroup}>
                          <Text style={[styles.txAmount, { color: theme.colors.text.primary }]}>
                            Rs. {req.amount.toLocaleString()}
                          </Text>
                          <Text style={[styles.txCurrency, { color: theme.colors.text.muted }]}>PKR</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}

              {topUps.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Wallet size={40} color={theme.colors.text.muted} strokeWidth={1.2} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>{t('wallet.emptyTitle')}</Text>
                  <Text style={[styles.emptySub, { color: theme.colors.text.muted }]}>{t('wallet.noTopUpsDesc')}</Text>
                </View>
              )}
            </>
          )}

          {workerTab === 'earnings' && (
            <>
              {payments.map((item, index) => {
                const statusConf = {
                  paid: { color: colors.success, icon: CheckCircle2, labelKey: 'wallet.paid' },
                  payable: { color: '#00B8FF', icon: Clock, labelKey: 'wallet.payable' },
                  pending: { color: colors.worker, icon: AlertCircle, labelKey: 'wallet.pending' },
                  cancelled: { color: colors.error, icon: XCircle, labelKey: 'wallet.cancelled' },
                }[item.status.toLowerCase()] || { color: colors.worker, icon: AlertCircle, labelKey: 'wallet.pending' };
                const IconComponent = statusConf.icon;
                const category = item.booking?.category || 'Service';
                const dateStr = new Date(item.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <Animated.View
                    key={item._id}
                    entering={FadeInRight.delay(index * 80).duration(500)}
                    layout={Layout.springify()}
                  >
                    <GlassCard
                      intensity={20}
                      style={[styles.transactionCard, { borderColor: statusConf.color + '48' }]}
                      padding={14}
                      gradient={cardGradient(statusConf.color, '#00B8FF')}
                      onPress={() => {
                        if (item.booking?._id) {
                          router.push({
                            pathname: '/transaction-details',
                            params: { id: item.booking._id },
                          });
                        }
                      }}
                    >
                      <View style={styles.txRow}>
                        <View style={[
                          styles.txIconBox,
                          { backgroundColor: statusConf.color + '18', borderColor: statusConf.color + '30' },
                        ]}>
                          <IconComponent size={18} color={statusConf.color} strokeWidth={2} />
                        </View>

                        <View style={styles.txInfo}>
                          <Text style={[styles.txTitle, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>
                            {category}
                          </Text>
                          <View style={styles.txMeta}>
                            <Text style={[styles.txDate, { color: theme.colors.text.muted }]}>{dateStr}</Text>
                            <View style={[styles.txStatusBadge, { backgroundColor: statusConf.color + '15' }]}>
                              <Text style={[styles.txStatusText, { color: statusConf.color }]}>
                                {t('wallet.' + item.status.toLowerCase())}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.txAmountGroup}>
                          <Text style={[styles.txAmount, { color: colors.success }]}>
                            Rs. {item.amount.toLocaleString()}
                          </Text>
                          <Text style={[styles.txCurrency, { color: theme.colors.text.muted }]}>PKR</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}

              {payments.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Wallet size={40} color={theme.colors.text.muted} strokeWidth={1.2} />
                  <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>{t('wallet.noEarnings')}</Text>
                  <Text style={[styles.emptySub, { color: theme.colors.text.muted }]}>{t('wallet.noEarningsDesc')}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: Spacing.xs },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  scrollContent: {
    paddingHorizontal: Spacing.m,
    gap: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  warningTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  warningSub: { fontSize: 10, fontWeight: '600', lineHeight: 14 },
  balanceSection: { marginBottom: 4 },
  balanceCard: { borderRadius: 24 },
  balanceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  balanceEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  balanceEligibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusIndicator: { width: 5, height: 5, borderRadius: 2.5 },
  balanceEligibilityText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  balanceContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  workerBalanceContent: { marginBottom: 16 },
  balanceTextGroup: { gap: 4, flex: 1 },
  balanceLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  balanceAmount: { fontSize: 32, fontWeight: '900' },
  balanceReserveText: { fontSize: 10, fontWeight: '600' },
  walletIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeBtnText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  earningsSection: { marginBottom: 4 },
  earningsOverviewCard: { borderRadius: 22 },
  earningsOverviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  earningsOverviewLead: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  balanceEarningsIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  balanceEarningsLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  balanceEarningsSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  balanceEarningsAmount: { fontSize: 20, fontWeight: '900' },
  balanceEarningsGrid: { flexDirection: 'row' },
  balanceEarningsMetric: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    gap: 3,
    borderRightWidth: 1,
  },
  balanceEarningsMetricLast: { borderRightWidth: 0 },
  earningsMetricDot: { width: 4, height: 4, borderRadius: 2, marginBottom: 2 },
  balanceEarningsMiniLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  balanceEarningsMiniValue: { fontSize: 13, fontWeight: '900' },
  walletStatsHeader: { marginTop: 8 },
  walletStatsTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  walletStatsCaption: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  chipCard: { flex: 1, borderRadius: 14, minHeight: 74 },
  chipDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
  chipValue: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
  chipLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', textTransform: 'uppercase' },
  transactionsSection: { marginTop: 12 },
  walletRecordsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletRecordsTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  walletRecordsCaption: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  walletRecordsCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  walletRecordsCountText: { fontSize: 10, fontWeight: '900' },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
  },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  segmentBtnActive: { borderWidth: 1 },
  segmentText: { fontSize: 12, fontWeight: '700' },
  segmentTextActive: {},
  transactionList: { gap: 12 },
  transactionCard: { borderRadius: 18, borderWidth: 1 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1, minWidth: 0, gap: 4 },
  txTitle: { fontSize: 15, fontWeight: '900' },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 11, fontWeight: '600' },
  txStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  txStatusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  txAmountGroup: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 15, fontWeight: '900' },
  txBalanceAfter: { fontSize: 10, fontWeight: '600' },
  txCurrency: { fontSize: 9, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
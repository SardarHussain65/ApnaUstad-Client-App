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
import { Colors, Typography, Spacing } from '../../constants/Theme';
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

const TX_CONFIG: Record<string, { color: string; icon: any; labelKey: string }> = {
  recharge: { color: Colors.success, icon: ArrowDownLeft, labelKey: 'wallet.recharge' },
  commission_deduction: { color: '#FF8C00', icon: ArrowUpRight, labelKey: 'wallet.commission' },
  specialty_subscription: { color: '#BF5AF2', icon: ArrowUpRight, labelKey: 'wallet.categoryRenewal' },
  refund: { color: '#00B8FF', icon: RefreshCw, labelKey: 'wallet.refund' },
  adjustment: { color: Colors.cyan, icon: Info, labelKey: 'wallet.adjustment' },
};

const TOPUP_STATUS_CONFIG: Record<string, { color: string; icon: any; labelKey: string }> = {
  pending: { color: '#FFB020', icon: Clock, labelKey: 'wallet.pending' },
  approved: { color: Colors.success, icon: CheckCircle2, labelKey: 'wallet.approved' },
  rejected: { color: Colors.error, icon: XCircle, labelKey: 'wallet.rejected' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; labelKey: string }> = {
  paid: { color: Colors.success, icon: CheckCircle2, labelKey: 'wallet.paid' },
  payable: { color: '#00B8FF', icon: Clock, labelKey: 'wallet.payable' },
  pending: { color: '#FF8C00', icon: AlertCircle, labelKey: 'wallet.pending' },
  cancelled: { color: Colors.error, icon: XCircle, labelKey: 'wallet.cancelled' },
};

const formatMoney = (value = 0) => `Rs. ${Number(value || 0).toLocaleString(undefined, {
  maximumFractionDigits: 2,
})}`;

const cardGradient = (color: string, secondary = Colors.cyan): [string, string, ...string[]] => [
  color + '5C',
  secondary + '26',
  'rgba(4,9,24,0.18)',
];

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <GlassCard
      intensity={24}
      padding={12}
      style={[styles.chipCard, { borderColor: color + '48' }]}
      glowColor={color}
      gradient={cardGradient(color)}
    >
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={styles.chipValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {formatMoney(value)}
      </Text>
      <Text style={styles.chipLabel}>{label}</Text>
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

  const requiredBalance = wallet?.requiredBalance ?? 500;
  const availableBalance = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const reservedBalance = wallet?.reservedBalance ?? 0;
  const isBalanceLow = wallet ? availableBalance < requiredBalance : false;

  const totalEarnings = (summary.paid || 0) + (summary.payable || 0);

  const topUpSummary = topUps.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + item.amount;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 } as Record<WalletTopUpRequest['status'], number>);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.m }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.cyan}
          colors={[Colors.cyan]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, Typography.threeD]}>{t('wallet.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('wallet.workerSub')}</Text>
      </View>

      {/* Low Balance Warning Banner */}
      {isBalanceLow && (
        <Animated.View entering={FadeInDown.duration(600)} style={styles.warningBanner}>
          <AlertCircle size={20} color={Colors.error} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>{t('wallet.lowWalletBalance')}</Text>
            <Text style={styles.warningSub}>
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
          glowColor={isBalanceLow ? Colors.error : Colors.cyan}
          gradient={isBalanceLow
            ? ['rgba(255,59,48,0.68)', 'rgba(191,90,242,0.28)', 'rgba(30,18,38,0.16)']
            : ['rgba(0,245,255,0.62)', 'rgba(0,122,255,0.36)', 'rgba(191,90,242,0.18)']}
        >
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceEyebrowRow}>
              <Wallet size={14} color={Colors.cyan} strokeWidth={2.2} />
              <Text style={styles.balanceEyebrow}>{t('wallet.workWallet').toUpperCase()}</Text>
            </View>
            <View style={[
              styles.balanceEligibilityPill,
              { borderColor: (isBalanceLow ? Colors.error : Colors.success) + '55' },
            ]}>
              <View style={[styles.statusIndicator, { backgroundColor: isBalanceLow ? Colors.error : Colors.success }]} />
              <Text style={[styles.balanceEligibilityText, { color: isBalanceLow ? '#FF6B63' : Colors.success }]}>
                {isBalanceLow ? t('wallet.topUpNeeded') : t('wallet.jobReady')}
              </Text>
            </View>
          </View>

          <View style={[styles.balanceContent, styles.workerBalanceContent]}>
            <View style={styles.balanceTextGroup}>
              <Text style={styles.balanceLabel}>{t('wallet.availableBalance').toUpperCase()}</Text>
              <Text
                style={[styles.balanceAmount, Typography.threeD, { color: isBalanceLow ? '#FF6B63' : '#fff' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {formatMoney(availableBalance)}
              </Text>
              <Text style={styles.balanceReserveText}>
                {reservedBalance > 0
                  ? `${formatMoney(reservedBalance)} ${t('wallet.heldActiveJobs')}`
                  : `${t('wallet.minimumReserve')} ${formatMoney(requiredBalance)}`}
              </Text>
            </View>
            <View style={[styles.walletIconWrap, isBalanceLow && { borderColor: Colors.error + '40', backgroundColor: Colors.error + '08' }]}>
              <Wallet size={28} color={isBalanceLow ? Colors.error : Colors.cyan} strokeWidth={1.8} />
            </View>
          </View>

          {/* Quick actions inside card */}
          <TouchableOpacity
            style={[styles.rechargeBtn, isBalanceLow && { backgroundColor: Colors.error + '25', borderColor: Colors.error + '40' }]}
            onPress={onOpenRecharge}
          >
            <Plus size={18} color={isBalanceLow ? '#FF4F4F' : Colors.cyan} strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={[styles.rechargeBtnText, { color: isBalanceLow ? '#FF4F4F' : Colors.cyan }]}>{t('wallet.topUpWallet')}</Text>
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>

      {/* Earnings overview card */}
      <Animated.View entering={FadeInDown.delay(80).duration(700)} style={styles.earningsSection}>
        <GlassCard
          intensity={34}
          padding={0}
          style={styles.earningsOverviewCard}
          glowColor={Colors.success}
          gradient={['rgba(52,199,89,0.58)', 'rgba(0,184,255,0.3)', 'rgba(4,9,24,0.16)']}
        >
          <View style={styles.earningsOverviewHead}>
            <View style={styles.earningsOverviewLead}>
              <View style={styles.balanceEarningsIcon}>
                <Banknote size={22} color={Colors.success} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceEarningsLabel}>{t('wallet.totalEarnings').toUpperCase()}</Text>
                <Text style={styles.balanceEarningsSub}>{t('wallet.totalEarningsDesc')}</Text>
              </View>
            </View>
            <Text
              style={[styles.balanceEarningsAmount, Typography.threeD]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatMoney(totalEarnings)}
            </Text>
          </View>

          <View style={styles.balanceEarningsGrid}>
            <View style={styles.balanceEarningsMetric}>
              <View style={[styles.earningsMetricDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.balanceEarningsMiniLabel}>{t('wallet.received')}</Text>
              <Text style={styles.balanceEarningsMiniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                {formatMoney(summary.paid)}
              </Text>
            </View>
            <View style={styles.balanceEarningsMetric}>
              <View style={[styles.earningsMetricDot, { backgroundColor: '#00B8FF' }]} />
              <Text style={styles.balanceEarningsMiniLabel}>{t('wallet.ready')}</Text>
              <Text style={styles.balanceEarningsMiniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                {formatMoney(summary.payable)}
              </Text>
            </View>
            <View style={[styles.balanceEarningsMetric, styles.balanceEarningsMetricLast]}>
              <View style={[styles.earningsMetricDot, { backgroundColor: '#FFB020' }]} />
              <Text style={styles.balanceEarningsMiniLabel}>{t('wallet.upcoming')}</Text>
              <Text style={styles.balanceEarningsMiniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                {formatMoney(summary.pending)}
              </Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>

      {/* Wallet Statistics Grid */}
      <View style={styles.walletStatsHeader}>
        <Text style={styles.walletStatsTitle}>{t('wallet.walletActivity')}</Text>
        <Text style={styles.walletStatsCaption}>{t('wallet.walletActivityDesc')}</Text>
      </View>
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.summaryRow}>
        <GlassCard
          intensity={24}
          padding={12}
          style={[styles.chipCard, { borderColor: Colors.success + '48' }]}
          glowColor={Colors.success}
          gradient={cardGradient(Colors.success, '#00B8FF')}
        >
          <View style={[styles.chipDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.chipValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {formatMoney(wallet?.totalRecharged)}
          </Text>
          <Text style={styles.chipLabel}>{t('wallet.approvedTopUps')}</Text>
        </GlassCard>

        <GlassCard
          intensity={24}
          padding={12}
          style={[styles.chipCard, { borderColor: '#FF8C0048' }]}
          glowColor="#FF8C00"
          gradient={cardGradient('#FF8C00', '#FF1493')}
        >
          <View style={[styles.chipDot, { backgroundColor: '#FF8C00' }]} />
          <Text style={styles.chipValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {formatMoney(wallet?.totalCommissionDeducted)}
          </Text>
          <Text style={styles.chipLabel}>{t('wallet.commissionsTaken')}</Text>
        </GlassCard>

        <GlassCard
          intensity={24}
          padding={12}
          style={[styles.chipCard, { borderColor: '#BF5AF248' }]}
          glowColor="#BF5AF2"
          gradient={cardGradient('#BF5AF2', '#00B8FF')}
        >
          <View style={[styles.chipDot, { backgroundColor: '#BF5AF2' }]} />
          <Text style={styles.chipValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
            {formatMoney(wallet?.totalSubscriptionDeducted)}
          </Text>
          <Text style={styles.chipLabel}>{t('wallet.categoryRenewals')}</Text>
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.summaryRow}>
        <SummaryChip label={t('wallet.pendingProofs')} value={topUpSummary.pending} color="#FFB020" />
        <SummaryChip label={t('wallet.rejectedProofs')} value={topUpSummary.rejected} color={Colors.error} />
      </Animated.View>

      {/* Wallet & Earnings History Section */}
      <View style={styles.transactionsSection}>
        <View style={styles.walletRecordsHeader}>
          <View>
            <Text style={styles.walletRecordsTitle}>{t('wallet.walletRecords')}</Text>
            <Text style={styles.walletRecordsCaption}>{t('wallet.walletRecordsDesc')}</Text>
          </View>
          <View style={styles.walletRecordsCount}>
            <Text style={styles.walletRecordsCountText}>
              {workerTab === 'wallet' ? transactions.length : workerTab === 'topups' ? topUps.length : payments.length}
            </Text>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, workerTab === 'wallet' && styles.segmentBtnActive]}
            onPress={() => onTabChange('wallet')}
          >
            <Text style={[styles.segmentText, workerTab === 'wallet' && styles.segmentTextActive]}>
              {t('wallet.tabLedger')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, workerTab === 'topups' && styles.segmentBtnActive]}
            onPress={() => onTabChange('topups')}
          >
            <Text style={[styles.segmentText, workerTab === 'topups' && styles.segmentTextActive]}>
              {t('wallet.tabTopUps')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, workerTab === 'earnings' && styles.segmentBtnActive]}
            onPress={() => onTabChange('earnings')}
          >
            <Text style={[styles.segmentText, workerTab === 'earnings' && styles.segmentTextActive]}>
              {t('wallet.tabEarnings')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Switch View lists */}
        <View style={styles.transactionList}>
          {workerTab === 'wallet' && (
            <>
              {transactions.map((tx, index) => {
                const txConf = TX_CONFIG[tx.type] || TX_CONFIG.adjustment;
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
                          <Text style={[styles.txTitle, Typography.threeD]} numberOfLines={1}>
                            {tx.description}
                          </Text>
                          <Text style={styles.txDate}>{dateStr}</Text>
                        </View>

                        <View style={styles.txAmountGroup}>
                          <Text style={[styles.txAmount, { color: isPositive ? Colors.success : '#FF6B63' }]}>
                            {isPositive ? '+' : '-'}Rs. {tx.amount.toLocaleString()}
                          </Text>
                          <Text style={styles.txBalanceAfter}>Bal: Rs. {tx.balanceAfter.toLocaleString()}</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}

              {transactions.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Wallet size={40} color={Colors.textMuted} strokeWidth={1.2} />
                  <Text style={styles.emptyTitle}>{t('wallet.emptyTitle')}</Text>
                  <Text style={styles.emptySub}>{t('wallet.noLedgerDesc')}</Text>
                </View>
              )}
            </>
          )}

          {workerTab === 'topups' && (
            <>
              {topUps.map((req, index) => {
                const conf = TOPUP_STATUS_CONFIG[req.status] || TOPUP_STATUS_CONFIG.pending;
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
                          <Text style={[styles.txTitle, Typography.threeD]} numberOfLines={1}>
                            {t('wallet.topUpRequest')} ({req.method.toUpperCase()})
                          </Text>
                          <View style={styles.txMeta}>
                            <Text style={styles.txDate}>{dateStr}</Text>
                            <View style={[styles.txStatusBadge, { backgroundColor: conf.color + '15' }]}>
                              <Text style={[styles.txStatusText, { color: conf.color }]}>
                                {t('wallet.' + req.status)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.txAmountGroup}>
                          <Text style={[styles.txAmount, { color: '#fff' }]}>
                            Rs. {req.amount.toLocaleString()}
                          </Text>
                          <Text style={styles.txCurrency}>PKR</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}

              {topUps.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Wallet size={40} color={Colors.textMuted} strokeWidth={1.2} />
                  <Text style={styles.emptyTitle}>{t('wallet.emptyTitle')}</Text>
                  <Text style={styles.emptySub}>{t('wallet.noTopUpsDesc')}</Text>
                </View>
              )}
            </>
          )}

          {workerTab === 'earnings' && (
            <>
              {payments.map((item, index) => {
                const statusConf = STATUS_CONFIG[item.status.toLowerCase()] || STATUS_CONFIG.pending;
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
                          <Text style={[styles.txTitle, Typography.threeD]} numberOfLines={1}>
                            {category}
                          </Text>
                          <View style={styles.txMeta}>
                            <Text style={styles.txDate}>{dateStr}</Text>
                            <View style={[styles.txStatusBadge, { backgroundColor: statusConf.color + '15' }]}>
                              <Text style={[styles.txStatusText, { color: statusConf.color }]}>
                                {t('wallet.' + item.status.toLowerCase())}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.txAmountGroup}>
                          <Text style={[styles.txAmount, { color: Colors.success }]}>
                            Rs. {item.amount.toLocaleString()}
                          </Text>
                          <Text style={styles.txCurrency}>PKR</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}

              {payments.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Wallet size={40} color={Colors.textMuted} strokeWidth={1.2} />
                  <Text style={styles.emptyTitle}>{t('wallet.noEarnings')}</Text>
                  <Text style={styles.emptySub}>{t('wallet.noEarningsDesc')}</Text>
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
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginTop: 4 },
  scrollContent: {
    paddingHorizontal: Spacing.m,
    gap: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.24)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  warningTitle: { fontSize: 13, fontWeight: '800', color: '#FF6B63', marginBottom: 2 },
  warningSub: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', lineHeight: 14 },
  balanceSection: { marginBottom: 4 },
  balanceCard: { borderRadius: 24 },
  balanceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  balanceEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceEyebrow: { fontSize: 9, fontWeight: '900', color: Colors.cyan, letterSpacing: 2 },
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
  balanceLabel: { fontSize: 9, fontWeight: '900', color: Colors.textMuted, letterSpacing: 1 },
  balanceAmount: { fontSize: 32, fontWeight: '900', color: '#fff' },
  balanceReserveText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  walletIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.22)',
    backgroundColor: 'rgba(0,245,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,255,0.3)',
    backgroundColor: 'rgba(0,245,255,0.06)',
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
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  earningsOverviewLead: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  balanceEarningsIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.18)',
  },
  balanceEarningsLabel: { fontSize: 8, fontWeight: '900', color: Colors.success, letterSpacing: 1.5 },
  balanceEarningsSub: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  balanceEarningsAmount: { fontSize: 20, fontWeight: '900', color: '#fff' },
  balanceEarningsGrid: { flexDirection: 'row' },
  balanceEarningsMetric: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    gap: 3,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  balanceEarningsMetricLast: { borderRightWidth: 0 },
  earningsMetricDot: { width: 4, height: 4, borderRadius: 2, marginBottom: 2 },
  balanceEarningsMiniLabel: { fontSize: 8, color: Colors.textMuted, fontWeight: '800', textTransform: 'uppercase' },
  balanceEarningsMiniValue: { fontSize: 13, color: '#fff', fontWeight: '900' },
  walletStatsHeader: { marginTop: 8 },
  walletStatsTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  walletStatsCaption: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  chipCard: { flex: 1, borderRadius: 14, minHeight: 74 },
  chipDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
  chipValue: { fontSize: 14, fontWeight: '900', color: '#fff', marginBottom: 2 },
  chipLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  transactionsSection: { marginTop: 12 },
  walletRecordsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletRecordsTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  walletRecordsCaption: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  walletRecordsCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  walletRecordsCountText: { fontSize: 10, color: Colors.cyan, fontWeight: '900' },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  segmentBtnActive: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  segmentText: { fontSize: 12, color: Colors.textMuted, fontWeight: '700' },
  segmentTextActive: { color: '#fff', fontWeight: '900' },
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
  txTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  txStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  txStatusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  txAmountGroup: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 15, fontWeight: '900' },
  txBalanceAfter: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  txCurrency: { fontSize: 9, color: Colors.textMuted, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  emptySub: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
});

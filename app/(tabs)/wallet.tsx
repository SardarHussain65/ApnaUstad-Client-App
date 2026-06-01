import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, TextInput, Modal, ActivityIndicator,
  Animated as RNAnimated, Image, Share, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Colors, Typography, Spacing } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowUpRight, ArrowDownLeft, Wallet, Clock,
  CheckCircle2, AlertCircle, XCircle, Plus, RefreshCw, Info, Sparkles,
  Copy, Upload, Smartphone, Landmark, Banknote, FileImage, Send, Download
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import {
  useMyPayments,
  useWorkerWallet,
  useWalletTransactions,
  useWalletPaymentMethods,
  useWalletTopUps,
  useCreateWalletTopUpMutation,
  useToast,
  type PaymentEntry,
  type WalletTransaction,
  type WalletPaymentMethod,
  type WalletTopUpRequest
} from '../../hooks';
import { SkeletonBox, useShimmerTranslateX } from '../../components/home/HomeSkeletonLoader';

// ─── Filters & Constants ──────────────────────────────────────────────────────
const FILTERS = ['All', 'Paid', 'Payable', 'Pending'] as const;
type FilterType = typeof FILTERS[number];

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  paid: { color: Colors.success, icon: CheckCircle2, label: 'Paid' },
  payable: { color: '#00B8FF', icon: Clock, label: 'Payable' },
  pending: { color: '#FF8C00', icon: AlertCircle, label: 'Pending' },
  cancelled: { color: Colors.error, icon: XCircle, label: 'Cancelled' },
};

const TX_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  recharge: { color: Colors.success, icon: ArrowDownLeft, label: 'Recharge' },
  commission_deduction: { color: '#FF8C00', icon: ArrowUpRight, label: 'Commission' },
  refund: { color: '#00B8FF', icon: RefreshCw, label: 'Refund' },
  adjustment: { color: Colors.cyan, icon: Info, label: 'Adjustment' },
};

const TOPUP_STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: '#FFB020', icon: Clock, label: 'Pending' },
  approved: { color: Colors.success, icon: CheckCircle2, label: 'Approved' },
  rejected: { color: Colors.error, icon: XCircle, label: 'Rejected' },
};

const METHOD_ICON: Record<string, any> = {
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  bank_transfer: Landmark,
  other: Banknote,
};

const formatMoney = (value = 0) => `Rs. ${Number(value || 0).toLocaleString(undefined, {
  maximumFractionDigits: 2,
})}`;

const cardGradient = (
  color: string,
  secondary = Colors.cyan
): [string, string, ...string[]] => [
  color + '5C',
  secondary + '26',
  'rgba(4,9,24,0.18)',
];

// ─── Summary chip ─────────────────────────────────────────────────────────────
function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <GlassCard
      intensity={24}
      padding={12}
      style={[chipStyles.card, { borderColor: color + '48' }]}
      glowColor={color}
      gradient={cardGradient(color)}
    >
      <View style={[chipStyles.dot, { backgroundColor: color }]} />
      <Text style={chipStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {formatMoney(value)}
      </Text>
      <Text style={chipStyles.label}>{label}</Text>
    </GlassCard>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value?: string) => void;
}) {
  return (
    <View style={copyStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={copyStyles.label}>{label}</Text>
        <Text style={copyStyles.value}>{value}</Text>
      </View>
      <TouchableOpacity style={copyStyles.btn} onPress={() => onCopy(label, value)}>
        <Copy size={15} color={Colors.cyan} />
      </TouchableOpacity>
    </View>
  );
}

const copyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 3,
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
  },
});
const chipStyles = StyleSheet.create({
  card: { flex: 1, borderRadius: 14, minHeight: 74 },
  dot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
  value: { fontSize: 14, fontWeight: '900', color: '#fff', marginBottom: 2 },
  label: { fontSize: 9, lineHeight: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0 },
});

// ─── Wallet Skeleton ──────────────────────────────────────────────────────────
function WalletSkeleton({ translateX }: { translateX: RNAnimated.AnimatedInterpolation<string | number> }) {
  return (
    <View style={{ gap: 16 }}>
      <SkeletonBox width="100%" height={140} borderRadius={24} translateX={translateX} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SkeletonBox width="48%" height={72} borderRadius={16} translateX={translateX} />
        <SkeletonBox width="48%" height={72} borderRadius={16} translateX={translateX} />
      </View>
      {[1, 2, 3].map(i => (
        <SkeletonBox key={i} width="100%" height={72} borderRadius={18} translateX={translateX} />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WalletTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role } = useAuth();
  const toast = useToast();
  const translateX = useShimmerTranslateX();

  const isWorker = role === 'worker';

  // 1. Shared Payment Hooks & Client View States
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [isClientRefreshing, setIsClientRefreshing] = useState(false);
  const [workerTab, setWorkerTab] = useState<'wallet' | 'topups' | 'earnings'>('wallet');
  
  const { data: paymentsData, isLoading: isPaymentsLoading, refetch: refetchPayments } = useMyPayments();

  const payments = paymentsData?.payments ?? [];
  const summary = paymentsData?.summary ?? { total: 0, paid: 0, payable: 0, pending: 0, cancelled: 0, currency: 'PKR' };

  const filteredPayments = payments.filter((p: PaymentEntry) => {
    if (activeFilter === 'All') return true;
    return p.status.toLowerCase() === activeFilter.toLowerCase();
  });

  const handleClientRefresh = useCallback(async () => {
    setIsClientRefreshing(true);
    try {
      await refetchPayments();
    } finally {
      setIsClientRefreshing(false);
    }
  }, [refetchPayments]);

  // 2. Worker View States & Hooks
  const [isWorkerRefreshing, setIsWorkerRefreshing] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedMethodKey, setSelectedMethodKey] = useState<WalletPaymentMethod['method'] | null>(null);
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [showTopUpSuccess, setShowTopUpSuccess] = useState(false);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);

  const { data: wallet, isLoading: isWalletLoading, refetch: refetchWallet } = useWorkerWallet({
    enabled: isWorker,
  });
  const { data: transactionsData, isLoading: isTransactionsLoading, refetch: refetchTransactions } = useWalletTransactions(1, 50, {
    enabled: isWorker,
  });
  const { data: paymentMethods = [], isLoading: areMethodsLoading, refetch: refetchPaymentMethods } = useWalletPaymentMethods({
    enabled: isWorker,
  });
  const { data: topUpsData, isLoading: areTopUpsLoading, refetch: refetchTopUps } = useWalletTopUps(1, 50, {
    enabled: isWorker,
  });

  const transactions = transactionsData?.transactions ?? [];
  const topUps = useMemo(() => topUpsData?.requests ?? [], [topUpsData?.requests]);
  const topUpMutation = useCreateWalletTopUpMutation();
  const selectedMethod = useMemo(
    () => paymentMethods.find((method) => method.method === selectedMethodKey) || paymentMethods[0],
    [paymentMethods, selectedMethodKey]
  );
  const selectedMethodIsConfigured = selectedMethod ? selectedMethod.isConfigured !== false : false;
  const topUpSummary = useMemo(() => {
    return topUps.reduce((acc, item) => {
      acc[item.status] += item.amount;
      return acc;
    }, { pending: 0, approved: 0, rejected: 0 } as Record<WalletTopUpRequest['status'], number>);
  }, [topUps]);
  const totalEarnings = (summary.paid || 0) + (summary.payable || 0);

  const handleWorkerRefresh = useCallback(async () => {
    setIsWorkerRefreshing(true);
    try {
      await Promise.all([refetchWallet(), refetchTransactions(), refetchPayments(), refetchPaymentMethods(), refetchTopUps()]);
    } finally {
      setIsWorkerRefreshing(false);
    }
  }, [refetchWallet, refetchTransactions, refetchPayments, refetchPaymentMethods, refetchTopUps]);

  const handleQuickAmountSelect = (amount: number) => {
    setRechargeAmount(amount.toString());
  };

  const handleCopy = async (label: string, value?: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    toast.success('Copied', `${label} copied to clipboard.`);
  };

  const handlePickProofImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Permission Required', 'Please allow photo access to upload your payment proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProofImageUri(result.assets[0].uri);
    }
  };

  const resetTopUpForm = () => {
    setRechargeAmount('');
    setSelectedMethodKey(null);
    setProofImageUri(null);
  };

  const handleConfirmRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid Amount', 'Please enter a positive amount to top up.');
      return;
    }
    if (!selectedMethod) {
      toast.error('No Payment Method', 'Payment methods are not configured yet. Please contact support.');
      return;
    }
    if (!selectedMethodIsConfigured) {
      toast.error('Payment Details Missing', `${selectedMethod.label} payment details are not configured yet. Please contact support.`);
      return;
    }
    if (!proofImageUri) {
      toast.error('Proof Required', 'Please upload your payment screenshot or slip.');
      return;
    }

    setIsSubmittingRecharge(true);
    try {
      const formData = new FormData();
      formData.append('amount', String(amount));
      formData.append('method', selectedMethod.method);

      const filename = proofImageUri.split('/').pop() || 'payment-proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('proof', {
        uri: Platform.OS === 'ios' ? proofImageUri.replace('file://', '') : proofImageUri,
        name: filename,
        type,
      } as any);

      await topUpMutation.mutateAsync(formData);
      setShowTopUpSuccess(true);
      setShowRechargeModal(false);
      resetTopUpForm();
    } catch (err: any) {
      toast.error('Top-Up Failed', err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingRecharge(false);
    }
  };

  const handleShareStatement = async () => {
    const availableBalance = wallet?.availableBalance ?? wallet?.balance ?? 0;
    const lines = [
      'ApnaUstad Worker Wallet Statement',
      `Available Balance: Rs. ${availableBalance.toLocaleString()}`,
      `Held for Active Jobs: Rs. ${(wallet?.reservedBalance ?? 0).toLocaleString()}`,
      `Total Earnings: Rs. ${totalEarnings.toLocaleString()}`,
      `Ready to Collect: Rs. ${summary.payable.toLocaleString()}`,
      `Total Recharged: Rs. ${wallet?.totalRecharged?.toLocaleString() ?? '0'}`,
      `Commission Deducted: Rs. ${wallet?.totalCommissionDeducted?.toLocaleString() ?? '0'}`,
      '',
      ...transactions.slice(0, 20).map((tx) => {
        const sign = ['recharge', 'refund'].includes(tx.type) ? '+' : '-';
        return `${new Date(tx.createdAt).toLocaleDateString()} | ${tx.description} | ${sign}Rs. ${tx.amount.toLocaleString()} | Bal Rs. ${tx.balanceAfter.toLocaleString()}`;
      }),
    ];
    await Share.share({ message: lines.join('\n') });
  };

  const requiredBalance = wallet?.requiredBalance ?? 500;
  const availableBalance = wallet?.availableBalance ?? wallet?.balance ?? 0;
  const reservedBalance = wallet?.reservedBalance ?? 0;
  const isBalanceLow = wallet ? availableBalance < requiredBalance : false;

  // Render client view
  if (!isWorker) {
    return (
      <BackgroundWrapper>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.m }]}
          refreshControl={
            <RefreshControl
              refreshing={isClientRefreshing}
              onRefresh={handleClientRefresh}
              tintColor={Colors.cyan}
              colors={[Colors.cyan]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, Typography.threeD]}>Payment History</Text>
            <Text style={styles.headerSubtitle}>View all payments made to workers</Text>
          </View>

          {isPaymentsLoading && !isClientRefreshing ? (
            <WalletSkeleton translateX={translateX} />
          ) : (
            <>
              {/* Balance Card */}
              <Animated.View entering={FadeInDown.duration(800)} style={styles.balanceSection}>
                <GlassCard
                  style={styles.balanceCard}
                  intensity={42}
                  glowColor={Colors.cyan}
                  gradient={['rgba(0,245,255,0.58)', 'rgba(0,122,255,0.34)', 'rgba(191,90,242,0.16)']}
                >
                  <View style={styles.balanceContent}>
                    <View style={styles.balanceTextGroup}>
                      <Text style={styles.balanceLabel}>TOTAL SPENT</Text>
                      <Text style={[styles.balanceAmount, Typography.threeD]}>
                        Rs. {summary.total.toLocaleString()}
                      </Text>
                      <Text style={styles.balanceSubtext}>
                        {payments.length} payment{payments.length !== 1 ? 's' : ''} made
                      </Text>
                    </View>
                    <View style={styles.walletIconWrap}>
                      <Wallet size={28} color={Colors.cyan} strokeWidth={1.8} />
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>

              {/* Summary Chips */}
              <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.summaryRow}>
                <SummaryChip label="Paid" value={summary.paid} color={Colors.success} />
                <SummaryChip label="Payable" value={summary.payable} color="#00B8FF" />
                <SummaryChip label="Pending" value={summary.pending} color="#FF8C00" />
              </Animated.View>

              {/* Transactions List */}
              <View style={styles.transactionsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, Typography.threeD]}>Payments History</Text>
                </View>

                {/* Filter Pills */}
                <View style={styles.filterRow}>
                  {FILTERS.map((filter) => {
                    const isActive = activeFilter === filter;
                    return (
                      <TouchableOpacity
                        key={filter}
                        onPress={() => setActiveFilter(filter)}
                        style={[styles.filterPill, isActive && styles.activeFilterPill]}
                      >
                        <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                          {filter}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Payments List */}
                <View style={styles.transactionList}>
                  {filteredPayments.map((item: PaymentEntry, index: number) => {
                    const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                    const IconComponent = statusConf.icon;
                    const category = item.booking?.category || 'Service';
                    const dateStr = new Date(item.updatedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
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
                                    {statusConf.label}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.txAmountGroup}>
                              <Text style={[styles.txAmount, { color: '#fff' }]}>
                                Rs. {item.amount.toLocaleString()}
                              </Text>
                              <Text style={styles.txCurrency}>PKR</Text>
                            </View>
                          </View>
                        </GlassCard>
                      </Animated.View>
                    );
                  })}

                  {filteredPayments.length === 0 && (
                    <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
                      <Wallet size={40} color={Colors.textMuted} strokeWidth={1.2} />
                      <Text style={styles.emptyTitle}>No Payments</Text>
                      <Text style={styles.emptySub}>
                        {activeFilter === 'All'
                          ? 'Your payment history will appear here once you complete a booking.'
                          : `No ${activeFilter.toLowerCase()} payments found.`}
                      </Text>
                    </Animated.View>
                  )}
                </View>
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </BackgroundWrapper>
    );
  }

  // Render Worker Prepaid Wallet View
  return (
    <BackgroundWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.m }]}
        refreshControl={
          <RefreshControl
            refreshing={isWorkerRefreshing}
            onRefresh={handleWorkerRefresh}
            tintColor={Colors.cyan}
            colors={[Colors.cyan]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, Typography.threeD]}>My Wallet</Text>
              <Text style={styles.headerSubtitle}>Top-ups, balance, and commissions</Text>
            </View>
            <TouchableOpacity style={styles.iconActionBtn} onPress={handleShareStatement}>
              <Download size={18} color={Colors.cyan} />
            </TouchableOpacity>
          </View>
        </View>

        {(isWalletLoading || isTransactionsLoading || areMethodsLoading || areTopUpsLoading) && !isWorkerRefreshing ? (
          <WalletSkeleton translateX={translateX} />
        ) : (
          <>
            {/* Low Balance Warning Banner */}
            {isBalanceLow && (
              <Animated.View entering={FadeInDown.duration(600)} style={styles.warningBanner}>
                <AlertCircle size={20} color={Colors.error} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Low Wallet Balance</Text>
                  <Text style={styles.warningSub}>
                    Your available balance is below Rs. {requiredBalance.toLocaleString()}. Please top up to accept jobs or post bids.
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
                    <Text style={styles.balanceEyebrow}>WORK WALLET</Text>
                  </View>
                  <View style={[
                    styles.balanceEligibilityPill,
                    { borderColor: (isBalanceLow ? Colors.error : Colors.success) + '55' },
                  ]}>
                    <View style={[styles.statusIndicator, { backgroundColor: isBalanceLow ? Colors.error : Colors.success }]} />
                    <Text style={[styles.balanceEligibilityText, { color: isBalanceLow ? '#FF6B63' : Colors.success }]}>
                      {isBalanceLow ? 'TOP-UP NEEDED' : 'JOB READY'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.balanceContent, styles.workerBalanceContent]}>
                  <View style={styles.balanceTextGroup}>
                    <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
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
                        ? `${formatMoney(reservedBalance)} held for active jobs`
                        : `Minimum reserve ${formatMoney(requiredBalance)}`}
                    </Text>
                  </View>
                  <View style={[styles.walletIconWrap, isBalanceLow && { borderColor: Colors.error + '40', backgroundColor: Colors.error + '08' }]}>
                    <Wallet size={28} color={isBalanceLow ? Colors.error : Colors.cyan} strokeWidth={1.8} />
                  </View>
                </View>

                {/* Quick actions inside card */}
                <TouchableOpacity
                  style={[styles.rechargeBtn, isBalanceLow && { backgroundColor: Colors.error + '25', borderColor: Colors.error + '40' }]}
                  onPress={() => setShowRechargeModal(true)}
                >
                  <Plus size={18} color={isBalanceLow ? '#FF4F4F' : Colors.cyan} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={[styles.rechargeBtnText, { color: isBalanceLow ? '#FF4F4F' : Colors.cyan }]}>Top Up Wallet</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>

            {/* Earnings overview stays beside the balance dashboard, not hidden in a tab */}
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
                      <Text style={styles.balanceEarningsLabel}>TOTAL EARNINGS</Text>
                      <Text style={styles.balanceEarningsSub}>Cash jobs and collectable income</Text>
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
                    <Text style={styles.balanceEarningsMiniLabel}>Received</Text>
                    <Text style={styles.balanceEarningsMiniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                      {formatMoney(summary.paid)}
                    </Text>
                  </View>
                  <View style={styles.balanceEarningsMetric}>
                    <View style={[styles.earningsMetricDot, { backgroundColor: '#00B8FF' }]} />
                    <Text style={styles.balanceEarningsMiniLabel}>Ready</Text>
                    <Text style={styles.balanceEarningsMiniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                      {formatMoney(summary.payable)}
                    </Text>
                  </View>
                  <View style={[styles.balanceEarningsMetric, styles.balanceEarningsMetricLast]}>
                    <View style={[styles.earningsMetricDot, { backgroundColor: '#FFB020' }]} />
                    <Text style={styles.balanceEarningsMiniLabel}>Upcoming</Text>
                    <Text style={styles.balanceEarningsMiniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                      {formatMoney(summary.pending)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Wallet Statistics Grid */}
            <View style={styles.walletStatsHeader}>
              <Text style={styles.walletStatsTitle}>Wallet Activity</Text>
              <Text style={styles.walletStatsCaption}>Verified credits and deductions</Text>
            </View>
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.summaryRow}>
              <GlassCard
                intensity={24}
                padding={12}
                style={[chipStyles.card, { borderColor: Colors.success + '48' }]}
                glowColor={Colors.success}
                gradient={cardGradient(Colors.success, '#00B8FF')}
              >
                <View style={[chipStyles.dot, { backgroundColor: Colors.success }]} />
                <Text style={chipStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                  {formatMoney(wallet?.totalRecharged)}
                </Text>
                <Text style={chipStyles.label}>Approved Top-Ups</Text>
              </GlassCard>

              <GlassCard
                intensity={24}
                padding={12}
                style={[chipStyles.card, { borderColor: '#FF8C0048' }]}
                glowColor="#FF8C00"
                gradient={cardGradient('#FF8C00', '#FF1493')}
              >
                <View style={[chipStyles.dot, { backgroundColor: '#FF8C00' }]} />
                <Text style={chipStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                  {formatMoney(wallet?.totalCommissionDeducted)}
                </Text>
                <Text style={chipStyles.label}>Commissions Taken</Text>
              </GlassCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.summaryRow}>
              <SummaryChip label="Pending Proofs" value={topUpSummary.pending} color="#FFB020" />
              <SummaryChip label="Rejected Proofs" value={topUpSummary.rejected} color={Colors.error} />
            </Animated.View>

            {/* Wallet & Earnings History Section */}
            <View style={styles.transactionsSection}>
              <View style={styles.walletRecordsHeader}>
                <View>
                  <Text style={styles.walletRecordsTitle}>Wallet Records</Text>
                  <Text style={styles.walletRecordsCaption}>Every credit and deduction in one place</Text>
                </View>
                <View style={styles.walletRecordsCount}>
                  <Text style={styles.walletRecordsCountText}>{transactions.length}</Text>
                </View>
              </View>

              {/* Segmented Control */}
              <View style={styles.segmentContainer}>
                <TouchableOpacity
                  style={[styles.segmentBtn, workerTab === 'wallet' && styles.segmentBtnActive]}
                  onPress={() => setWorkerTab('wallet')}
                >
                  <Text style={[styles.segmentText, workerTab === 'wallet' && styles.segmentTextActive]}>
                    Ledger
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, workerTab === 'topups' && styles.segmentBtnActive]}
                  onPress={() => setWorkerTab('topups')}
                >
                  <Text style={[styles.segmentText, workerTab === 'topups' && styles.segmentTextActive]}>
                    Top-Ups
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, workerTab === 'earnings' && styles.segmentBtnActive]}
                  onPress={() => setWorkerTab('earnings')}
                >
                  <Text style={[styles.segmentText, workerTab === 'earnings' && styles.segmentTextActive]}>
                    Earnings
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Transactions List */}
              <View style={styles.transactionList}>
                {workerTab === 'wallet' ? (
                  <>
                    {transactions.map((tx: WalletTransaction, index: number) => {
                      const txConf = TX_CONFIG[tx.type] || TX_CONFIG.adjustment;
                      const IconComponent = txConf.icon;
                      const isPositive = ['recharge', 'refund'].includes(tx.type);
                      const dateStr = new Date(tx.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
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
                                <Text style={[styles.txTitle, Typography.threeD]}>
                                  {txConf.label}
                                </Text>
                                <Text style={styles.txDescription} numberOfLines={2}>
                                  {tx.description}
                                </Text>
                              </View>

                              <View style={styles.txAmountGroup}>
                                <Text
                                  style={[styles.txAmount, { color: isPositive ? Colors.success : Colors.error }]}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.72}
                                >
                                  {isPositive ? '+' : '-'}{formatMoney(tx.amount)}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.txFooter}>
                              <Text style={styles.txDate}>{dateStr}</Text>
                              <Text style={styles.txAfter}>Balance {formatMoney(tx.balanceAfter)}</Text>
                            </View>
                          </GlassCard>
                        </Animated.View>
                      );
                    })}

                    {transactions.length === 0 && (
                      <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
                        <Wallet size={40} color={Colors.textMuted} strokeWidth={1.2} />
                        <Text style={styles.emptyTitle}>No Transactions</Text>
                        <Text style={styles.emptySub}>
                          Your wallet transaction history is empty. Try recharging your wallet to begin.
                        </Text>
                      </Animated.View>
                    )}
                  </>
                ) : workerTab === 'topups' ? (
                  <>
                    {topUps.map((request: WalletTopUpRequest, index: number) => {
                      const statusConf = TOPUP_STATUS_CONFIG[request.status] || TOPUP_STATUS_CONFIG.pending;
                      const StatusIcon = statusConf.icon;
                      const MethodIcon = METHOD_ICON[request.method] || Banknote;
                      const dateStr = new Date(request.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      });

                      return (
                        <Animated.View
                          key={request._id}
                          entering={FadeInRight.delay(index * 80).duration(500)}
                          layout={Layout.springify()}
                        >
                          <GlassCard
                            intensity={20}
                            style={[styles.topUpCard, { borderColor: statusConf.color + '48' }]}
                            padding={14}
                            gradient={cardGradient(statusConf.color, '#00B8FF')}
                          >
                            <View style={styles.topUpHead}>
                              <View style={[styles.txIconBox, { backgroundColor: statusConf.color + '18', borderColor: statusConf.color + '35' }]}>
                                <StatusIcon size={18} color={statusConf.color} strokeWidth={2} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.txTitle, Typography.threeD]}>{request.requestId}</Text>
                                <Text style={styles.txDate}>{dateStr}</Text>
                              </View>
                              <View style={[styles.txStatusBadge, { backgroundColor: statusConf.color + '15' }]}>
                                <Text style={[styles.txStatusText, { color: statusConf.color }]}>{statusConf.label}</Text>
                              </View>
                            </View>

                            <View style={styles.topUpMetaRow}>
                              <View style={styles.topUpMetaItem}>
                                <MethodIcon size={14} color={Colors.cyan} />
                                <Text style={styles.topUpMetaText}>{request.paymentDetailsSnapshot?.label || request.method}</Text>
                              </View>
                              <Text style={styles.topUpAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                                {formatMoney(request.amount)}
                              </Text>
                            </View>

                            {request.status === 'rejected' && !!request.rejectionReason && (
                              <View style={styles.rejectionBox}>
                                <Text style={styles.rejectionLabel}>Rejection Reason</Text>
                                <Text style={styles.rejectionText}>{request.rejectionReason}</Text>
                              </View>
                            )}
                          </GlassCard>
                        </Animated.View>
                      );
                    })}

                    {topUps.length === 0 && (
                      <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
                        <FileImage size={40} color={Colors.textMuted} strokeWidth={1.2} />
                        <Text style={styles.emptyTitle}>No Top-Up Requests</Text>
                        <Text style={styles.emptySub}>
                          Submit payment proof after sending wallet recharge amount.
                        </Text>
                      </Animated.View>
                    )}
                  </>
                ) : (
                  <>
                    {payments.map((item: PaymentEntry, index: number) => {
                      const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                      const IconComponent = statusConf.icon;
                      const category = item.booking?.category || 'Service';
                      const dateStr = new Date(item.updatedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
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
                                      {statusConf.label}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              <View style={styles.txAmountGroup}>
                                <Text
                                  style={[styles.txAmount, { color: item.status === 'paid' ? Colors.success : '#fff' }]}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.72}
                                >
                                  +{formatMoney(item.workerEarning)}
                                </Text>
                                <Text style={styles.txCurrency}>PKR</Text>
                              </View>
                            </View>
                          </GlassCard>
                        </Animated.View>
                      );
                    })}

                    {payments.length === 0 && (
                      <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
                        <Wallet size={40} color={Colors.textMuted} strokeWidth={1.2} />
                        <Text style={styles.emptyTitle}>No Earnings</Text>
                        <Text style={styles.emptySub}>
                          Your earnings history is empty. Once you complete jobs and clients confirm cash payment, they will appear here.
                        </Text>
                      </Animated.View>
                    )}
                  </>
                )}
              </View>
            </View>
          </>
        )}

        {/* Verified Top-Up Modal */}
        <Modal
          visible={showRechargeModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowRechargeModal(false);
            resetTopUpForm();
          }}
        >
          <View style={styles.modalOverlay}>
            <GlassCard intensity={80} padding={24} style={styles.modalContent} glowColor={Colors.cyan}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalHeader}>
                <Sparkles size={22} color={Colors.cyan} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Wallet Top-Up</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Send money manually, upload proof, and wait for admin approval before credits appear.
              </Text>

              <View style={styles.presetRow}>
                {[500, 1000, 2000, 5000].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetBtn,
                      rechargeAmount === preset.toString() && styles.presetBtnActive
                    ]}
                    onPress={() => handleQuickAmountSelect(preset)}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        rechargeAmount === preset.toString() && styles.presetTextActive
                      ]}
                    >
                      Rs. {preset.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>Rs.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter custom amount"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={rechargeAmount}
                  onChangeText={setRechargeAmount}
                  editable={!isSubmittingRecharge}
                />
              </View>

              <Text style={styles.modalSectionLabel}>Payment Method</Text>
              <View style={styles.methodGrid}>
                {paymentMethods.map((method) => {
                  const isSelected = (selectedMethod?.method || selectedMethodKey) === method.method;
                  const isConfigured = method.isConfigured !== false;
                  const Icon = METHOD_ICON[method.method] || Banknote;
                  return (
                    <TouchableOpacity
                      key={method.method}
                      style={[
                        styles.methodCard,
                        !isConfigured && styles.methodCardUnavailable,
                        isSelected && styles.methodCardActive,
                        isSelected && !isConfigured && styles.methodCardActiveUnavailable,
                      ]}
                      onPress={() => setSelectedMethodKey(method.method)}
                    >
                      <Icon size={18} color={isSelected && isConfigured ? '#000' : Colors.cyan} />
                      <Text style={[
                        styles.methodLabel,
                        isSelected && isConfigured && styles.methodLabelActive,
                        isSelected && !isConfigured && styles.methodLabelUnavailableActive,
                      ]}>
                        {method.label}
                      </Text>
                      {!isConfigured && (
                        <View style={styles.methodBadge}>
                          <Text style={styles.methodBadgeText}>Setup needed</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {areMethodsLoading && (
                <View style={styles.noticeBox}>
                  <ActivityIndicator size="small" color="#FFB020" />
                  <Text style={styles.noticeText}>Loading payment methods...</Text>
                </View>
              )}

              {!areMethodsLoading && !paymentMethods.length && (
                <View style={styles.noticeBox}>
                  <AlertCircle size={16} color="#FFB020" />
                  <Text style={styles.noticeText}>Payment methods are not configured yet. Please contact support.</Text>
                </View>
              )}

              {!!selectedMethod && (
                <View style={styles.paymentDetailsBox}>
                  <Text style={styles.paymentDetailsTitle}>{selectedMethod.label} Details</Text>
                  {!selectedMethodIsConfigured && (
                    <View style={styles.detailsWarning}>
                      <AlertCircle size={15} color="#FFB020" />
                      <Text style={styles.detailsWarningText}>
                        Official account details are missing for this method. Ask admin to configure them before submitting proof.
                      </Text>
                    </View>
                  )}
                  {!!selectedMethod.accountTitle && (
                    <CopyRow label="Account Title" value={selectedMethod.accountTitle} onCopy={handleCopy} />
                  )}
                  {!!selectedMethod.accountNumber && (
                    <CopyRow label="Account Number" value={selectedMethod.accountNumber} onCopy={handleCopy} />
                  )}
                  {!!selectedMethod.bankName && (
                    <CopyRow label="Bank" value={selectedMethod.bankName} onCopy={handleCopy} />
                  )}
                  {!!selectedMethod.iban && (
                    <CopyRow label="IBAN" value={selectedMethod.iban} onCopy={handleCopy} />
                  )}
                  {!!selectedMethod.instructions && (
                    <Text style={styles.instructionsText}>{selectedMethod.instructions}</Text>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.uploadProofBtn} onPress={handlePickProofImage} disabled={isSubmittingRecharge}>
                <Upload size={18} color={Colors.cyan} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadProofTitle}>{proofImageUri ? 'Payment proof selected' : 'Upload screenshot or slip'}</Text>
                  <Text style={styles.uploadProofSub}>{proofImageUri ? 'Tap to change proof image' : 'Required for admin verification'}</Text>
                </View>
              </TouchableOpacity>

              {!!proofImageUri && (
                <Image source={{ uri: proofImageUri }} style={styles.proofPreview} />
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => {
                    setShowRechargeModal(false);
                    resetTopUpForm();
                  }}
                  disabled={isSubmittingRecharge}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalBtnConfirm,
                    (!selectedMethodIsConfigured || isSubmittingRecharge) && styles.modalBtnDisabled,
                  ]}
                  onPress={handleConfirmRecharge}
                  disabled={isSubmittingRecharge || !selectedMethodIsConfigured}
                >
                  {isSubmittingRecharge ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <View style={styles.confirmInner}>
                      <Send size={16} color="#000" />
                      <Text style={styles.modalBtnConfirmText}>Submit Proof</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              </ScrollView>
            </GlassCard>
          </View>
        </Modal>

        <Modal
          visible={showTopUpSuccess}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTopUpSuccess(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard intensity={85} padding={24} style={styles.successModal} glowColor={Colors.success}>
              <View style={styles.successIconWrap}>
                <CheckCircle2 size={34} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Proof Submitted</Text>
              <Text style={styles.successMessage}>
                Your payment proof has been submitted successfully. Please wait while our admin verifies your payment.
              </Text>
              <TouchableOpacity style={styles.successBtn} onPress={() => setShowTopUpSuccess(false)}>
                <Text style={styles.successBtnText}>Got it</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        <View style={{ height: 100 }} />
      </ScrollView>
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
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
  balanceSection: {
    marginBottom: Spacing.m,
  },
  balanceCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  balanceEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  balanceEyebrow: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  balanceEligibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: 'rgba(4,9,24,0.55)',
  },
  balanceEligibilityText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerBalanceContent: {
    marginBottom: 16,
  },
  balanceTextGroup: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  balanceLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0,
  },
  balanceSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  balanceReserveText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  walletIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderColor: 'rgba(0,245,255,0.18)',
    borderWidth: 1.5,
    borderRadius: 16,
  },
  rechargeBtnText: {
    fontSize: 14,
    fontWeight: '900',
  },
  earningsSection: {
    marginBottom: 22,
  },
  earningsOverviewCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.18)',
  },
  earningsOverviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
  },
  earningsOverviewLead: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceEarningsLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  balanceEarningsAmount: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
    maxWidth: '42%',
  },
  balanceEarningsSub: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  balanceEarningsIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(52,199,89,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceEarningsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  balanceEarningsMetric: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.07)',
  },
  balanceEarningsMetricLast: {
    borderRightWidth: 0,
  },
  balanceEarningsMiniValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
  balanceEarningsMiniLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  walletStatsHeader: {
    marginBottom: 10,
  },
  walletStatsTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  walletStatsCaption: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 79, 79, 0.1)',
    borderColor: 'rgba(255, 79, 79, 0.25)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  warningTitle: {
    color: '#FF4F4F',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 2,
  },
  warningSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  transactionsSection: {
    flex: 1,
  },
  walletRecordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  walletRecordsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  walletRecordsCaption: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  walletRecordsCount: {
    minWidth: 34,
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,245,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.22)',
  },
  walletRecordsCountText: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.l,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeFilterPill: {
    backgroundColor: 'rgba(30,144,255,0.2)',
    borderColor: Colors.cyan + '80',
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '900',
  },
  transactionList: {
    gap: 12,
  },
  transactionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  earningsMetricDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  txDescription: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  txAfter: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  txStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  txStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txAmountGroup: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: '36%',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  txCurrency: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    maxHeight: '92%',
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
    fontWeight: '600',
  },
  modalSectionLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  methodCard: {
    flexBasis: '48%',
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  methodCardUnavailable: {
    borderColor: 'rgba(255,176,32,0.24)',
    backgroundColor: 'rgba(255,176,32,0.06)',
  },
  methodCardActive: {
    backgroundColor: Colors.cyan,
    borderColor: Colors.cyan,
  },
  methodCardActiveUnavailable: {
    backgroundColor: 'rgba(255,176,32,0.14)',
    borderColor: '#FFB020',
  },
  methodLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  methodLabelActive: {
    color: '#000',
  },
  methodLabelUnavailableActive: {
    color: '#FFB020',
  },
  methodBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,176,32,0.14)',
  },
  methodBadgeText: {
    color: '#FFB020',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,176,32,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,32,0.25)',
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    color: '#FFB020',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  paymentDetailsBox: {
    borderRadius: 18,
    backgroundColor: 'rgba(0,245,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.16)',
    padding: 14,
    marginBottom: 16,
  },
  paymentDetailsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  detailsWarning: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,176,32,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,32,0.2)',
    marginTop: 8,
  },
  detailsWarningText: {
    flex: 1,
    color: '#FFB020',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  instructionsText: {
    marginTop: 10,
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  uploadProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    marginBottom: 12,
  },
  uploadProofTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  uploadProofSub: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  proofPreview: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(0,245,255,0.12)',
    borderColor: Colors.cyan,
  },
  presetText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  presetTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 24,
  },
  inputPrefix: {
    color: Colors.cyan,
    fontWeight: '900',
    fontSize: 16,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalBtnCancelText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.cyan,
  },
  modalBtnDisabled: {
    opacity: 0.55,
  },
  modalBtnConfirmText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
  confirmInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  successModal: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.22)',
    alignItems: 'center',
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  successMessage: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  successBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  successBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  topUpCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  topUpHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 12,
  },
  topUpMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  topUpMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  topUpMetaText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  topUpAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    maxWidth: '42%',
  },
  rejectionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,79,79,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,79,79,0.18)',
  },
  rejectionLabel: {
    color: Colors.error,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rejectionText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(0,245,255,0.1)',
    borderColor: 'rgba(0,245,255,0.2)',
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
});

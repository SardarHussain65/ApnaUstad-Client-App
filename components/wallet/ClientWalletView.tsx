import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Wallet, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '../../constants/Theme';
import { GlassCard } from '../home/GlassCard';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { UserWalletTransaction } from '../../hooks';

// ─── Constants & Types ────────────────────────────────────────────────────────
const FILTERS = ['All', 'Paid', 'Payable', 'Pending', 'Refund'] as const;
type FilterType = typeof FILTERS[number];

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

interface ClientWalletViewProps {
  payments: PaymentEntry[];
  summary: {
    total: number;
    paid: number;
    payable: number;
    pending: number;
    cancelled: number;
  };
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  refreshing: boolean;
  onRefresh: () => void;
  walletBalance?: number;
  walletTransactions?: UserWalletTransaction[];
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  paid: { color: Colors.success, icon: CheckCircle2, label: 'Paid' },
  payable: { color: '#00B8FF', icon: Clock, label: 'Payable' },
  pending: { color: '#FF8C00', icon: AlertCircle, label: 'Pending' },
  cancelled: { color: Colors.error, icon: XCircle, label: 'Cancelled' },
  refund: { color: Colors.cyan, icon: CheckCircle2, label: 'Refunded' },
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

export function ClientWalletView({
  payments,
  summary,
  activeFilter,
  onFilterChange,
  refreshing,
  onRefresh,
  walletBalance = 0,
  walletTransactions = [],
}: ClientWalletViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Create a unified chronological list of transactions (payments + dispute refunds)
  const unifiedHistory = React.useMemo(() => {
    const list = [
      ...payments.map((p) => ({
        _id: p._id,
        type: 'payment',
        status: p.status,
        amount: p.amount,
        title: p.booking?.category || 'Service Booking',
        date: new Date(p.updatedAt),
        rawDate: p.updatedAt,
        bookingId: p.booking?._id,
        description: 'Payment recorded for home service',
      })),
      ...walletTransactions.map((tx) => ({
        _id: tx._id,
        type: 'refund',
        status: 'refund',
        amount: tx.amount,
        title: 'Refund Credited',
        date: new Date(tx.createdAt),
        rawDate: tx.createdAt,
        bookingId: tx.reference?.booking,
        description: tx.description.split('(Dispute ID:')[0].trim(), // clean display description
      })),
    ];

    // Sort by date descending
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments, walletTransactions]);

  // Apply visual filters based on user selection
  const filteredItems = React.useMemo(() => {
    if (activeFilter === 'All') return unifiedHistory;
    if (activeFilter === 'Refund') {
      return unifiedHistory.filter((item) => item.type === 'refund');
    }
    return unifiedHistory.filter((item) => item.status.toLowerCase() === activeFilter.toLowerCase());
  }, [unifiedHistory, activeFilter]);

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
        <Text style={[styles.headerTitle, Typography.threeD]}>Wallet & History</Text>
        <Text style={styles.headerSubtitle}>View credit balance and payment history</Text>
      </View>

      {/* Available Credit / Refund Balance Hero Card */}
      <Animated.View entering={FadeInDown.duration(800)} style={styles.balanceSection}>
        <GlassCard
          style={styles.balanceCard}
          intensity={42}
          glowColor={Colors.cyan}
          gradient={['rgba(0,245,255,0.58)', 'rgba(0,122,255,0.34)', 'rgba(191,90,242,0.16)']}
        >
          <View style={styles.balanceContent}>
            <View style={styles.balanceTextGroup}>
              <Text style={styles.balanceLabel}>AVAILABLE REFUNDS</Text>
              <Text style={[styles.balanceAmount, Typography.threeD]}>
                Rs. {walletBalance.toLocaleString()}
              </Text>
              <Text style={styles.balanceSubtext}>
                Total Spent: Rs. {summary.total.toLocaleString()}
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

      {/* Unified Transactions Ledger */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, Typography.threeD]}>Transactions Ledger</Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => onFilterChange(filter)}
                style={[styles.filterPill, isActive && styles.activeFilterPill]}
              >
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payments & Refunds List */}
        <View style={styles.transactionList}>
          {filteredItems.map((item, index) => {
            const statusConf = STATUS_CONFIG[item.status.toLowerCase()] || STATUS_CONFIG.pending;
            const IconComponent = statusConf.icon;
            const dateStr = item.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <Animated.View
                key={item._id}
                entering={FadeInRight.delay(index * 60).duration(500)}
                layout={Layout.springify()}
              >
                <GlassCard
                  intensity={20}
                  style={[styles.transactionCard, { borderColor: statusConf.color + '48' }]}
                  padding={14}
                  gradient={cardGradient(statusConf.color, '#00B8FF')}
                  onPress={() => {
                    if (item.bookingId) {
                      router.push({
                        pathname: '/transaction-details',
                        params: { id: item.bookingId },
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
                        {item.title}
                      </Text>
                      <View style={styles.txMeta}>
                        <Text style={styles.txDate}>{dateStr}</Text>
                        <View style={[styles.txStatusBadge, { backgroundColor: statusConf.color + '15' }]}>
                          <Text style={[styles.txStatusText, { color: statusConf.color }]}>
                            {statusConf.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.txDescription} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>

                    <View style={styles.txAmountGroup}>
                      <Text style={[styles.txAmount, { color: item.type === 'refund' ? Colors.cyan : '#fff' }]}>
                        {item.type === 'refund' ? '+' : ''}Rs. {item.amount.toLocaleString()}
                      </Text>
                      <Text style={styles.txCurrency}>PKR</Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })}

          {filteredItems.length === 0 && (
            <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
              <Wallet size={40} color={Colors.textMuted} strokeWidth={1.2} />
              <Text style={styles.emptyTitle}>No Transactions</Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'All'
                  ? 'Your transaction history is currently empty.'
                  : `No ${activeFilter.toLowerCase()} records found.`}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.m,
    gap: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: { marginBottom: Spacing.m },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, color: Colors.textMuted, fontWeight: '600', marginTop: 4 },
  balanceSection: { marginBottom: 4 },
  balanceCard: { borderRadius: 24 },
  balanceContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceTextGroup: { gap: 4 },
  balanceLabel: { fontSize: 9, fontWeight: '900', color: Colors.cyan, letterSpacing: 2 },
  balanceAmount: { fontSize: 32, fontWeight: '900', color: '#fff' },
  balanceSubtext: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
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
  summaryRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  chipCard: { flex: 1, borderRadius: 14, minHeight: 74 },
  chipDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
  chipValue: { fontSize: 14, fontWeight: '900', color: '#fff', marginBottom: 2 },
  chipLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  transactionsSection: { marginTop: 8 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeFilterPill: {
    backgroundColor: 'rgba(0,245,255,0.08)',
    borderColor: 'rgba(0,245,255,0.25)',
  },
  filterText: { fontSize: 12, color: Colors.textMuted, fontWeight: '700' },
  activeFilterText: { color: Colors.cyan, fontWeight: '900' },
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
  txInfo: { flex: 1, minWidth: 0, gap: 2 },
  txTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  txStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  txStatusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  txDescription: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  txAmountGroup: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 15, fontWeight: '900' },
  txCurrency: { fontSize: 9, color: Colors.textMuted, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  emptySub: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});

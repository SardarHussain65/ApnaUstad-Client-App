import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import Animated, { FadeInDown, FadeInRight, LinearTransition, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownRight, Wallet, History, CreditCard, ChevronRight, Download } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { CosmicCircle } from '../../components/home/CosmicCircle';
import { useRouter } from 'expo-router';
import { useBookings } from '../../hooks';

const FILTERS = ['All', 'Income', 'Expense'] as const;
type FilterType = typeof FILTERS[number];

export default function WalletTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  
  // React Query hook
  const { data: bookings = [], isLoading } = useBookings();

  // Compute financial data from bookings
  const financialData = React.useMemo(() => {
    const completed = bookings.filter((b: any) => b.status === 'completed');
    const balance = completed.reduce((sum: number, b: any) => sum + (b.finalPrice || b.totalAmount || (b.jobPost?.budget || 0)), 0);
    
    const transactions = completed.map((b: any) => ({
      id: b._id,
      title: b.category || b.jobPost?.category || 'Mission Secured',
      date: new Date(b.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: b.finalPrice || b.totalAmount || b.jobPost?.budget || 0,
      type: 'Income' as const,
      icon: ArrowUpRight
    }));

    return { balance, transactions };
  }, [bookings]);

  // Filter transactions based on active filter
  const filteredTransactions = financialData.transactions.filter(t => {
    if (activeFilter === 'All') return true;
    return t.type === activeFilter;
  });

  return (
    <BackgroundWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.m }]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, Typography.threeD]}>Wallet & Earnings</Text>
          <Text style={styles.headerSubtitle}>Track your finances securely</Text>
        </View>

        {/* Main Balance Card */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.balanceSection}>
          <GlassCard style={styles.balanceCard} intensity={40} glowColor={Colors.cyan}>
            <View style={styles.balanceContent}>
              <View style={styles.balanceTextGroup}>
                <Text style={styles.balanceLabel}>TOTAL EARNINGS</Text>
                <Text style={[styles.balanceAmount, Typography.threeD]}>Rs. {financialData.balance.toLocaleString()}</Text>
                <Text style={styles.balanceSubtext}>Based on completed missions</Text>
              </View>
              {/* Replacing generic icon with a mini glowing orb effect */}
              <View style={styles.orbContainer}>
                 <CosmicCircle value={0.8} size={90} label="" subLabel="" />
                 <Wallet size={32} color="#fff" style={styles.orbIcon} />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(30,144,255,0.2)' }]}>
                  <Download size={20} color={Colors.cyan} />
                </View>
                <Text style={styles.actionText}>Withdraw</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,20,147,0.2)' }]}>
                  <CreditCard size={20} color="#FF1493" />
                </View>
                <Text style={styles.actionText}>Top Up</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,140,0,0.2)' }]}>
                  <History size={20} color={Colors.orange} />
                </View>
                <Text style={styles.actionText}>History</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Transactions Section */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
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
                  <Text style={[styles.filterText, isActive && styles.activeFilterText]}>{filter}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Transactions List */}
          <View style={styles.transactionList}>
            {isLoading ? (
               <ActivityIndicator color={Colors.cyan} style={{ marginTop: 20 }} />
            ) : (
              <>
                {filteredTransactions.map((item, index) => {
                  const isIncome = item.amount > 0;
                  const accentColor = isIncome ? Colors.success : Colors.error;
                  const IconComponent = item.icon;

                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInRight.delay(index * 100).duration(500)}
                      layout={Layout.springify()}
                    >
                      <GlassCard 
                        intensity={20} 
                        style={styles.transactionCard}
                        onPress={() => router.push({
                          pathname: '/transaction-details',
                          params: { id: item.id }
                        })}
                      >
                        <View style={styles.txRow}>
                          <View style={[styles.txIconBox, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                            <IconComponent size={20} color={accentColor} />
                          </View>
                          
                          <View style={styles.txInfo}>
                            <Text style={[styles.txTitle, Typography.threeD]}>{item.title}</Text>
                            <Text style={styles.txDate}>{item.date}</Text>
                          </View>

                          <View style={styles.txAmountGroup}>
                            <Text style={[styles.txAmount, { color: accentColor }]}>
                              {isIncome ? '+' : ''}{item.amount.toLocaleString()}
                            </Text>
                            <Text style={styles.txCurrency}>PKR</Text>
                          </View>
                        </View>
                      </GlassCard>
                    </Animated.View>
                  )
                })}
                
                {filteredTransactions.length === 0 && (
                  <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No Transactions</Text>
                    <Text style={styles.emptySub}>No mission activity detected in this sector.</Text>
                  </Animated.View>
                )}
              </>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
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
  balanceSection: {
    marginBottom: Spacing.xl,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceTextGroup: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    flexWrap: 'nowrap',
    letterSpacing: -1,
  },
  balanceSubtext: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '700',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 90,
  },
  orbIcon: {
    position: 'absolute',
    opacity: 0.9,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  transactionsSection: {
    flex: 1,
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
  seeAll: {
    color: Colors.cyan,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  txAmountGroup: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  txCurrency: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  }
});

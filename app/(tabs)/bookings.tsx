import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import Animated, { FadeInDown, LinearTransition, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar, Clock, ChevronRight, CheckCircle2, XCircle, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMyBookings, useWorkerBookings, useMyJobPosts } from '../../hooks';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Active', 'Completed', 'Cancelled'] as const;
type TabType = typeof TABS[number];

export default function BookingsTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role } = useAuth();
  const isWorker = role === 'worker';
  const [activeTab, setActiveTab] = useState<TabType>('Active');

  // React Query hooks
  const { 
    data: myBookings = [], 
    isLoading: loadingBookings, 
    refetch: refetchBookings, 
    isRefetching: isRefetchingBookings 
  } = isWorker ? useWorkerBookings() : useMyBookings();

  const { 
    data: myJobPosts = [], 
    isLoading: loadingJobs, 
    refetch: refetchJobs, 
    isRefetching: isRefetchingJobs 
  } = useMyJobPosts({ enabled: !isWorker });

  const isLoading = loadingBookings || (loadingJobs && !isWorker);
  const isRefetching = isRefetchingBookings || isRefetchingJobs;

  const handleRefresh = () => {
    refetchBookings();
    if (!isWorker) refetchJobs();
  };

  useEffect(() => {
    // Listen for real-time socket updates
    const unsubNew = socketService.on('booking:new', () => handleRefresh());
    const unsubStatus = socketService.on('booking:status', () => handleRefresh());
    const unsubJob = socketService.on('job:new', () => handleRefresh());

    return () => {
      unsubNew();
      unsubStatus();
      unsubJob();
    };
  }, []);

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

  // Combine and Normalize data for the list
  const combinedData = [
    ...myBookings.map(b => ({ ...b, _type: 'booking' as const })),
    ...(!isWorker ? myJobPosts.map(j => ({ ...j, _type: 'job' as const })) : [])
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
          <Text style={[styles.headerTitle, Typography.threeD]}>Mission Log</Text>
          <Text style={styles.headerSubtitle}>Real-time status of your active protocols</Text>
        </View>

        {/* Custom Tab Bar */}
        <View style={styles.tabContainer}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
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
                  {tab}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* List of Bookings */}
        {isLoading && combinedData.length === 0 ? (
          <ActivityIndicator color={Colors.cyan} style={{ marginTop: 40 }} />
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

              const title = isBooking ? booking.category : job.category;
              const scheduledDate = isBooking ? booking.scheduledDate : job.scheduledDate;
              const scheduledTime = isBooking ? booking.scheduledTime : job.scheduledTime;
              const address = isBooking ? booking.address : job.address;
              const status = item.status;

              let counterPartyName = 'Searching...';
              if (isBooking) {
                counterPartyName = isWorker ? booking.customer?.fullName : booking.worker?.fullName;
              }

              return (
                <Animated.View
                  key={item._id}
                  entering={FadeInDown.delay(index * 100).duration(500)}
                  layout={Layout.springify()}
                >
                  <GlassCard
                    style={styles.bookingCard}
                    intensity={25}
                    onPress={() => {
                      if (isBooking) {
                        router.push({
                          pathname: '/transaction-details',
                          params: { id: item._id }
                        });
                      } else {
                        router.push({
                          pathname: '/job-details',
                          params: { id: item._id }
                        });
                      }
                    }}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={[styles.itemTitle, Typography.threeD]}>{title}</Text>
                      <View style={[styles.statusBadge, { borderColor: statusColor + '40', backgroundColor: statusColor + '10' }]}>
                        {getStatusIcon(status, statusColor)}
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.itemProvider}>
                      {isBooking ? (isWorker ? 'Client: ' : 'Ustad: ') : 'Mission Protocol: '}
                      {isBooking ? (counterPartyName || 'Searching...') : 'OPEN BROADCAST'}
                    </Text>

                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Calendar size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText}>{scheduledDate?.split('T')[0] || 'Today'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Clock size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText}>{scheduledTime || 'ASAP'}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { marginTop: 8 }]}>
                      <MapPin size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {address || 'View Details for Location'}
                      </Text>
                    </View>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                         if (isBooking) {
                          router.push({
                            pathname: '/transaction-details',
                            params: { id: item._id }
                          });
                        } else {
                          router.push({
                            pathname: '/job-details',
                            params: { id: item._id }
                          });
                        }
                      }}
                    >
                      <Text style={styles.actionBtnText}>ACCESS INTEL</Text>
                      <ChevronRight size={16} color={Colors.cyan} />
                    </TouchableOpacity>

                  </GlassCard>
                </Animated.View>
              )
            })}
            {filteredData.length === 0 && (
              <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
                <GlassCard intensity={15} style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>NO {activeTab.toUpperCase()} MISSIONS</Text>
                  <Text style={styles.emptySub}>Your mission log is currently clear in this sector.</Text>
                </GlassCard>
              </Animated.View>
            )}
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
  },
  bookingCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemProvider: {
    fontSize: 13,
    color: Colors.cyan,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  actionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  actionBtnText: {
    color: Colors.cyan,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyContainer: {
    paddingTop: 40,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 24,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  }
});

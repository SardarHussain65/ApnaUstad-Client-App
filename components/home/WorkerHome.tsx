import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  Star,
  Activity,
  Zap,
  Briefcase
} from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useIncomingJob } from '../../context/IncomingJobContext';
import { Colors, Spacing, Typography, Shadows } from '../../constants/Theme';
import { HomeHeader } from './HomeHeader';
import { GlassCard } from './GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { CosmicCircle } from './CosmicCircle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../common/BackgroundWrapper';
import api from '../../services/api';

type WorkerCoordinates = {
  latitude: number;
  longitude: number;
};

export function WorkerHome() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { isOnline, setIsOnline } = useIncomingJob();
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({ revenue: 0, rating: 0, missions: 0, successRate: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [workerCoordinates, setWorkerCoordinates] = useState<WorkerCoordinates | null>(null);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (token) {
      refreshWorkerHome();
    }
  }, [token, isOnline, user?._id]);

  const getSavedCoordinates = (): WorkerCoordinates | null => {
    const coordinates = (user as any)?.location?.coordinates;
    const longitude = Number(coordinates?.[0]);
    const latitude = Number(coordinates?.[1]);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    return null;
  };

  const resolveWorkerLocation = async (): Promise<WorkerCoordinates | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        return {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
      }
    } catch (error) {
      console.warn('Could not read device location, using saved worker location:', error);
    }

    return getSavedCoordinates();
  };

  const refreshWorkerHome = async () => {
    const coordinates = await resolveWorkerLocation();
    setWorkerCoordinates(coordinates);
    await syncStatus(isOnline, coordinates);
    await fetchNearbyJobs(coordinates);
    fetchStats();
  };

  const syncStatus = async (online: boolean, coordinates?: WorkerCoordinates | null) => {
    try {
      if (!user?._id) return;

      const payload: any = {
        isAvailable: online,
      };

      if (coordinates) {
        payload.longitude = coordinates.longitude;
        payload.latitude = coordinates.latitude;
      }

      await api.patch(`/workers/${user._id}`, payload);

      console.log(`✅ Status Synced: ${online ? 'ONLINE' : 'OFFLINE'}`, coordinates || 'without GPS update');
    } catch (error) {
      console.error('❌ Error syncing status:', error);
    }
  };


  const fetchStats = async () => {
    try {
      const response = await api.get('/bookings/worker-bookings');
      // The backend returns { success: true, data: bookings[], pagination: { ... } }
      const allBookings = response.data.data || [];
      const completed = allBookings.filter((b: any) => b.status === 'completed');

      const totalRevenue = completed.reduce((sum: number, b: any) => {
        // Use finalPrice or totalAmount or workerEarning depending on business logic
        // In the model, it's totalAmount or workerEarning
        return sum + (b.workerEarning || 0);
      }, 0);

      const successRate = allBookings.length > 0 ? (completed.length / allBookings.length) : 1;

      setStats({
        revenue: (user as any)?.totalEarnings || totalRevenue,
        missions: (user as any)?.totalJobs || allBookings.length,
        rating: (user as any)?.rating || 0,
        successRate: successRate,
      } as any);
    } catch (error) {
      console.error('Error fetching worker stats:', error);
    }
  };

  const fetchNearbyJobs = async (coordinates?: WorkerCoordinates | null) => {
    setIsLoading(true);
    try {
      const activeCoordinates = coordinates || workerCoordinates;
      const response = await api.get('/jobs/nearby', {
        params: activeCoordinates
          ? {
            longitude: activeCoordinates.longitude,
            latitude: activeCoordinates.latitude,
          }
          : undefined,
      });

      if (response.data.success) {
        setJobs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      >
        <HomeHeader />

        {/* System Status Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(1000)} style={styles.dashboardSection}>
          <GlassCard hasGlow intensity={30} glowColor={isOnline ? Colors.success : Colors.error} style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: isOnline ? Colors.success : Colors.error }]} />
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.dashboardTitle, Typography.threeD]} numberOfLines={1} adjustsFontSizeToFit>{isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</Text>
                  <Text style={styles.dashboardSub} numberOfLines={1} adjustsFontSizeToFit>VISIBLE TO ALL CLIENTS</Text>
                </View>
              </View>
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: 'rgba(255,255,255,0.05)', true: Colors.success + '40' }}
                thumbColor={isOnline ? Colors.success : '#fff'}
              />
            </View>
          </GlassCard>

          {/* Compact Mission Dashboard Header */}
          <GlassCard intensity={30} style={styles.dashboardCard}>

            <View style={styles.dashboardContent}>
              <CosmicCircle
                value={stats.successRate || 1}
                label={`Rs. ${stats.revenue.toLocaleString()}`}
                subLabel="TOTAL REVENUE"
                size={160}
              />
              <View style={styles.miniStatsContainer}>
                <View style={[styles.miniStatRow, { backgroundColor: 'rgba(255, 20, 147, 0.1)' }]}>
                  <Activity size={18} color={Colors.cyan} />
                  <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{Math.round((stats.successRate || 1) * 100)}% <Text style={styles.miniStatLab}>SUCCESS</Text></Text>
                </View>
                <View style={[styles.miniStatRow, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                  <Star size={18} color="#ffd700" />
                  <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{stats.rating} <Text style={styles.miniStatLab}>RATING</Text></Text>
                </View>
                <View style={[styles.miniStatRow, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                  <Zap size={18} color="#BF5AF2" />
                  <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>{stats.missions} <Text style={styles.miniStatLab}>MISSIONS</Text></Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Nearby Jobs Feed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Briefcase color={Colors.cyan} size={24} />
              <Text style={[styles.sectionTitle, Typography.threeD]}>Open Missions</Text>
            </View>
            <TouchableOpacity onPress={refreshWorkerHome}>
              <Text style={styles.seeAll}>REFRESH</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color={Colors.cyan} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.agendaList}>
              {jobs.map((job, index) => (
                <Animated.View
                  key={job._id}
                  entering={FadeInDown.delay(index * 100).duration(600)}
                >
                  <GlassCard
                    style={styles.jobCard}
                    hasGlow={job.urgency === 'instant'}
                    glowColor={job.urgency === 'instant' ? Colors.cyan : Colors.primary}
                    onPress={() => router.push({
                      pathname: '/bid-submission',
                      params: { jobId: job._id, title: job.category, urgency: job.urgency }
                    })}
                  >
                    <View style={styles.jobRow}>
                      <View style={styles.typeCluster}>
                        {job.urgency === 'instant' ? (
                          <Zap size={20} color={Colors.cyan} />
                        ) : (
                          <Calendar size={20} color={Colors.worker} />
                        )}
                        <Text style={[styles.jobTypeLabel, { color: job.urgency === 'instant' ? Colors.cyan : Colors.worker }]}>
                          {job.urgency.toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.jobMain}>
                        <Text style={[styles.jobCustomer, Typography.threeD]}>{job.category}</Text>
                        <Text style={styles.jobService} numberOfLines={1}>{job.description}</Text>
                        <View style={styles.jobMeta}>
                          <MapPin size={12} color="#fff" opacity={0.7} />
                          <Text style={styles.metaText}>{job.address || 'Nearby'}</Text>
                          <View style={styles.dot} />
                          <Text style={styles.distanceText}>1.2 km away</Text>
                        </View>
                      </View>

                      <View style={styles.actionArea}>
                        <ChevronRight size={20} color="#fff" />
                      </View>
                    </View>
                  </GlassCard>
                </Animated.View>
              ))}

              {jobs.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No missions detected within your orbit.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  dashboardSection: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.m,
  },
  statusCard: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardCard: {
    padding: 10,
    borderRadius: 30,
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  },
  dashboardSub: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  miniStatsContainer: {
    flex: 1,
    marginLeft: 16, // reduced from 24 to give more space
    gap: 12,
  },
  miniStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 20, 147, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  miniStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  miniStatLab: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  section: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.l,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  seeAll: {
    color: Colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  agendaList: {
    gap: 12,
  },
  jobCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typeCluster: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    minWidth: 70,
    gap: 4,
  },
  jobTypeLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  jobMain: {
    flex: 1,
    paddingLeft: 16,
  },
  jobCustomer: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  jobService: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  distanceText: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '800',
  },
  actionArea: {
    paddingLeft: 10,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});

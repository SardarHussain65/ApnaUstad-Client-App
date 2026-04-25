import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Briefcase,
  MapPin,
  Zap,
  Calendar,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';

import { Colors, Spacing, Typography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { useNearbyJobs, useUserLocation } from '../hooks';

const { width } = Dimensions.get('window');

export default function JobsNearbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useUserLocation();
  const { data: jobs = [], isLoading, refetch } = useNearbyJobs(location?.longitude, location?.latitude);

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          entering={SlideInDown.duration(400)}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, Typography.threeD]}>NEARBY MISSIONS</Text>
            <Text style={styles.headerSub}>
              {isLoading ? 'Scanning...' : `${jobs.length} active opportunities`}
            </Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
            <Filter color="#fff" size={20} />
          </TouchableOpacity>
        </Animated.View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.cyan} size="large" />
              <Text style={styles.loadingText}>Scanning local frequency...</Text>
            </View>
          ) : jobs.length > 0 ? (
            <View style={styles.list}>
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
                          {(job.urgency || 'Normal').toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.jobMain}>
                        <Text style={[styles.jobTitle, Typography.threeD]}>{job.category}</Text>
                        <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
                        <View style={styles.jobMeta}>
                          <MapPin size={12} color={Colors.textDim} />
                          <Text style={styles.metaText}>{job.address || 'Nearby'}</Text>
                          <View style={styles.dot} />
                          <Text style={styles.distanceText}>1.2 km away</Text>
                        </View>
                      </View>

                      <View style={styles.actionArea}>
                        <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
                      </View>
                    </View>
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Briefcase size={48} color={Colors.textDim} />
              </View>
              <Text style={styles.emptyTitle}>No Missions Found</Text>
              <Text style={styles.emptySub}>
                We couldn't detect any active jobs in your current orbit. Try refreshing or expanding your range.
              </Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
                <Text style={styles.refreshBtnText}>REFRESH SCAN</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.m,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textDim,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textDim,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  list: {
    gap: 16,
  },
  jobCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
  jobTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  jobDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  emptySub: {
    color: Colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  refreshBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.cyan,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

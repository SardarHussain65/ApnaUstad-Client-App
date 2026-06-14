import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { Colors, Typography } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { Zap, Calendar, MapPin, ChevronRight, Clock, Banknote } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { calculateDistance, formatDistanceKm } from '../../utils/mapUtils';

interface WorkerJobCardProps {
  job: any;
  index: number;
  onPress: (job: any) => void;
  workerCoordinates?: { latitude: number; longitude: number } | null;
}

const getTimeAgo = (dateString: string) => {
  if (!dateString) return 'Pending';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export const WorkerJobCard = React.memo(({ job, index, onPress, workerCoordinates }: WorkerJobCardProps) => {
  const { user } = useAuth();
  const workerLoc = (user as any)?.address || (user as any)?.city || '';
  const distance = useMemo(() => {
    if (workerCoordinates && job.location?.coordinates) {
      const dist = calculateDistance(workerCoordinates, {
        latitude: job.location.coordinates[1],
        longitude: job.location.coordinates[0],
      });
      return formatDistanceKm(dist);
    }
    return 'Nearby';
  }, [workerCoordinates, job.location]);

  const timeAgo = useMemo(() => getTimeAgo(job.createdAt), [job.createdAt]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(600)}>
      <GlassCard
        style={styles.jobCard}
        hasGlow={job.urgency === 'instant'}
        glowColor={job.urgency === 'instant' ? Colors.cyan : Colors.worker}
        gradient={job.urgency === 'instant' ? ['#004D4D', '#001A1A'] as any : ['#2D1400', '#0F0700'] as any}
        onPress={() => onPress(job)}
        padding={0}
      >
        <View style={styles.container}>
          {/* Top Header Row */}
          <View style={styles.headerRow}>
            <View style={[styles.urgencyBadge, { backgroundColor: job.urgency === 'instant' ? '#006666' : '#663300' }]}>
              {job.urgency === 'instant' ? (
                <Zap size={12} color="#00FFFF" fill="#00FFFF" />
              ) : (
                <Calendar size={12} color="#FF8C00" />
              )}
              <Text style={[styles.urgencyText, { color: job.urgency === 'instant' ? '#00FFFF' : '#FF8C00' }]}>
                {job.urgency === 'instant' ? 'INSTANT JOB' : job.urgency.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.timeContainer}>
              <Clock size={10} color="rgba(255,255,255,0.4)" />
              <Text style={styles.timeText}>{timeAgo}</Text>
            </View>
          </View>

          {/* Main Content Area */}
          <View style={styles.mainContent}>
            <View style={styles.infoSection}>
              <Text style={[styles.categoryText, Typography.threeD]}>{job.category}</Text>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {job.description}
              </Text>
            </View>

            <View style={styles.budgetSection}>
              <View style={styles.budgetBadge}>
                <Banknote size={14} color={Colors.green} />
                <Text style={styles.budgetText}>Rs. {job.amount || 0}</Text>
              </View>
            </View>
          </View>

          {/* Footer Meta Area */}
          <View style={styles.footerRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.addressText} numberOfLines={1}>
                {job.address || 'Location Hidden'}
              </Text>
            </View>
            
            <View style={styles.distanceBadge}>
              <View style={[styles.dot, { backgroundColor: job.urgency === 'instant' ? Colors.cyan : Colors.worker }]} />
              <Text style={[styles.distanceText, { color: job.urgency === 'instant' ? Colors.cyan : Colors.worker }]}>
                {distance}
              </Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
            </View>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
});
WorkerJobCard.displayName = 'WorkerJobCard';

const styles = StyleSheet.create({
  jobCard: {
    borderRadius: 24,
    marginBottom: 4,
  },
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoSection: {
    flex: 1,
  },
  categoryText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    fontWeight: '500',
  },
  budgetSection: {
    alignItems: 'flex-end',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 127, 0.2)',
  },
  budgetText: {
    color: Colors.green,
    fontWeight: '900',
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  addressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

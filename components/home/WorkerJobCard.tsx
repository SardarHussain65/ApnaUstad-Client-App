import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { alpha, Spacing, BorderRadius, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
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
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
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
  const urgencyColor = job.urgency === 'instant' ? colors.cyan : colors.worker;
  const urgencyBg = job.urgency === 'instant' ? alpha(theme.colors.brand.primary, 0.4) : alpha(colors.worker, 0.4);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(600)}>
      <GlassCard
        style={styles.jobCard}
        hasGlow={job.urgency === 'instant'}
        glowColor={urgencyColor}
        gradient={job.urgency === 'instant' ? [alpha(theme.colors.brand.primary, 0.8), alpha(theme.colors.background.screen, 0.9)] as any : [alpha(colors.worker, 0.7), alpha(theme.colors.background.screen, 0.9)] as any}
        onPress={() => onPress(job)}
        padding={0}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyBg, borderColor: alpha(urgencyColor, 0.3) }]}>
              {job.urgency === 'instant' ? (
                <Zap size={12} color={colors.cyan} fill={colors.cyan} />
              ) : (
                <Calendar size={12} color="#FF8C00" />
              )}
              <Text style={[styles.urgencyText, { color: job.urgency === 'instant' ? colors.cyan : '#FF8C00' }]}>
                {job.urgency === 'instant' ? 'INSTANT JOB' : job.urgency.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.timeContainer}>
              <Clock size={10} color={alpha(theme.colors.text.primary, 0.4)} />
              <Text style={[styles.timeText, { color: alpha(theme.colors.text.primary, 0.4) }]}>{timeAgo}</Text>
            </View>
          </View>

          <View style={styles.mainContent}>
            <View style={styles.infoSection}>
              <Text style={[styles.categoryText, typography.threeD, { color: theme.colors.text.primary }]}>{job.category}</Text>
              <Text style={[styles.descriptionText, { color: alpha(theme.colors.text.primary, 0.6) }]} numberOfLines={2}>
                {job.description}
              </Text>
            </View>

            <View style={styles.budgetSection}>
              <View style={[styles.budgetBadge, { backgroundColor: alpha(colors.success, 0.1), borderColor: alpha(colors.success, 0.2) }]}>
                <Banknote size={14} color={colors.success} />
                <Text style={[styles.budgetText, { color: colors.success }]}>Rs. {job.amount || 0}</Text>
              </View>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color={alpha(theme.colors.text.primary, 0.5)} />
              <Text style={[styles.addressText, { color: alpha(theme.colors.text.primary, 0.5) }]} numberOfLines={1}>
                {job.address || 'Location Hidden'}
              </Text>
            </View>
            
            <View style={styles.distanceBadge}>
              <View style={[styles.dot, { backgroundColor: urgencyColor }]} />
              <Text style={[styles.distanceText, { color: urgencyColor }]}>
                {distance}
              </Text>
              <ChevronRight size={14} color={alpha(theme.colors.text.primary, 0.3)} />
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
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  budgetSection: {
    alignItems: 'flex-end',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
  },
  budgetText: {
    fontWeight: '900',
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
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
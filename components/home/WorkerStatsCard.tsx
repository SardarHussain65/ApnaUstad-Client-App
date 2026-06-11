import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Banknote, Briefcase, CheckCircle2, Clock, Star } from 'lucide-react-native';
import { GlassCard } from './GlassCard';
import { Colors, BorderRadius, Typography } from '../../constants/Theme';

interface WorkerStatsCardProps {
  stats: {
    revenue: number;
    rating: number;
    missions: number;
    completed?: number;
    successRate: number;
    activeCount?: number;
  };
}

export const WorkerStatsCard = React.memo(function WorkerStatsCard({ stats }: WorkerStatsCardProps) {
  const activeJobs = stats.activeCount ?? 0;
  const completed = stats.completed ?? 0;
  const successPercent = stats.missions > 0 ? Math.round(stats.successRate * 100) : 0;
  const activeSummary = activeJobs > 0
    ? `${activeJobs} active job${activeJobs > 1 ? 's' : ''}`
    : 'Ready for new jobs';
  const completedSummary = `${completed}/${stats.missions || 0} completed`;

  return (
    <GlassCard
      intensity={42}
      glowColor={Colors.green}
      gradient={['rgba(0,255,127,0.16)', 'rgba(0,245,255,0.12)', 'rgba(5,5,16,0.98)']}
      padding={0}
      style={styles.dashboardCard}
      contentStyle={styles.dashboardContent}
    >
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.topRow}>
        <View style={styles.earningsCluster}>
          <View style={styles.heroIconBox}>
            <Banknote size={23} color={Colors.green} strokeWidth={2.5} />
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroLabel}>Total Earnings</Text>
            <Text style={[styles.heroValue, Typography.threeD]}>
              Rs. {Number(stats.revenue || 0).toLocaleString()}
            </Text>
            <Text style={styles.heroSubText}>{activeSummary}</Text>
          </View>
        </View>

        <View style={styles.ratingBadge}>
          <Star size={14} color="#facc15" fill="#facc15" strokeWidth={2.4} />
          <View>
            <Text style={styles.ratingValue}>{Number(stats.rating || 0).toFixed(1)}</Text>
            <Text style={styles.ratingLabel}>Rating</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Job success</Text>
          <Text style={styles.progressValue}>{completedSummary}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${successPercent}%` }]} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <View style={[styles.statIconBubble, { backgroundColor: 'rgba(0,245,255,0.1)' }]}>
            <Clock size={14} color={Colors.cyan} />
          </View>
          <Text style={styles.statValue}>{activeJobs}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statTile}>
          <View style={[styles.statIconBubble, { backgroundColor: 'rgba(0,255,127,0.1)' }]}>
            <CheckCircle2 size={14} color={Colors.green} />
          </View>
          <Text style={styles.statValue}>{completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={styles.statTile}>
          <View style={[styles.statIconBubble, { backgroundColor: 'rgba(191,90,242,0.12)' }]}>
            <Briefcase size={14} color={Colors.purple} />
          </View>
          <Text style={styles.statValue}>{stats.missions}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  dashboardCard: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.2)',
    marginTop: 14,
  },
  dashboardContent: {
    position: 'relative',
    overflow: 'hidden',
    padding: 16,
  },
  glowOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -72,
    right: -45,
    backgroundColor: 'rgba(0,255,127,0.13)',
  },
  glowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -70,
    left: -42,
    backgroundColor: 'rgba(0,245,255,0.14)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  earningsCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBox: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: 'rgba(0,255,127,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,127,0.24)',
  },
  heroTextContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },
  heroSubText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(250,204,21,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
  },
  ratingValue: {
    color: '#facc15',
    fontSize: 14,
    fontWeight: '900',
  },
  ratingLabel: {
    color: 'rgba(250,204,21,0.76)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressBlock: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 11,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  progressTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  progressValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.green,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  statTile: {
    flex: 1,
    minHeight: 82,
    borderRadius: 18,
    padding: 11,
    backgroundColor: 'rgba(6,8,24,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  statIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginTop: 2,
  },
});

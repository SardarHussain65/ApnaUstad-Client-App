import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { CosmicCircle } from './CosmicCircle';
import { Colors, Typography } from '../../constants/Theme';
import { Activity, Star, Zap } from 'lucide-react-native';

interface WorkerStatsCardProps {
  stats: {
    revenue: number;
    rating: number;
    missions: number;
    successRate: number;
  };
}

export const WorkerStatsCard = React.memo(({ stats }: WorkerStatsCardProps) => {
  return (
    <GlassCard intensity={30} style={styles.dashboardCard}>
      <View style={styles.dashboardContent}>
        <CosmicCircle
          value={stats.successRate || 1}
          label={`Rs. ${stats.revenue.toLocaleString()}`}
          subLabel="TOTAL REVENUE"
          size={160}
        />
        <View style={styles.miniStatsContainer}>
          <View style={[styles.miniStatRow, { backgroundColor: 'rgba(0, 102, 102, 0.15)', borderColor: 'rgba(0, 255, 255, 0.2)' }]}>
            <Activity size={18} color={Colors.cyan} />
            <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
              {Math.round((stats.successRate || 1) * 100)}% <Text style={styles.miniStatLab}>SUCCESS</Text>
            </Text>
          </View>
          <View style={[styles.miniStatRow, { backgroundColor: 'rgba(0, 102, 102, 0.15)', borderColor: 'rgba(0, 255, 255, 0.2)' }]}>
            <Star size={18} color="#ffd700" />
            <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
              {stats.rating} <Text style={styles.miniStatLab}>RATING</Text>
            </Text>
          </View>
          <View style={[styles.miniStatRow, { backgroundColor: 'rgba(0, 102, 102, 0.15)', borderColor: 'rgba(0, 255, 255, 0.2)' }]}>
            <Zap size={18} color="#BF5AF2" />
            <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
              {stats.missions} <Text style={styles.miniStatLab}>MISSIONS</Text>
            </Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  dashboardCard: {
    padding: 10,
    borderRadius: 30,
  },
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  miniStatsContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 12,
  },
  miniStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
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
});

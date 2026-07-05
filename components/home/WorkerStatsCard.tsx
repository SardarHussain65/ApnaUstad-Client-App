import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Banknote, Briefcase, CheckCircle2, Clock, Star } from 'lucide-react-native';
import { GlassCard } from './GlassCard';
import { alpha, Spacing, BorderRadius, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';

import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const activeJobs = stats.activeCount ?? 0;

  const innerBorderColor = theme.id === 'current'
    ? alpha('#FFFFFF', 0.12)
    : theme.colors.border.default;
  const completed = stats.completed ?? 0;
  const successPercent = stats.missions > 0 ? Math.round(stats.successRate * 100) : 0;
  const activeSummary = activeJobs > 0
    ? `${activeJobs} ${t('home.client.active').toLowerCase()}`
    : t('home.worker.readyWork');
  const completedSummary = `${completed}/${stats.missions || 0} ${t('common.completed').toLowerCase()}`;

  return (
    <GlassCard
      intensity={42}
      glowColor={colors.success}
      gradient={[alpha(colors.success, 0.16), alpha(colors.cyan, 0.12), alpha(theme.colors.surface.card, 0.18)]}
      padding={0}
      style={styles.dashboardCard}
      contentStyle={styles.dashboardContent}
    >
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.topRow}>
        <View style={styles.earningsCluster}>
          <View style={[styles.heroIconBox, { borderColor: innerBorderColor }]}>
            <Banknote size={23} color={colors.success} strokeWidth={2.5} />
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={[styles.heroLabel, { color: theme.colors.text.muted }]}>{t('home.worker.revenue')}</Text>
            <Text style={[styles.heroValue, typography.threeD, { color: theme.colors.text.primary }]}>
              Rs. {Number(stats.revenue || 0).toLocaleString()}
            </Text>
            <Text style={[styles.heroSubText, { color: theme.colors.text.muted }]}>{activeSummary}</Text>
          </View>
        </View>

        <View style={[styles.ratingBadge, { borderColor: innerBorderColor, backgroundColor: 'rgba(250,204,21,0.12)' }]}>
          <Star size={14} color="#facc15" fill="#facc15" strokeWidth={2.4} />
          <View>
            <Text style={styles.ratingValue}>{Number(stats.rating || 0).toFixed(1)}</Text>
            <Text style={styles.ratingLabel}>{t('home.worker.rating')}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.progressBlock, { borderColor: innerBorderColor }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: theme.colors.text.muted }]}>{t('home.client.completionRate')}</Text>
          <Text style={[styles.progressValue, { color: theme.colors.text.primary }]}>{completedSummary}</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.surface.subtle }]}>
          <View style={[styles.progressFill, { width: `${successPercent}%`, backgroundColor: colors.success }]} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statTile, { borderColor: innerBorderColor }]}>
          <View style={[styles.statIconBubble, { backgroundColor: alpha(colors.cyan, 0.1) }]}>
            <Clock size={14} color={colors.cyan} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{activeJobs}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('home.client.active')}</Text>
        </View>

        <View style={[styles.statTile, { borderColor: innerBorderColor }]}>
          <View style={[styles.statIconBubble, { backgroundColor: alpha(colors.success, 0.1) }]}>
            <CheckCircle2 size={14} color={colors.success} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{completed}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('home.client.completed')}</Text>
        </View>

        <View style={[styles.statTile, { borderColor: innerBorderColor }]}>
          <View style={[styles.statIconBubble, { backgroundColor: alpha(theme.colors.brand.secondary, 0.12) }]}>
            <Briefcase size={14} color={theme.colors.brand.secondary} />
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{stats.missions}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('profile.jobs')}</Text>
        </View>
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  dashboardCard: {
    borderRadius: 30,
    borderWidth: 1,
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
  },
  glowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -70,
    left: -42,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroTextContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  heroSubText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  ratingLabel: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressBlock: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 11,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  progressTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
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
    borderWidth: 1,
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
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginTop: 2,
  },
});
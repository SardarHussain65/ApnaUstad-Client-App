import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Banknote, BriefcaseBusiness, CalendarCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from './GlassCard';
import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { EarningsSummary } from '../../hooks/useWorkerAnalytics';

interface WorkerQuickInsightsProps {
  summary: EarningsSummary;
}

export const WorkerQuickInsights = React.memo(function WorkerQuickInsights({
  summary,
}: WorkerQuickInsightsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();

  const cards = [
    {
      key: 'today',
      icon: Banknote,
      color: colors.success,
      tint: alpha(colors.success, 0.12),
      value: `Rs. ${(summary.todayEarnings || 0).toLocaleString()}`,
      label: t('home.worker.todayEarned', 'Today earned'),
      meta: t('home.worker.todayJobsCount', '{{count}} jobs today', { count: summary.todayJobs || 0 }),
    },
    {
      key: 'week',
      icon: BriefcaseBusiness,
      color: colors.cyan,
      tint: alpha(colors.cyan, 0.12),
      value: String(summary.thisWeekJobs || 0),
      label: t('home.worker.jobsThisWeek', 'Jobs this week'),
      meta: `Rs. ${(summary.thisWeekEarnings || 0).toLocaleString()}`,
    },
    {
      key: 'month',
      icon: CalendarCheck,
      color: colors.worker,
      tint: alpha(colors.worker, 0.12),
      value: `Rs. ${(summary.thisMonthEarnings || 0).toLocaleString()}`,
      label: t('home.worker.monthEarned', 'Month earned'),
      meta: t('home.worker.monthJobsCount', '{{count}} jobs this month', { count: summary.thisMonthJobs || 0 }),
    },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.container}>
      {cards.map(({ key, icon: Icon, color, tint, value, label, meta }) => (
        <GlassCard
          key={key}
          intensity={28}
          glowColor={color}
          style={styles.card}
          padding={0}
          contentStyle={styles.cardContent}
        >
          <View style={[styles.iconBubble, { backgroundColor: tint }]}>
            <Icon size={15} color={color} strokeWidth={2.5} />
          </View>
          <Text style={[styles.value, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          <Text style={[styles.label, { color: theme.colors.text.muted }]} numberOfLines={2}>
            {label}
          </Text>
          <Text style={[styles.subMeta, { color: theme.colors.text.dim }]} numberOfLines={1}>
            {meta}
          </Text>
        </GlassCard>
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 0,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardContent: {
    padding: 11,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 112,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  value: {
    fontSize: 15,
    fontWeight: '900',
    minHeight: 20,
  },
  label: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginTop: 2,
    minHeight: 20,
  },
  subMeta: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 3,
  },
});

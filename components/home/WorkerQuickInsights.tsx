import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Banknote, BriefcaseBusiness, CalendarCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from './GlassCard';
import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { EarningsSummary } from '../../hooks/useWorkerAnalytics';
import { useIsRTL } from '../../context/LanguageContext';

interface WorkerQuickInsightsProps {
  summary: EarningsSummary;
}

export const WorkerQuickInsights = React.memo(function WorkerQuickInsights({
  summary,
}: WorkerQuickInsightsProps) {
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();

  const isLight = !theme.isDark;

  const cards = [
    {
      key: 'today',
      icon: Banknote,
      color: isLight ? '#15803D' : colors.success,
      bg: isLight ? '#DCFCE7' : '#0F291E',
      border: isLight ? '#22C55E' : alpha(colors.success, 0.55),
      tint: isLight ? '#BBF7D0' : alpha(colors.success, 0.18),
      value: `Rs. ${(summary.todayEarnings || 0).toLocaleString()}`,
      label: t('home.worker.todayEarned', 'Earned Today'),
      meta: t('home.worker.todayJobsCount', '{{count}} jobs today', { count: summary.todayJobs || 0 }),
    },
    {
      key: 'week',
      icon: BriefcaseBusiness,
      color: isLight ? '#1D4ED8' : colors.cyan,
      bg: isLight ? '#DBEAFE' : '#132238',
      border: isLight ? '#3B82F6' : alpha(colors.cyan, 0.55),
      tint: isLight ? '#BFDBFE' : alpha(colors.cyan, 0.18),
      value: String(summary.thisWeekJobs || 0),
      label: t('home.worker.jobsThisWeekLabel', 'Jobs This Week'),
      meta: `Rs. ${(summary.thisWeekEarnings || 0).toLocaleString()}`,
    },
    {
      key: 'month',
      icon: CalendarCheck,
      color: isLight ? '#B45309' : colors.worker,
      bg: isLight ? '#FEF3C7' : '#2E1F0F',
      border: isLight ? '#F59E0B' : alpha(colors.worker, 0.55),
      tint: isLight ? '#FDE68A' : alpha(colors.worker, 0.18),
      value: `Rs. ${(summary.thisMonthEarnings || 0).toLocaleString()}`,
      label: t('home.worker.monthEarned', 'Earned This Month'),
      meta: t('home.worker.monthJobsCount', '{{count}} jobs this month', { count: summary.thisMonthJobs || 0 }),
    },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.container}>
      {cards.map(({ key, icon: Icon, color, bg, border, tint, value, label, meta }) => (
        <View
          key={key}
          style={[
            styles.card,
            {
              backgroundColor: bg,
              borderColor: border,
            },
          ]}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconBubble, { backgroundColor: tint, borderColor: alpha(color, 0.35) }]}>
              <Icon size={17} color={color} strokeWidth={2.5} />
            </View>
            <Text style={[styles.value, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </Text>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]} numberOfLines={2}>
              {label}
            </Text>
            <Text style={[styles.subMeta, { color }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        </View>
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.8,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 122,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 17,
    fontWeight: '900',
    minHeight: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginTop: 3,
    minHeight: 24,
  },
  subMeta: {
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 4,
  },
});

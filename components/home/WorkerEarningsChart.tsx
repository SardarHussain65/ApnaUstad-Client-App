import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Rect, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { TrendingUp, TrendingDown, Trophy, Flame, Calendar, BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from './GlassCard';
import { alpha, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { EarningsDataPoint, EarningsSummary } from '../../hooks/useWorkerAnalytics';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING_H = 20;
const CHART_WIDTH = SCREEN_WIDTH - 48 - CHART_PADDING_H * 2;
const CHART_HEIGHT = 140;
const BAR_GAP = 6;

type Period = 'daily' | 'weekly' | 'monthly';

interface WorkerEarningsChartProps {
  daily: EarningsDataPoint[];
  weekly: EarningsDataPoint[];
  monthly: EarningsDataPoint[];
  summary: EarningsSummary;
}

// ─── Animated Bar ────────────────────────────────────────────────────────────
interface AnimatedBarProps {
  x: number;
  barWidth: number;
  height: number;
  maxHeight: number;
  index: number;
  isMax: boolean;
}

function AnimatedBar({ x, barWidth, height, maxHeight, index, isMax }: AnimatedBarProps) {
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = 0;
    animatedHeight.value = withDelay(
      index * 60,
      withTiming(height, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, [height, index, animatedHeight]);

  const animatedProps = useAnimatedProps(() => ({
    y: maxHeight - animatedHeight.value,
    height: animatedHeight.value,
  }));

  return (
    <AnimatedRect
      animatedProps={animatedProps}
      x={x}
      width={barWidth}
      rx={barWidth / 2.5}
      fill={isMax ? 'url(#barGradientMax)' : 'url(#barGradient)'}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const WorkerEarningsChart = React.memo(function WorkerEarningsChart({
  daily,
  weekly,
  monthly,
  summary,
}: WorkerEarningsChartProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const [period, setPeriod] = useState<Period>('daily');

  const data = period === 'daily' ? daily : period === 'weekly' ? weekly : monthly;
  const maxEarnings = Math.max(...data.map((d) => d.earnings), 1);
  const barCount = data.length || 1;
  const barWidth = Math.min(
    (CHART_WIDTH - BAR_GAP * (barCount - 1)) / barCount,
    42
  );
  const totalBarsWidth = barCount * barWidth + (barCount - 1) * BAR_GAP;
  const chartStartX = (CHART_WIDTH - totalBarsWidth) / 2 + CHART_PADDING_H;

  const periodTotal =
    period === 'daily'
      ? summary.thisWeekEarnings
      : period === 'weekly'
        ? summary.thisMonthEarnings
        : data.reduce((s, d) => s + d.earnings, 0);

  const periodLabel =
    period === 'daily'
      ? t('home.worker.thisWeek', 'This Week')
      : period === 'weekly'
        ? t('home.worker.thisMonth', 'This Month')
        : t('home.worker.last6Months', 'Last 6 Months');

  const getMaxBarIndex = useCallback(() => {
    let maxIdx = 0;
    let maxVal = 0;
    data.forEach((d, i) => {
      if (d.earnings > maxVal) { maxVal = d.earnings; maxIdx = i; }
    });
    return maxIdx;
  }, [data]);

  const maxBarIndex = getMaxBarIndex();

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const formatCurrency = (n: number) => {
    if (n >= 100000) return `${(n / 1000).toFixed(0)}K`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`.replace('.0K', 'K');
    return n.toString();
  };

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <GlassCard
        intensity={35}
        glowColor={colors.cyan}
        gradient={[alpha(colors.cyan, 0.08), alpha(theme.colors.brand.secondary, 0.06), alpha(theme.colors.surface.card, 0.18)]}
        padding={0}
        style={styles.card}
        contentStyle={styles.cardContent}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BarChart3 size={18} color={colors.cyan} strokeWidth={2.5} />
            <Text style={[styles.headerTitle, typography.threeD, { color: theme.colors.text.primary }]}>
              {t('home.worker.earningsChart', 'Earnings Overview')}
            </Text>
          </View>
          <View style={styles.periodTotal}>
            <Text style={[styles.periodTotalLabel, { color: theme.colors.text.muted }]}>{periodLabel}</Text>
            <Text style={[styles.periodTotalValue, typography.threeD, { color: colors.success }]}>
              Rs. {periodTotal.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* ── Period Tabs ── */}
        <View style={[styles.tabs, {
          backgroundColor: alpha(theme.colors.text.primary, 0.04),
        }]}>
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.tab, period === p && styles.tabActive, {
                backgroundColor: period === p ? alpha(colors.cyan, 0.15) : 'transparent',
                borderColor: period === p ? alpha(colors.cyan, 0.25) : 'transparent',
              }]}
            >
              <Text style={[styles.tabText, {
                color: period === p ? colors.cyan : theme.colors.text.muted,
                fontWeight: period === p ? '900' : '700',
              }]}>
                {p === 'daily'
                  ? t('home.worker.daily', 'Daily')
                  : p === 'weekly'
                    ? t('home.worker.weekly', 'Weekly')
                    : t('home.worker.monthly', 'Monthly')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SVG Chart ── */}
        <View style={styles.chartContainer}>
          <Svg
            width={CHART_WIDTH + CHART_PADDING_H * 2}
            height={CHART_HEIGHT + 30}
          >
            <Defs>
              <SvgLinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.cyan} stopOpacity="0.9" />
                <Stop offset="1" stopColor={colors.cyan} stopOpacity="0.3" />
              </SvgLinearGradient>
              <SvgLinearGradient id="barGradientMax" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.success} stopOpacity="1" />
                <Stop offset="0.5" stopColor={colors.cyan} stopOpacity="0.9" />
                <Stop offset="1" stopColor={colors.cyan} stopOpacity="0.4" />
              </SvgLinearGradient>
            </Defs>

            {/* Grid lines */}
            {gridLines.map((pct, i) => {
              const y = CHART_HEIGHT * (1 - pct);
              return (
                <React.Fragment key={i}>
                  <Line
                    x1={CHART_PADDING_H}
                    y1={y}
                    x2={CHART_WIDTH + CHART_PADDING_H}
                    y2={y}
                    stroke={alpha(theme.colors.text.primary, 0.06)}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  {pct > 0 && (
                    <SvgText
                      x={CHART_PADDING_H - 4}
                      y={y + 3}
                      fill={alpha(theme.colors.text.primary, 0.3)}
                      fontSize={8}
                      textAnchor="end"
                    >
                      {formatCurrency(Math.round(maxEarnings * pct))}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}

            {/* Bars */}
            {data.map((d, i) => {
              const barHeight = (d.earnings / maxEarnings) * CHART_HEIGHT;
              const x = chartStartX + i * (barWidth + BAR_GAP);
              return (
                <AnimatedBar
                  key={`${period}-${i}`}
                  x={x}
                  barWidth={barWidth}
                  height={Math.max(barHeight, d.earnings > 0 ? 4 : 0)}
                  maxHeight={CHART_HEIGHT}
                  index={i}
                  isMax={i === maxBarIndex && d.earnings > 0}
                />
              );
            })}

            {/* X-axis labels */}
            {data.map((d, i) => {
              const x = chartStartX + i * (barWidth + BAR_GAP) + barWidth / 2;
              return (
                <SvgText
                  key={`label-${period}-${i}`}
                  x={x}
                  y={CHART_HEIGHT + 16}
                  fill={i === maxBarIndex ? colors.cyan : alpha(theme.colors.text.primary, 0.45)}
                  fontSize={9}
                  fontWeight={i === maxBarIndex ? '800' : '600'}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              );
            })}
          </Svg>
        </View>

        {/* ── Summary Row ── */}
        <View style={[styles.summaryRow, {
          borderTopColor: alpha(theme.colors.text.primary, 0.06),
        }]}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: alpha(colors.success, 0.1) }]}>
              <Trophy size={13} color={colors.success} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                Rs. {(summary.bestDay?.earnings || 0).toLocaleString()}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.text.muted }]}>
                {t('home.worker.bestDay', 'Best Day')}
              </Text>
            </View>
          </View>

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, { backgroundColor: alpha(colors.worker, 0.1) }]}>
              <Flame size={13} color={colors.worker} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>{summary.streak || 0}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.text.muted }]}>
                {t('home.worker.streak', 'Day Streak')}
              </Text>
            </View>
          </View>

          <View style={styles.summaryItem}>
            <View style={[styles.summaryIcon, {
              backgroundColor: summary.trendPercent >= 0 ? alpha(colors.cyan, 0.1) : alpha(colors.error, 0.1)
            }]}>
              {summary.trendPercent >= 0 ? (
                <TrendingUp size={13} color={colors.cyan} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={13} color={colors.error} strokeWidth={2.5} />
              )}
            </View>
            <View>
              <Text style={[styles.summaryValue, {
                color: summary.trendPercent >= 0 ? colors.success : colors.error
              }]}>
                {summary.trendPercent >= 0 ? '+' : ''}{summary.trendPercent || 0}%
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.text.muted }]}>
                {t('home.worker.vsPrevWeek', 'vs Last Week')}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.12)',
    marginTop: 14,
  },
  cardContent: {
    padding: 16,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  periodTotal: {
    alignItems: 'flex-end',
  },
  periodTotalLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
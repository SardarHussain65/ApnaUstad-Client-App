import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Briefcase,
  MapPin,
  Zap,
  Calendar,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { alpha, Spacing, useTheme, useThemeTypography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { useNearbyJobs, useUserLocation } from '../hooks';

export default function JobsNearbyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const typography = useThemeTypography();
  const colors = theme.legacy;
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
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]} onPress={() => router.back()}>
            <ChevronLeft color={theme.colors.text.primary} size={24} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('jobsNearby.title', 'Nearby Jobs')}</Text>
            <Text style={[styles.headerSub, { color: theme.colors.text.dim }]}>
              {isLoading ? t('jobsNearby.scanning', 'Loading jobs...') : t('jobsNearby.activeOpportunities', { count: jobs.length, defaultValue: `${jobs.length} open jobs` })}
            </Text>
          </View>

          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]} onPress={() => refetch()}>
            <RefreshCw color={theme.colors.text.primary} size={18} />
          </TouchableOpacity>
        </Animated.View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.brand.primary} size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.text.dim }]}>{t('jobsNearby.scanningLocalFrequency', 'Finding open jobs near you...')}</Text>
            </View>
          ) : jobs.length > 0 ? (
            <View style={styles.list}>
              {jobs.map((job, index) => {
                const distanceLabel = (job as any).distanceText || (job as any).signalMeta?.distanceText;
                const amount = Number(job.amount || 0);
                return (
                  <Animated.View
                    key={job._id}
                    entering={FadeInDown.delay(index * 80).duration(450)}
                  >
                    <GlassCard
                      style={styles.jobCard}
                      borderColor={theme.colors.border.subtle}
                      hasGlow={job.urgency === 'instant'}
                      glowColor={job.urgency === 'instant' ? colors.cyan : colors.primary}
                      onPress={() => router.push({
                        pathname: '/bid-submission',
                        params: { jobId: job._id, title: job.category, urgency: job.urgency }
                      })}
                    >
                      <View style={styles.jobRow}>
                        <View style={[styles.typeCluster, { borderRightColor: theme.colors.border.subtle }]}>
                          {job.urgency === 'instant' ? (
                            <Zap size={20} color={colors.cyan} />
                          ) : (
                            <Calendar size={20} color={colors.worker} />
                          )}
                          <Text style={[styles.jobTypeLabel, { color: job.urgency === 'instant' ? colors.cyan : colors.worker }]}>
                            {job.urgency === 'instant' ? t('common.urgent', 'URGENT') : t('common.scheduled', 'SCHEDULED')}
                          </Text>
                        </View>

                        <View style={styles.jobMain}>
                          <View style={styles.jobTitleRow}>
                            <Text style={[styles.jobTitle, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>{job.category}</Text>
                            {amount > 0 && (
                              <View style={[styles.amountPill, { backgroundColor: alpha(colors.success, 0.12), borderColor: alpha(colors.success, 0.25) }]}>
                                <Text style={[styles.amountPillText, { color: colors.success }]}>Rs. {amount.toLocaleString()}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.jobDesc, { color: theme.colors.text.secondary }]} numberOfLines={2}>{job.description}</Text>
                          <View style={styles.jobMeta}>
                            <MapPin size={12} color={theme.colors.text.dim} />
                            <Text style={[styles.metaText, { color: theme.colors.text.dim }]} numberOfLines={1}>{job.address || t('common.nearby', 'Nearby')}</Text>
                            {distanceLabel ? (
                              <>
                                <View style={[styles.dot, { backgroundColor: theme.colors.border.subtle }]} />
                                <Text style={[styles.distanceText, { color: theme.colors.brand.primary }]}>{distanceLabel}</Text>
                              </>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.actionArea}>
                          <ChevronRight size={20} color={theme.colors.text.muted} />
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
                <Briefcase size={48} color={theme.colors.text.dim} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>{t('jobsNearby.noMissionsFound', 'No Open Jobs Nearby')}</Text>
              <Text style={[styles.emptySub, { color: theme.colors.text.dim }]}>
                {t('jobsNearby.emptyDescription', 'Stay online so we can alert you as soon as a client posts a job near you.')}
              </Text>
              <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.colors.brand.primary }]} onPress={() => refetch()}>
                <Text style={[styles.refreshBtnText, { color: theme.colors.button.primaryText }]}>{t('jobsNearby.refreshScan', 'Refresh')}</Text>
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
  jobTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  jobTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  amountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  amountPillText: {
    fontSize: 11,
    fontWeight: '900',
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
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  refreshBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  refreshBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
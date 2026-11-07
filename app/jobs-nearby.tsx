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
import { useTranslation } from 'react-i18next';

import { Spacing, useTheme, useThemeTypography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { useNearbyJobs, useUserLocation, cleanAddressString } from '../hooks';
import { useIncomingJob } from '../context/IncomingJobContext';

const { width } = Dimensions.get('window');

export default function JobsNearbyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const typography = useThemeTypography();
  const colors = theme.legacy;
  const { location } = useUserLocation();
  const { openIncomingJobModal } = useIncomingJob();
  const { data: jobs = [], isLoading, refetch } = useNearbyJobs(location?.longitude, location?.latitude);

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          entering={SlideInDown.duration(400)}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.default }]} onPress={() => router.back()}>
            <ChevronLeft color={theme.colors.text.primary} size={24} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, typography.threeD, { color: theme.colors.text.primary }]}>{t('jobsNearby.title').toUpperCase()}</Text>
            <Text style={[styles.headerSub, { color: theme.colors.text.secondary }]}>
              {isLoading ? t('jobsNearby.scanning') : t('jobsNearby.activeOpportunities', { count: jobs.length })}
            </Text>
          </View>

          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.default }]} onPress={() => refetch()}>
            <Filter color={theme.colors.text.primary} size={20} />
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
              <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>{t('jobsNearby.scanningLocalFrequency')}</Text>
            </View>
          ) : jobs.length > 0 ? (
            <View style={styles.list}>
              {jobs.map((job, index) => (
                <Animated.View
                  key={job._id}
                  entering={FadeInDown.delay(index * 100).duration(600)}
                >
                  <GlassCard
                    style={[styles.jobCard, { borderColor: theme.colors.border.default }]}
                    borderColor={theme.colors.border.default}
                    hasGlow={job.urgency === 'instant'}
                    glowColor={job.urgency === 'instant' ? colors.cyan : colors.primary}
                    onPress={() => {
                      if (job.urgency === 'instant') {
                        openIncomingJobModal(job);
                      } else {
                        router.push({
                          pathname: '/bid-submission',
                          params: { jobId: job._id, title: job.category, urgency: job.urgency }
                        });
                      }
                    }}
                  >
                    <View style={styles.jobRow}>
                      <View style={[styles.typeCluster, { borderRightColor: theme.colors.border.default }]}>
                        {job.urgency === 'instant' ? (
                          <Zap size={22} color={colors.cyan} />
                        ) : (
                          <Calendar size={22} color={colors.worker} />
                        )}
                        <Text style={[styles.jobTypeLabel, { color: job.urgency === 'instant' ? colors.cyan : colors.worker }]}>
                          {job.urgency === 'instant' ? t('jobsNearby.urgentBadge', 'URGENT') : t('jobsNearby.scheduledBadge', 'LATER')}
                        </Text>
                      </View>

                      <View style={styles.jobMain}>
                        <Text style={[styles.jobTitle, typography.threeD, { color: theme.colors.text.primary }]}>{job.category}</Text>
                        <Text style={[styles.jobDesc, { color: theme.colors.text.secondary }]} numberOfLines={2}>{job.description}</Text>
                        <View style={styles.jobMeta}>
                          <MapPin size={13} color={theme.colors.text.muted} />
                          <Text style={[styles.metaText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                            {cleanAddressString(job.address || '') || t('common.nearby')}
                          </Text>
                          <View style={[styles.dot, { backgroundColor: theme.colors.border.default }]} />
                          <Text style={[styles.distanceText, { color: theme.colors.brand.primary }]}>{t('jobsNearby.distanceAway', { defaultValue: '1.2 km away' })}</Text>
                        </View>
                      </View>

                      <View style={styles.actionArea}>
                        <ChevronRight size={20} color={theme.colors.text.secondary} />
                      </View>
                    </View>
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]}>
                <Briefcase size={48} color={theme.colors.text.muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>{t('jobsNearby.noMissionsFound')}</Text>
              <Text style={[styles.emptySub, { color: theme.colors.text.secondary }]}>
                {t('jobsNearby.emptyDescription')}
              </Text>
              <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.colors.brand.primary }]} onPress={() => refetch()}>
                <Text style={[styles.refreshBtnText, { color: theme.colors.button.primaryText }]}>{t('jobsNearby.refreshScan')}</Text>
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  headerSub: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.4,
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
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  list: {
    gap: 16,
  },
  jobCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1.8,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typeCluster: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1.5,
    minWidth: 72,
    gap: 5,
  },
  jobTypeLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  jobMain: {
    flex: 1,
    paddingLeft: 16,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  jobDesc: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  distanceText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionArea: {
    paddingLeft: 10,
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1.8,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 32,
  },
  refreshBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
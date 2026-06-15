import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import Animated, {
  FadeInDown,
  SlideInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Star,
  Briefcase,
  MapPin,
  BadgeCheck,
  Zap,
  Heart,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { alpha, Spacing, useTheme, useThemeColors } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { SkeletonCard } from '../../components/ui';
import { useFavoriteWorkers, type Worker } from '../../hooks';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

interface WorkerCardProps {
  worker: Worker;
  index: number;
  onHire: (worker: Worker) => void;
  onViewDetails: (id: string) => void;
}

const WorkerCard = React.memo(({ worker, index, onHire, onViewDetails }: WorkerCardProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const themeColor = colors.cyan;
  const ratingStr = worker.rating ? worker.rating.toFixed(1) : '5.0';
  const ratingNum = worker.rating ?? 5.0;

  const [imageError, setImageError] = React.useState(false);

  const isValidImage = worker.profileImage && worker.profileImage !== 'null' && worker.profileImage !== 'undefined' && worker.profileImage.trim() !== '';
  const avatarUri = (isValidImage && !imageError)
    ? worker.profileImage
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.fullName || 'W')}&background=0d0d1a&color=fff&size=200&bold=true`;

  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(ratingNum)) return 'full';
    if (i < ratingNum) return 'half';
    return 'empty';
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(500).springify()}
      style={styles.cardWrapper}
    >
      <View style={[styles.cardGlow, { shadowColor: themeColor }]} />

      <View style={[styles.workerCard, { borderColor: theme.colors.border.subtle }]}>
        <LinearGradient
          colors={[alpha(themeColor, 0.15), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardTopGradient}
        />

        <View style={[styles.leftStripe, { backgroundColor: themeColor }]} />

        <TouchableOpacity
          style={styles.cardInner}
          activeOpacity={0.9}
          onPress={() => onViewDetails(worker._id)}
        >
          <View style={styles.topRow}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarRing, { borderColor: alpha(themeColor, 0.4) }]}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  onError={() => setImageError(true)}
                />
              </View>
              <View
                style={[styles.availabilityDot, { backgroundColor: worker.isAvailable ? theme.colors.status.success : theme.colors.status.error, borderColor: theme.colors.surface.card }]}
              />
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={[styles.workerName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {worker.fullName}
                </Text>
                {worker.isVerified && (
                  <BadgeCheck size={16} color={themeColor} fill={alpha(themeColor, 0.2)} />
                )}
                <Heart size={14} color={theme.colors.status.error} fill={theme.colors.status.error} style={{ marginLeft: 'auto' }} />
              </View>

              <View style={styles.metaRow}>
                <View style={[styles.metaChip, { backgroundColor: theme.colors.surface.subtle }]}>
                  <Briefcase size={9} color={themeColor} />
                  <Text style={[styles.metaChipText, { color: themeColor }]}>
                    {worker.category.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.metaChip, { backgroundColor: theme.colors.surface.subtle }]}>
                  <MapPin size={9} color={theme.colors.text.muted} />
                  <Text style={[styles.metaChipText, { color: theme.colors.text.primary }]}>
                    {worker.city ?? t('common.remote', { defaultValue: 'Remote' })}
                  </Text>
                </View>
              </View>

              <View style={styles.starsRow}>
                {stars.map((type, i) => (
                  <Star
                    key={i}
                    size={11}
                    color={theme.colors.brand.accent}
                    fill={type === 'full' ? theme.colors.brand.accent : type === 'half' ? alpha(theme.colors.brand.accent, 0.5) : 'transparent'}
                  />
                ))}
                <Text style={[styles.ratingText, { color: theme.colors.brand.accent }]}>{ratingStr}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statsBar, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
            <View style={styles.statItem}>
              <Star size={12} color={themeColor} />
              <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{(worker.rating ?? 0) > 0 ? worker.rating!.toFixed(1) : '—'}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('profile.rating')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border.subtle }]} />
            <View style={styles.statItem}>
              <Briefcase size={12} color={themeColor} />
              <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{worker.totalJobs ?? 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('workerDetails.jobsLabel')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border.subtle }]} />
            <View style={styles.statItem}>
              <Zap size={12} color={themeColor} />
              <Text style={[styles.statValue, { color: worker.isAvailable ? theme.colors.status.success : theme.colors.status.error }]}>
                {worker.isAvailable ? t('workerList.open') : t('workerList.busy')}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>{t('common.status')}</Text>
            </View>
          </View>

          {!!worker.bio && (
            <Text style={[styles.bioText, { color: theme.colors.text.muted }]} numberOfLines={2}>
              {worker.bio}
            </Text>
          )}

          <TouchableOpacity
            style={styles.deployBtn}
            onPress={() => onHire(worker)}
            activeOpacity={0.78}
          >
            <LinearGradient
              colors={[themeColor, alpha(themeColor, 0.8)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.deployBtnGradient}
            >
              <View style={styles.deployBtnLeft}>
                <Text style={[styles.deployRateLabel, { color: theme.colors.text.muted }]}>{t('workerDetails.ratePerHour')}</Text>
                <Text style={[styles.deployRateValue, { color: theme.colors.text.primary }]}>
                  Rs. {worker.hourlyRate ?? '0'}/hr
                </Text>
              </View>
              <View style={[styles.deployBtnRight, { borderLeftColor: alpha(theme.colors.text.primary, 0.1) }]}>
                <Zap size={14} color={theme.colors.text.primary} fill={theme.colors.text.primary} />
                <Text style={[styles.deployBtnText, { color: theme.colors.text.primary }]}>{t('workerList.hire')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});
WorkerCard.displayName = 'FavoriteWorkerCard';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const colors = useThemeColors();

  const { data: workers = [], isLoading, refetch } = useFavoriteWorkers(user?._id);

  const handleHire = (worker: Worker) => {
    router.push({
      pathname: '/job-creation',
      params: {
        title: worker.category,
        targetWorkerId: worker._id,
        targetWorkerName: worker.fullName,
      },
    });
  };

  const handleViewDetails = (id: string) => {
    router.push({
      pathname: '/worker-details',
      params: { id },
    });
  };

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <View style={[styles.blobTop, { backgroundColor: alpha(colors.cyan, 0.08) }]} />
        <View style={[styles.blobBottom, { backgroundColor: alpha(colors.purple, 0.06) }]} />

        {/* HEADER */}
        <Animated.View
          entering={SlideInDown.duration(450).springify()}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]} onPress={() => router.back()}>
            <ChevronLeft color={theme.colors.text.primary} size={22} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{t('profile.favoritesTitle').toUpperCase()}</Text>
            <Text style={[styles.headerSub, { color: theme.colors.text.muted }]}>
              {isLoading
                ? t('workerList.searchingUstads')
                : t('workerList.availableCount', { count: workers.length })}
            </Text>
          </View>

          <View style={styles.iconBtnPlaceholder} />
        </Animated.View>

        {/* WORKER LIST */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => <SkeletonCard key={i} />)
          ) : workers.length > 0 ? (
            workers.map((worker, idx) => (
              <WorkerCard
                key={worker._id}
                worker={worker}
                index={idx}
                onHire={handleHire}
                onViewDetails={handleViewDetails}
              />
            ))
          ) : (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
                <Heart size={48} color={theme.colors.text.muted} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>{t('profile.noFavorites')}</Text>
              <Text style={[styles.emptySub, { color: theme.colors.text.muted }]}>
                {t('profile.noFavoritesDesc')}
              </Text>
              <TouchableOpacity style={[styles.exploreBtn, { backgroundColor: theme.colors.brand.primary }]} onPress={() => router.replace('/(tabs)')}>
                <Text style={[styles.exploreBtnText, { color: theme.colors.text.inverse }]}>{t('common.getStarted')}</Text>
              </TouchableOpacity>
            </Animated.View>
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
  blobTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 999,
    top: -100,
    right: -80,
    zIndex: 0,
  },
  blobBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    bottom: 40,
    left: -80,
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.m,
    zIndex: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBtnPlaceholder: {
    width: 42,
    height: 42,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
    gap: 16,
  },
  cardWrapper: {
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 0,
  },
  workerCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 0,
  },
  leftStripe: {
    width: 3,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  cardInner: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 2,
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  availabilityDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  nameBlock: {
    flex: 1,
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  deployBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  deployBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  deployBtnLeft: {
    flex: 1,
    paddingLeft: 16,
  },
  deployRateLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deployRateValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  deployBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderLeftWidth: 1,
    height: '100%',
  },
  deployBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 70,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
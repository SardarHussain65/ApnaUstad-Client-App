import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
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

import { Colors, Typography, Spacing } from '../../constants/Theme';
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
  const themeColor = Colors.cyan;
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

      <View style={styles.workerCard}>
        <LinearGradient
          colors={[themeColor + '22', 'transparent']}
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
              <View style={[styles.avatarRing, { borderColor: themeColor + '60' }]}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  onError={() => setImageError(true)}
                />
              </View>
              <View
                style={[
                  styles.availabilityDot,
                  {
                    backgroundColor: worker.isAvailable
                      ? '#00E5A0'
                      : '#FF4C6A',
                    borderColor: '#0a0a1a',
                  },
                ]}
              />
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.workerName} numberOfLines={1}>
                  {worker.fullName}
                </Text>
                {worker.isVerified && (
                  <BadgeCheck size={16} color={themeColor} fill={themeColor + '30'} />
                )}
                <Heart size={14} color="#FF4D8D" fill="#FF4D8D" style={{ marginLeft: 'auto' }} />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Briefcase size={9} color={themeColor} />
                  <Text style={[styles.metaChipText, { color: themeColor }]}>
                    {worker.category.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.metaChip}>
                  <MapPin size={9} color={Colors.textDim} />
                  <Text style={styles.metaChipText}>
                    {worker.city ?? t('common.remote', { defaultValue: 'Remote' })}
                  </Text>
                </View>
              </View>

              <View style={styles.starsRow}>
                {stars.map((type, i) => (
                  <Star
                    key={i}
                    size={11}
                    color="#FFD700"
                    fill={type === 'full' ? '#FFD700' : type === 'half' ? '#FFD70080' : 'transparent'}
                  />
                ))}
                <Text style={styles.ratingText}>{ratingStr}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Star size={12} color={themeColor} />
              <Text style={styles.statValue}>{(worker.rating ?? 0) > 0 ? worker.rating!.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>{t('profile.rating')}</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Briefcase size={12} color={themeColor} />
              <Text style={styles.statValue}>{worker.totalJobs ?? 0}</Text>
              <Text style={styles.statLabel}>{t('workerDetails.jobsLabel')}</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Zap size={12} color={themeColor} />
              <Text style={[styles.statValue, { color: worker.isAvailable ? '#00E5A0' : '#FF4C6A' }]}>
                {worker.isAvailable ? t('workerList.open') : t('workerList.busy')}
              </Text>
              <Text style={styles.statLabel}>{t('common.status')}</Text>
            </View>
          </View>

          {!!worker.bio && (
            <Text style={styles.bioText} numberOfLines={2}>
              {worker.bio}
            </Text>
          )}

          <TouchableOpacity
            style={styles.deployBtn}
            onPress={() => onHire(worker)}
            activeOpacity={0.78}
          >
            <LinearGradient
              colors={[themeColor, themeColor + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.deployBtnGradient}
            >
              <View style={styles.deployBtnLeft}>
                <Text style={styles.deployRateLabel}>{t('workerDetails.ratePerHour')}</Text>
                <Text style={styles.deployRateValue}>
                  Rs. {worker.hourlyRate ?? '0'}/hr
                </Text>
              </View>
              <View style={styles.deployBtnRight}>
                <Zap size={14} color="#000" fill="#000" />
                <Text style={styles.deployBtnText}>{t('workerList.hire')}</Text>
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
        <View style={[styles.blobTop, { backgroundColor: Colors.cyan + '14' }]} />
        <View style={[styles.blobBottom, { backgroundColor: Colors.purple + '10' }]} />

        {/* HEADER */}
        <Animated.View
          entering={SlideInDown.duration(450).springify()}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={22} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('profile.favoritesTitle').toUpperCase()}</Text>
            <Text style={styles.headerSub}>
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
              <View style={styles.emptyIconContainer}>
                <Heart size={48} color={Colors.textDim} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>{t('profile.noFavorites')}</Text>
              <Text style={styles.emptySub}>
                {t('profile.noFavoritesDesc')}
              </Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.exploreBtnText}>{t('common.getStarted')}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    color: '#fff',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textDim,
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    color: '#fff',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textDim,
    letterSpacing: 0.3,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textDim,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bioText: {
    color: Colors.textDim,
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
    color: 'rgba(0,0,0,0.55)',
    letterSpacing: 0.5,
  },
  deployRateValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  deployBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.12)',
    height: '100%',
  },
  deployBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
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
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    color: Colors.textDim,
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
    backgroundColor: Colors.cyan,
  },
  exploreBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

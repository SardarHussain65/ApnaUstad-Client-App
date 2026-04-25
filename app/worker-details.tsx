import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Star, ShieldCheck, MapPin, Share2, Award, Zap, Clock, MessageSquare, Phone } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useWorker } from '../hooks';

const { width } = Dimensions.get('window');
const PROFILE_ORB_SIZE = width * 0.45;

const PORTFOLIO = [
  { id: '1', url: 'https://images.unsplash.com/photo-1581578731548-c64a958b4751?q=80&w=400' },
  { id: '2', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400' },
  { id: '3', url: 'https://images.unsplash.com/photo-1558403194-611308249627?q=80&w=400' },
];

export default function WorkerDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useSharedValue(0);
  const orbRotation = useSharedValue(0);

  // React Query hook
  const { data: worker, isLoading, error } = useWorker(params.id as string);

  React.useEffect(() => {
    // Animate the orbit
    orbRotation.value = withRepeat(
      withTiming(360, { duration: 15000 }),
      -1,
      false
    );
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const orbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${orbRotation.value}deg` },
        { scale: interpolate(scrollY.value, [0, 100], [1, 0.8], Extrapolate.CLAMP) }
      ],
    };
  });

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        {/* Transparent Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Share2 color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
        >
          {/* Profile Section */}
          {isLoading ? (
            <ActivityIndicator color={Colors.cyan} style={{ marginTop: 50 }} />
          ) : (
            <View style={styles.profileHero}>
              <View style={styles.orbContainer}>
                <Animated.View style={[styles.cosmicOrb, orbAnimatedStyle]}>
                  <LinearGradient
                    colors={[Colors.cyan, Colors.primary, Colors.purple]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: worker?.profileImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }}
                    style={styles.avatar}
                  />
                </View>
                {worker?.isVerified && (
                  <Animated.View entering={FadeInDown.delay(300)} style={styles.verifiedBadge}>
                    <ShieldCheck size={14} color="#fff" />
                  </Animated.View>
                )}
              </View>

              <Animated.View entering={FadeInUp.delay(400)} style={styles.nameHeader}>
                <Text style={[styles.workerName, Typography.threeD]}>{worker?.fullName || 'Cosmic Ustad'}</Text>
                <Text style={styles.workerRole}>{worker?.category?.toUpperCase() || 'DIMENSIONAL SPECIALIST'}</Text>

                <View style={styles.ratingRow}>
                  <Star size={16} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.ratingVal}>{worker?.rating?.toFixed(1) || '5.0'}</Text>
                  <Text style={styles.reviewCount}>({worker?.totalReviews || 0} Missions)</Text>
                </View>
              </Animated.View>
            </View>
          )}

          {!isLoading && (
            <View style={styles.contentSection}>
              <View style={styles.statsGrid}>
                <Animated.View entering={FadeInDown.delay(500)} style={styles.statBox}>
                  <GlassCard intensity={20} style={styles.statCard}>
                    <Award size={20} color={Colors.orange} />
                    <Text style={styles.statValue}>{worker?.experience || '1'} Yrs</Text>
                    <Text style={styles.statLabel}>EXP</Text>
                  </GlassCard>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(600)} style={styles.statBox}>
                  <GlassCard intensity={20} style={styles.statCard}>
                    <Zap size={20} color={Colors.cyan} />
                    <Text style={styles.statValue}>100%</Text>
                    <Text style={styles.statLabel}>SUCCESS</Text>
                  </GlassCard>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(700)} style={styles.statBox}>
                  <GlassCard intensity={20} style={styles.statCard}>
                    <Clock size={20} color={Colors.success} />
                    <Text style={styles.statValue}>Rs. {worker?.hourlyRate}</Text>
                    <Text style={styles.statLabel}>RATE/HR</Text>
                  </GlassCard>
                </Animated.View>
              </View>

              {/* About Section */}
              <Animated.View entering={FadeInUp.delay(800)} style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, Typography.threeD]}>Professional Bio</Text>
                <GlassCard intensity={15} style={styles.bioCard}>
                  <Text style={styles.bioText}>
                    {worker?.bio || 'No specialized mission transmission received yet. Professional standards apply.'}
                  </Text>
                </GlassCard>
              </Animated.View>
            </View>
          )}

          {/* Portfolio Section */}
          <Animated.View entering={FadeInUp.delay(900)} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, Typography.threeD]}>Mission Portfolio</Text>
              <TouchableOpacity><Text style={styles.viewMore}>VIEW ALL</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
              {PORTFOLIO.map((item, idx) => (
                <View key={item.id} style={styles.portfolioItemWrap}>
                  <Image source={{ uri: item.url }} style={styles.portfolioImg} />
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.ScrollView>

        {/* Action Footer */}
        <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.footer}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.footerContent}>
            <TouchableOpacity style={styles.msgBtn}>
              <MessageSquare color="#fff" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callBtn}>
              <Phone color="#fff" size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => router.push({
                pathname: '/job-creation',
                params: {
                  title: worker?.category,
                  targetWorkerId: worker?._id,
                  targetWorkerName: worker?.fullName
                }
              })}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookGradient}
              >
                <Text style={styles.bookText}>INITIATE MISSION</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profileHero: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  orbContainer: {
    width: PROFILE_ORB_SIZE,
    height: PROFILE_ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cosmicOrb: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PROFILE_ORB_SIZE / 2,
    opacity: 0.6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarWrapper: {
    width: PROFILE_ORB_SIZE - 20,
    height: PROFILE_ORB_SIZE - 20,
    borderRadius: (PROFILE_ORB_SIZE - 20) / 2,
    backgroundColor: '#000',
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: (PROFILE_ORB_SIZE - 20) / 2,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 15,
    backgroundColor: Colors.success,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  nameHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  workerName: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  workerRole: {
    fontSize: 10,
    color: Colors.cyan,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingVal: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 14,
  },
  reviewCount: {
    color: Colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  contentSection: {
    paddingHorizontal: Spacing.l,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 20,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
  },
  statLabel: {
    color: Colors.textDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '900',
    marginBottom: 15,
  },
  bioCard: {
    padding: 16,
    borderRadius: 20,
  },
  bioText: {
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewMore: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  portfolioScroll: {
    marginLeft: -Spacing.l,
    paddingLeft: Spacing.l,
  },
  portfolioItemWrap: {
    width: width * 0.4,
    height: 120,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  portfolioImg: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    gap: 12,
  },
  msgBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bookBtn: {
    flex: 1,
  },
  bookGradient: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  bookText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

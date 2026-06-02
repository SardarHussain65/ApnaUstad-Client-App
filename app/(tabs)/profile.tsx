import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import {
  BadgeCheck,
  User,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  CircleDollarSign,
  Clock3,
  MapPin,
  Camera,
  Settings,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withSpring,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Colors, Spacing, Shadows, BorderRadius } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMyBookings, useWorkerBookings, useWorker, useUpdateProfileMutation } from '../../hooks';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { getOptimizedImageUrl } from '../../constants/Config';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 240;

// ─── Stats Row ─────────────────────────────────────────────────────────────────
function StatsRow({ jobs, rating, successRate }: { jobs: number; rating: number; successRate: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.statsCard}>
      <LinearGradient colors={['rgba(255,255,255,0.04)', 'transparent']} style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: '#00F5FF' }]}>{jobs}</Text>
        <Text style={styles.statLbl}>Jobs</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: '#FFD60A' }]}>
          {rating > 0 ? rating.toFixed(1) : '—'}
        </Text>
        <Text style={styles.statLbl}>Rating</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: '#34C759' }]}>{successRate}%</Text>
        <Text style={styles.statLbl}>Success</Text>
      </View>
    </Animated.View>
  );
}

// ─── Client Stats Row ──────────────────────────────────────────────────────────
function ClientStatsRow({ total, ongoing, completed }: { total: number; ongoing: number; completed: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.statsCard}>
      <LinearGradient colors={['rgba(255,255,255,0.04)', 'transparent']} style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: '#00F5FF' }]}>{total}</Text>
        <Text style={styles.statLbl}>Bookings</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: '#FF9F0A' }]}>{ongoing}</Text>
        <Text style={styles.statLbl}>Ongoing</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: '#34C759' }]}>{completed}</Text>
        <Text style={styles.statLbl}>Completed</Text>
      </View>
    </Animated.View>
  );
}

// ─── Menu Item ─────────────────────────────────────────────────────────────────
function MenuItem({ icon: Icon, label, sublabel, delay, accent, onPress }: { icon: any; label: string; sublabel?: string; delay: number; accent: string; onPress?: () => void }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()} style={anim}>
      <Pressable style={styles.menuItem} onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}>
        {Platform.OS === 'ios'
          ? <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,12,32,0.85)' }]} />}
        <View style={[styles.menuAccentBar, { backgroundColor: accent }]} />
        <View style={styles.menuLeft}>
          <View style={[styles.menuIconBox, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
            <Icon size={17} color={accent} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>{label}</Text>
            {sublabel ? <Text style={styles.menuSub}>{sublabel}</Text> : null}
          </View>
        </View>
        <ChevronRight size={15} color="rgba(255,255,255,0.2)" />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileTab() {
  const { logout, role, user } = useAuth();
  const router = useRouter();
  const scrollY = useSharedValue(0);

  const isWorker = role === 'worker';
  const clientBookingsQuery = useMyBookings({ enabled: !isWorker });
  const workerBookingsQuery = useWorkerBookings({ enabled: isWorker });
  const bookingsQuery = isWorker ? workerBookingsQuery : clientBookingsQuery;
  const bookings = bookingsQuery.data || [];

  const { data: workerProfile } = useWorker(role === 'worker' ? user?._id : undefined);
  const { mutateAsync: updateProfile } = useUpdateProfileMutation();

  const [verificationStatus, setVerificationStatus] = useState<string>('Verify identity');

  useEffect(() => {
    if (isWorker) {
      api.get('/workers/verification/status')
        .then(res => {
          const details = res.data?.data;
          if (details) {
            if (details.status === 'approved') setVerificationStatus('Verified');
            else if (details.status === 'pending') setVerificationStatus('Pending review');
            else if (details.status === 'rejected') setVerificationStatus('Rejected (Action required)');
          } else if (workerProfile?.isVerified) {
            setVerificationStatus('Verified');
          } else {
            setVerificationStatus('Verify identity');
          }
        })
        .catch(() => {
          setVerificationStatus(workerProfile?.isVerified ? 'Verified' : 'Verify identity');
        });
    }
  }, [isWorker, workerProfile]);

  const stats = React.useMemo(() => {
    const completed = bookings.filter(b => b.status === 'completed').length;
    const jobs = role === 'worker'
      ? Number((workerProfile as any)?.totalJobs || bookings.length)
      : bookings.length;
    return {
      jobs,
      rating: Number(workerProfile?.rating || (user as any)?.rating || 0),
      successRate: jobs > 0 ? Math.round((Math.max(completed, Number((workerProfile as any)?.completedJobs || 0)) / jobs) * 100) : 0,
    };
  }, [bookings, workerProfile, role, user]);

  const skills: string[] = (workerProfile as any)?.skills || [];

  const clientStats = React.useMemo(() => {
    const completed = bookings.filter(b => b.status === 'completed').length;
    const ongoing = bookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status)).length;
    return {
      total: bookings.length,
      ongoing,
      completed,
    };
  }, [bookings]);

  const rawAvatarUri = workerProfile?.profileImage || user?.profileImage;
  const avatarUri = rawAvatarUri
    ? getOptimizedImageUrl(rawAvatarUri, 180, 180)
    : 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300&auto=format&fit=crop';

  const scrollHandler = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT * 0.6], [1, 0], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -HEADER_HEIGHT * 0.4], 'clamp') }],
  }));

  const avatarParallax = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -30], 'clamp') }],
  }));

  const handleLogout = async () => { await logout(); router.replace('/role-selection'); };

  return (
    <BackgroundWrapper>
      {/* Hero gradient */}


      <Animated.ScrollView showsVerticalScrollIndicator={false} onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={styles.scroll}>

        {/* ── Avatar Block ── */}
        <Animated.View style={[styles.avatarSection, avatarParallax]}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraBtn} onPress={() => router.push('/profile/personal-info')}>
              <LinearGradient colors={['#BF5AF2', '#00F5FF']} style={[StyleSheet.absoluteFillObject, { borderRadius: 15 }]} />
              <Camera size={12} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{workerProfile?.fullName || user?.fullName || 'User'}</Text>
              {isWorker && (workerProfile?.isVerified || (workerProfile?.rating ?? 0) >= 4.5) && (
                <BadgeCheck size={20} color="#00F5FF" strokeWidth={2.5} style={{ marginLeft: 5 }} />
              )}
            </View>
            <Text style={styles.userSub}>{workerProfile?.email || user?.email || user?.phone || ''}</Text>

            <View style={styles.badgesRow}>
              <LinearGradient
                colors={isWorker ? ['#FF8C00', '#FF5E00'] : ['#00F5FF', '#007AFF']}
                style={styles.rolePill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.rolePillText}>{isWorker ? '⚡ Elite Ustad' : '💎 Platinum Client'}</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </Animated.View>

        {/* ── Content ── */}
        <View style={styles.card}>

          {/* Stats */}
          {isWorker ? (
            <StatsRow jobs={stats.jobs} rating={stats.rating} successRate={stats.successRate} />
          ) : (
            <ClientStatsRow total={clientStats.total} ongoing={clientStats.ongoing} completed={clientStats.completed} />
          )}

          {/* Worker Details */}
          {isWorker && workerProfile && (
            <Animated.View entering={FadeInDown.delay(420)} style={styles.workerSummary}>

              {/* Key stats: rate · exp · location */}
              <View style={styles.workerMetaRow}>
                {!!workerProfile.hourlyRate && (
                  <View style={styles.workerMetaItem}>
                    <CircleDollarSign size={13} color="#34C759" strokeWidth={2.3} />
                    <Text style={styles.workerMetaText}>Rs. {workerProfile.hourlyRate}/hr</Text>
                  </View>
                )}
                {!!workerProfile.experience && (
                  <View style={styles.workerMetaItem}>
                    <Clock3 size={13} color="#FF9F0A" strokeWidth={2.3} />
                    <Text style={styles.workerMetaText}>{workerProfile.experience} yrs exp</Text>
                  </View>
                )}
                {!!(workerProfile.city || workerProfile.address) && (
                  <View style={styles.workerMetaItem}>
                    <MapPin size={13} color="#BF5AF2" strokeWidth={2.3} />
                    <Text style={styles.workerMetaText} numberOfLines={1}>
                      {workerProfile.city || workerProfile.address}
                    </Text>
                  </View>
                )}
              </View>

              {/* Bio */}
              {!!workerProfile.bio && (
                <Text style={styles.workerBio} numberOfLines={3}>{workerProfile.bio}</Text>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <View style={styles.skillsRow}>
                  {skills.slice(0, 5).map((s, i) => (
                    <View key={i} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* Account */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionLabel}>Account</Text>
            <MenuItem icon={User} label="Personal Information" sublabel="Name, phone & photo" delay={640} accent="#00F5FF" onPress={() => router.push('/profile/personal-info')} />
            {isWorker && (
              <MenuItem
                icon={BadgeCheck}
                label="Identity Verification"
                sublabel={verificationStatus}
                delay={670}
                accent={
                  verificationStatus === 'Verified'
                    ? '#34C759'
                    : verificationStatus === 'Pending review'
                    ? '#FF9F0A'
                    : verificationStatus.includes('Rejected')
                    ? '#FF3B30'
                    : '#00F5FF'
                }
                onPress={() => router.push('/profile/identity-verification')}
              />
            )}
            <MenuItem icon={Shield} label="Security" sublabel="Password & login" delay={700} accent="#BF5AF2" onPress={() => router.push('/profile/security')} />
            <MenuItem icon={Bell} label="Notifications" sublabel="Alerts & preferences" delay={730} accent="#FF9F0A" onPress={() => router.push('/profile/notifications')} />
          </View>

          {/* Support */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionLabel}>Support</Text>
            <MenuItem icon={HelpCircle} label="Help Center" sublabel="FAQs & articles" delay={760} accent="#64D2FF" onPress={() => router.push('/profile/help-center')} />
            <MenuItem icon={Star} label="Rate ApnaUstad" sublabel="Share your feedback" delay={790} accent="#FFD60A" />
            <MenuItem icon={Settings} label="App Settings" delay={820} accent="#8E8E93" />
          </View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(820)}>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={16} color="#FF3B30" strokeWidth={2.3} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          </Animated.View>

          <Text style={styles.version}>ApnaUstad v2.4.0</Text>
        </View>
      </Animated.ScrollView>
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingBottom: 48 },

  // Hero
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,16,0.4)' },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: 52, paddingBottom: 20 },
  avatarWrap: { position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(5,5,16,0.95)', ...Shadows.glow,
  },

  // Name
  nameBlock: { alignItems: 'center', paddingHorizontal: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  userName: {
    fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  userSub: { fontSize: 13, color: 'rgba(255,255,255,0.48)', fontWeight: '500', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rolePill: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, ...Shadows.glow },
  rolePillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },


  // Main card
  card: {
    marginHorizontal: 14, marginTop: 10, borderRadius: 26, overflow: 'hidden',
    backgroundColor: 'rgba(8,10,28,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, ...Shadows.depth,
  },



  // Stats
  statsCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 16,
    marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  statLbl: { color: 'rgba(255,255,255,0.38)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Worker details
  workerSummary: {
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 13, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  workerMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  workerMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  workerMetaText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '600' },
  workerBio: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500', lineHeight: 18, marginBottom: 10 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  skillChip: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,245,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0,245,255,0.07)' },
  skillChipText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' },



  // Section label
  sectionLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },

  // Menu
  menuSection: { marginBottom: 18 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, marginBottom: 8, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 12, paddingVertical: 12, position: 'relative',
  },
  menuAccentBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingLeft: 8 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  menuSub: { color: 'rgba(255,255,255,0.36)', fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
    backgroundColor: 'rgba(255,59,48,0.06)', marginBottom: 20,
  },
  logoutText: { color: '#FF3B30', fontSize: 14, fontWeight: '800' },

  // Version
  version: { textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 11, fontWeight: '600', paddingBottom: 10 },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
  Camera,
  Settings,
  Layers3,
  Heart,
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
import { alpha, Shadows, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMyBookings, useWorkerBookings, useWorker, useUpdateProfileMutation } from '../../hooks';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { getOptimizedImageUrl } from '../../constants/Config';
import { useTranslation } from 'react-i18next';


const HEADER_HEIGHT = 240;

// ─── Stats Row ─────────────────────────────────────────────────────────────────
function StatsRow({ jobs, rating, successRate }: { jobs: number; rating: number; successRate: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  return (
    <Animated.View
      entering={FadeInDown.delay(320).springify()}
      style={[
        styles.statsCard,
        {
          backgroundColor: theme.colors.surface.subtle,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <LinearGradient colors={theme.id === 'current' ? ['rgba(255,255,255,0.04)', 'transparent'] : [alpha(theme.colors.surface.raised, 0.5), 'transparent']} style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: colors.cyan }]}>{jobs}</Text>
        <Text style={[styles.statLbl, { color: theme.colors.text.dim }]}>{t('profile.jobs')}</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: theme.colors.border.subtle }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: colors.yellow }]}>
          {rating > 0 ? rating.toFixed(1) : '—'}
        </Text>
        <Text style={[styles.statLbl, { color: theme.colors.text.dim }]}>{t('profile.rating')}</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: theme.colors.border.subtle }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: colors.success }]}>{successRate}%</Text>
        <Text style={[styles.statLbl, { color: theme.colors.text.dim }]}>{t('profile.success')}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Client Stats Row ──────────────────────────────────────────────────────────
function ClientStatsRow({ total, ongoing, completed }: { total: number; ongoing: number; completed: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  return (
    <Animated.View
      entering={FadeInDown.delay(320).springify()}
      style={[
        styles.statsCard,
        {
          backgroundColor: theme.colors.surface.subtle,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <LinearGradient colors={theme.id === 'current' ? ['rgba(255,255,255,0.04)', 'transparent'] : [alpha(theme.colors.surface.raised, 0.5), 'transparent']} style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: colors.cyan }]}>{total}</Text>
        <Text style={[styles.statLbl, { color: theme.colors.text.dim }]}>{t('profile.bookings')}</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: theme.colors.border.subtle }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: colors.orange }]}>{ongoing}</Text>
        <Text style={[styles.statLbl, { color: theme.colors.text.dim }]}>{t('profile.ongoing')}</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: theme.colors.border.subtle }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statNum, { color: colors.success }]}>{completed}</Text>
        <Text style={[styles.statLbl, { color: theme.colors.text.dim }]}>{t('profile.completed')}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Menu Item ─────────────────────────────────────────────────────────────────
function MenuItem({ icon: Icon, label, sublabel, delay, accent, onPress }: { icon: any; label: string; sublabel?: string; delay: number; accent: string; onPress?: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()} style={anim}>
      <Pressable style={styles.menuItem} onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}>
        {Platform.OS === 'ios'
          ? <BlurView intensity={theme.id === 'current' ? 16 : 8} tint={theme.blurTint} style={StyleSheet.absoluteFill} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface.card }]} />}
        <View style={[styles.menuAccentBar, { backgroundColor: accent }]} />
        <View style={styles.menuLeft}>
          <View style={[styles.menuIconBox, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
            <Icon size={17} color={accent} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.colors.text.primary }]}>{label}</Text>
            {sublabel ? <Text style={[styles.menuSub, { color: theme.colors.text.muted }]}>{sublabel}</Text> : null}
          </View>
        </View>
        <ChevronRight size={15} color={theme.colors.text.dim} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileTab() {
  const { logout, role, user } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const themedTypography = useThemeTypography();
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
            <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: theme.id === 'light' ? '#FFFFFF' : alpha('#FFFFFF', 0.9) }]} />
            <TouchableOpacity style={styles.cameraBtn} onPress={() => router.push('/profile/personal-info')}>
              <LinearGradient colors={theme.colors.gradients.primary} style={[StyleSheet.absoluteFillObject, { borderRadius: 15 }]} />
              <Camera size={12} color={theme.colors.text.onBrand} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.userName,
                  themedTypography.threeD,
                  { color: theme.colors.text.primary },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                ellipsizeMode="tail"
              >
                {workerProfile?.fullName || user?.fullName || 'User'}
              </Text>
              {isWorker && (workerProfile?.isVerified || (workerProfile?.rating ?? 0) >= 4.5) && (
                <BadgeCheck size={20} color={theme.colors.brand.primary} strokeWidth={2.5} style={{ marginLeft: 5, flexShrink: 0 }} />
              )}
            </View>
            <Text style={[styles.userSub, { color: theme.colors.text.muted }]}>{workerProfile?.email || user?.email || user?.phone || ''}</Text>

            <View style={styles.badgesRow}>
              <LinearGradient
                colors={isWorker ? theme.colors.gradients.worker : theme.colors.gradients.primary}
                style={styles.rolePill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[styles.rolePillText, { color: theme.colors.button.primaryText }]}>{isWorker ? t('profile.eliteUstad') : t('profile.platinumClient')}</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </Animated.View>

        {/* ── Content ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
              shadowColor: theme.colors.shadow.color,
              shadowOpacity: theme.colors.shadow.cardOpacity,
            },
          ]}
        >

          {/* Stats */}
          {isWorker ? (
            <StatsRow jobs={stats.jobs} rating={stats.rating} successRate={stats.successRate} />
          ) : (
            <ClientStatsRow total={clientStats.total} ongoing={clientStats.ongoing} completed={clientStats.completed} />
          )}
          {/* Account */}
          <View style={styles.menuSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.dim }]}>{t('profile.account')}</Text>
            <MenuItem icon={User} label={t('profile.personalInfo')} sublabel={t('profile.personalInfoSub')} delay={640} accent="#00F5FF" onPress={() => router.push('/profile/personal-info')} />
            {isWorker && (
              <MenuItem icon={Layers3} label={t('profile.skills')} sublabel={t('profile.skillsSub')} delay={655} accent="#FF8C00" onPress={() => router.push('/profile/specialties' as any)} />
            )}
            {isWorker && (
              <MenuItem
                icon={BadgeCheck}
                label={t('profile.identity')}
                sublabel={verificationStatus === 'Verify identity' ? t('profile.identitySub') : verificationStatus}
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
            <MenuItem icon={Shield} label={t('profile.security')} sublabel={t('profile.securitySub')} delay={700} accent="#BF5AF2" onPress={() => router.push('/profile/security')} />
            <MenuItem icon={Bell} label={t('profile.notifications')} sublabel={t('profile.notificationsSub')} delay={730} accent="#FF9F0A" onPress={() => router.push('/profile/notifications')} />
            {!isWorker && (
              <MenuItem icon={Heart} label={t('profile.favoriteUstads')} sublabel={t('profile.favoriteUstadsSub')} delay={745} accent="#FF4D8D" onPress={() => router.push('/profile/favorites')} />
            )}
          </View>

          {/* Support */}
          <View style={styles.menuSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.dim }]}>{t('profile.support')}</Text>
            <MenuItem icon={HelpCircle} label={t('profile.helpCenter')} sublabel={t('profile.helpCenterSub')} delay={760} accent="#64D2FF" onPress={() => router.push('/profile/help-center')} />
            <MenuItem icon={Star} label={t('profile.rateApp')} sublabel={t('profile.rateAppSub')} delay={790} accent="#FFD60A" />
            <MenuItem icon={Settings} label={t('profile.appSettings')} sublabel={t('profile.appSettingsSub')} delay={820} accent="#8E8E93" onPress={() => router.push('/profile/settings')} />
          </View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(820)}>
            <Pressable style={[styles.logoutBtn, { backgroundColor: alpha(theme.colors.status.error, 0.08), borderColor: alpha(theme.colors.status.error, 0.18) }]} onPress={handleLogout}>
              <LogOut size={16} color="#FF3B30" strokeWidth={2.3} />
              <Text style={[styles.logoutText, { color: theme.colors.status.error }]}>{t('profile.signOut')}</Text>
            </Pressable>
          </Animated.View>

          <Text style={[styles.version, { color: theme.colors.text.dim }]}>{t('profile.version', 'ApnaUstad v2.4.0')}</Text>
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
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: alpha('#000000', 0.3) },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: 52, paddingBottom: 20 },
  avatarWrap: { position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, ...Shadows.glow,
  },

  // Name
  nameBlock: { alignItems: 'center', paddingHorizontal: 24, alignSelf: 'stretch' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, maxWidth: '100%' },
  userName: {
    fontSize: 24, fontWeight: '900', letterSpacing: -0.5,
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
    flexShrink: 1,
  },
  userSub: { fontSize: 13, fontWeight: '500', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rolePill: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, ...Shadows.glow },
  rolePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },


  // Main card
  card: {
    marginHorizontal: 14, marginTop: 10, borderRadius: 26, overflow: 'hidden',
    borderWidth: 1,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, ...Shadows.depth,
  },


  // Stats
  statsCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, paddingVertical: 16,
    marginBottom: 14,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  statLbl: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 1, height: 36 },

  // Section label
  sectionLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },

  // Menu
  menuSection: { marginBottom: 18 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, marginBottom: 8, overflow: 'hidden', borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 12, position: 'relative',
  },
  menuAccentBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingLeft: 8 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuLabel: { fontSize: 14, fontWeight: '700' },
  menuSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    paddingVertical: 14, borderRadius: 16, borderWidth: 1,
    marginBottom: 20,
  },
  logoutText: { fontSize: 14, fontWeight: '800' },

  // Version
  version: { textAlign: 'center', fontSize: 11, fontWeight: '600', paddingBottom: 10 },
});

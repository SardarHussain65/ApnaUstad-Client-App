import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  BadgeCheck,
  User,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Star,
  Camera,
  Settings,
  Layers3,
  Heart,
  Scale,
  Briefcase,
  Wrench,
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
import { alpha, Shadows, useTheme, useThemeColors, useThemeTypography, getAccessibleColor } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMyBookings, useWorkerBookings, useWorker, useUpdateProfileMutation, useCategories, useWorkerSpecialties } from '../../hooks';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { getOptimizedImageUrl } from '../../constants/Config';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


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
function MenuItem({ icon: Icon, label, sublabel, badge, delay, accent, onPress }: { icon: any; label: string; sublabel?: string; badge?: string; delay: number; accent: string; onPress?: () => void }) {
  const theme = useTheme();
  const isRTL = useIsRTL();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const accessibleAccent = getAccessibleColor(accent, theme.isDark);
  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()} style={anim}>
      <Pressable
        style={styles.menuItem}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      >
        {Platform.OS === 'ios'
          ? <BlurView intensity={theme.id === 'current' ? 16 : 8} tint={theme.blurTint} style={StyleSheet.absoluteFill} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface.card }]} />}
        <View style={[styles.menuAccentBar, { backgroundColor: accessibleAccent }]} />
        <View style={styles.menuLeft}>
          <View style={[styles.menuIconBox, { backgroundColor: `${accessibleAccent}18`, borderColor: `${accessibleAccent}30` }]}>
            <Icon size={17} color={accessibleAccent} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.colors.text.primary }]}>{label}</Text>
            {sublabel ? <Text style={[styles.menuSub, { color: theme.colors.text.muted }]} numberOfLines={1}>{sublabel}</Text> : null}
          </View>
        </View>
        {badge ? (
          <View style={[styles.menuBadgePill, { backgroundColor: `${accessibleAccent}18`, borderColor: `${accessibleAccent}35` }]}>
            <Text style={[styles.menuBadgeText, { color: accessibleAccent }]}>{badge}</Text>
          </View>
        ) : null}
        {isRTL ? (
          <ChevronLeft size={15} color={theme.colors.text.dim} />
        ) : (
          <ChevronRight size={15} color={theme.colors.text.dim} />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileTab() {
  const { logout, role, user } = useAuth();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const theme = useTheme();
  const themedTypography = useThemeTypography();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const isWorker = role === 'worker';
  const clientBookingsQuery = useMyBookings({ enabled: !isWorker });
  const workerBookingsQuery = useWorkerBookings({ enabled: isWorker });
  const bookingsQuery = isWorker ? workerBookingsQuery : clientBookingsQuery;
  const bookings = bookingsQuery.data || [];

  const { data: workerProfile } = useWorker(role === 'worker' ? user?._id : undefined);
  const { data: specialtiesData } = useWorkerSpecialties(isWorker);
  const { data: allCategories = [] } = useCategories();
  const { mutateAsync: updateProfile } = useUpdateProfileMutation();

  const workerServices = React.useMemo(() => {
    if (!isWorker) return [];
    const list: { name: string; isPrimary: boolean; status?: string; isActive?: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Primary category from workerProfile or user
    const primary = (workerProfile?.category || (user as any)?.category || '').trim();
    if (primary) {
      list.push({ name: primary, isPrimary: true, isActive: true, status: 'approved' });
      seen.add(primary.toLowerCase());
    }

    // 2. Additional specialties
    const rawSpecialties = specialtiesData?.specialties || (workerProfile as any)?.specialties || (user as any)?.specialties || [];
    if (Array.isArray(rawSpecialties)) {
      for (const s of rawSpecialties) {
        let name = '';
        if (s.categoryId && typeof s.categoryId === 'object' && s.categoryId.name) {
          name = String(s.categoryId.name).trim();
        } else if (typeof s.categoryId === 'string' && s.categoryId) {
          const found = (allCategories as any[]).find((c: any) => c._id === s.categoryId);
          name = found?.name ? found.name.trim() : (!s.categoryId.match(/^[0-9a-fA-F]{24}$/) ? s.categoryId.trim() : '');
        }

        if (!name) continue;
        const lower = name.toLowerCase();
        if (seen.has(lower)) continue;

        seen.add(lower);
        list.push({
          name,
          isPrimary: s.priority === 1 && list.length === 0,
          status: s.approvalStatus,
          isActive: s.isActive !== false,
        });
      }
    }

    return list;
  }, [isWorker, workerProfile, user, specialtiesData, allCategories]);

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

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handlePressLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setShowLogoutModal(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <BackgroundWrapper>
      {/* Hero gradient */}


      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 110 },
        ]}
      >

        {/* ── Avatar Block ── */}
        <Animated.View style={[styles.avatarSection, avatarParallax]}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: avatarUri }}
              style={[
                styles.avatar,
                { borderColor: theme.isDark ? alpha('#FFFFFF', 0.9) : '#0F172A' },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.cameraBtn,
                { borderColor: theme.isDark ? '#000000' : '#0F172A' },
              ]}
              onPress={() => router.push('/profile/personal-info')}
            >
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
                <BadgeCheck size={20} color={theme.colors.brand.primary} strokeWidth={2.5} style={{ marginHorizontal: 5, flexShrink: 0 }} />
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

            {isWorker && workerServices.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(220).springify()}
                style={styles.servicesRow}
              >
                {workerServices.map((svc, idx) => {
                  const isPrimary = svc.isPrimary;
                  const chipAccent = isPrimary
                    ? theme.colors.brand.primary
                    : (theme.colors.brand.secondary || '#FF8C00');
                  const chipAccessible = getAccessibleColor(chipAccent, theme.isDark);
                  return (
                    <TouchableOpacity
                      key={svc.name + idx}
                      activeOpacity={0.75}
                      style={[
                        styles.serviceChip,
                        {
                          backgroundColor: alpha(chipAccessible, theme.isDark ? 0.12 : 0.08),
                          borderColor: alpha(chipAccessible, theme.isDark ? 0.35 : 0.25),
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/profile/specialties' as any);
                      }}
                    >
                      {isPrimary ? (
                        <Briefcase size={11} color={chipAccessible} strokeWidth={2.5} />
                      ) : (
                        <Wrench size={10} color={chipAccessible} strokeWidth={2.2} />
                      )}
                      <Text style={[styles.serviceChipText, { color: chipAccessible }]}>
                        {svc.name}
                      </Text>
                      {svc.status === 'pending' && (
                        <View style={[styles.serviceDot, { backgroundColor: theme.colors.status.warning }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            )}
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
              <MenuItem
                icon={Layers3}
                label={t('profile.skills')}
                sublabel={
                  workerServices.length > 0
                    ? workerServices.map((s) => s.name).join(' · ')
                    : t('profile.skillsSub')
                }
                badge={workerServices.length > 0 ? `${workerServices.length} ${workerServices.length === 1 ? 'Trade' : 'Trades'}` : undefined}
                delay={655}
                accent="#FF8C00"
                onPress={() => router.push('/profile/specialties' as any)}
              />
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
            <MenuItem icon={Scale} label={t('disputes.myTitle', 'My complaints')} sublabel={t('disputes.mySubtitle', 'Track issues you reported on bookings')} delay={775} accent="#FF6B6B" onPress={() => router.push('/profile/my-disputes' as any)} />
            <MenuItem icon={Star} label={t('profile.rateApp')} sublabel={t('profile.rateAppSub')} delay={790} accent="#FFD60A" />
            <MenuItem icon={Settings} label={t('profile.appSettings')} sublabel={t('profile.appSettingsSub')} delay={820} accent="#8E8E93" onPress={() => router.push('/profile/settings')} />
          </View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(820)}>
            <Pressable
              style={[
                styles.logoutBtn,
                {
                  backgroundColor: alpha(theme.colors.status.error, 0.08),
                  borderColor: alpha(theme.colors.status.error, 0.18),
                },
              ]}
              onPress={handlePressLogout}
            >
              <LogOut size={16} color="#FF3B30" strokeWidth={2.3} />
              <Text style={[styles.logoutText, { color: theme.colors.status.error }]}>{t('profile.signOut')}</Text>
            </Pressable>
          </Animated.View>

          <Text style={[styles.version, { color: theme.colors.text.dim }]}>{t('profile.version', 'ApnaUstad v2.4.0')}</Text>
        </View>
      </Animated.ScrollView>

      {/* ── Logout Confirmation Modal ── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !isLoggingOut && setShowLogoutModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            {/* Warning Ring */}
            <View
              style={[
                styles.modalIconRing,
                {
                  backgroundColor: alpha('#EF4444', 0.12),
                  borderColor: alpha('#EF4444', 0.25),
                },
              ]}
            >
              <LogOut size={28} color="#EF4444" strokeWidth={2.4} />
            </View>

            {/* Title & Description */}
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              {t('profile.logoutConfirmTitle', 'Log Out?')}
            </Text>
            <Text style={[styles.modalDesc, { color: theme.colors.text.muted }]}>
              {t('profile.logoutConfirmDesc', 'Are you sure you want to log out of your account?')}
            </Text>

            {/* Actions: Stacked for clean fit across all languages & device sizes */}
            <View style={styles.modalActionsCol}>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isLoggingOut && { opacity: 0.7 }]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <LogOut size={16} color="#FFFFFF" strokeWidth={2.3} style={{ marginEnd: 8 }} />
                    <Text style={styles.modalConfirmBtnText} numberOfLines={1}>
                      {t('profile.logoutConfirmYes', 'Yes, Log Out')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.colors.surface.subtle,
                    borderColor: theme.colors.border.subtle,
                  },
                ]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {t('profile.logoutConfirmCancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },

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
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  serviceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 1,
  },
  menuBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },


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
  menuAccentBar: { position: 'absolute', start: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingStart: 8 },
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
  version: { textAlign: 'center', fontSize: 11, fontWeight: '600', paddingBottom: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActionsCol: {
    width: '100%',
    gap: 10,
  },
  modalConfirmBtn: {
    width: '100%',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalCancelBtn: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

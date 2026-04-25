import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Platform, ActivityIndicator } from 'react-native';
import {
  User,
  Settings,
  CreditCard,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  Zap,
  CheckCircle2,
  Edit2
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { GlassCard } from '../../components/home/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useBookings, useWorker } from '../../hooks';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';

const { width, height } = Dimensions.get('window');

export default function ProfileTab() {
  const { logout, role, user } = useAuth();
  const router = useRouter();
  const scrollY = useSharedValue(0);

  // React Query hooks
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: workerProfile, isLoading: workerLoading } = useWorker(
    role === 'worker' ? user?._id : undefined
  );

  const isLoading = bookingsLoading || workerLoading;

  // Compute stats from fetched data
  const stats = React.useMemo(() => ({
    jobs: bookings.length,
    rating: role === 'worker'
      ? (workerProfile?.rating || (user as any)?.rating || 0)
      : ((user as any)?.rating || 0)
  }), [bookings, workerProfile, role, user]);

  const handleLogout = async () => {
    await logout();
    router.replace('/role-selection');
  };

  const headerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(scrollY.value, [-100, 0], [40, 0], 'clamp') },
        { scale: interpolate(scrollY.value, [-100, 0], [1.2, 1], 'clamp') },
      ],
    };
  });

  return (
    <BackgroundWrapper>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Professional Organic Curved Header */}
        <Animated.View style={[styles.headerBg, headerStyle]}>
          <LinearGradient
            colors={[Colors.primary, Colors.secondary, 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          {/* <View style={styles.svgContainer}>
            <Svg height="100" width={width} viewBox={`0 0 ${width} 100`} style={styles.svgCurve}>
              <Path
                d={`M0 0 Q${width / 2} 120 ${width} 0`}
                fill={Colors.secondary}
                opacity={0.3}
              />
              <Path
                d={`M0 0 Q${width / 2} 80 ${width} 0`}
                fill={Colors.primary}
              />
            </Svg>
          </View> */}
        </Animated.View>

        {/* Profile Content */}
        <View style={styles.mainContent}>
          <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={[Colors.primary, Colors.secondary]}
                style={styles.avatarGlow}
              />
              <Image
                source={{ uri: workerProfile?.profileImage || user?.profileImage || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200&auto=format&fit=crop' }}
                style={styles.avatar}
              />
              <TouchableOpacity style={styles.editBtn}>
                <Edit2 size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.userName, Typography.threeD]}>{workerProfile?.fullName || user?.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{workerProfile?.email || workerProfile?.phone || user?.email || 'No contact'}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: role === 'worker' ? Colors.orange : Colors.primary }]}>
                <Text style={styles.badgeText}>{role === 'worker' ? 'ELITE USTAD' : 'PLATINUM CLIENT'}</Text>
              </View>
            </View>
          </Animated.View>

          {/* 3D Stats Row */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, Typography.threeD]}>{stats.jobs}</Text>
              <Text style={styles.statLabel}>Jobs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, Typography.threeD]}>{stats.rating?.toFixed(1) || '0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, Typography.threeD]}>{workerProfile?.category || role === 'worker' ? 'Worker' : 'Client'}</Text>
              <Text style={styles.statLabel}>Category</Text>
            </View>
          </Animated.View>

          {/* Worker Details Card */}
          {role === 'worker' && workerProfile && (
            <Animated.View entering={FadeInUp.delay(450)} style={styles.workerDetailsCard}>
              <GlassCard intensity={20} style={{ padding: Spacing.l, borderRadius: 20 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hourly Rate</Text>
                  <Text style={[styles.detailValue, Typography.threeD]}>Rs. {workerProfile?.hourlyRate || '0'}</Text>
                </View>
                <View style={[styles.detailRow, { marginTop: 12 }]}>
                  <Text style={styles.detailLabel}>Experience</Text>
                  <Text style={[styles.detailValue, Typography.threeD]}>{workerProfile?.experience || '0'} years</Text>
                </View>
                <View style={[styles.detailRow, { marginTop: 12 }]}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: workerProfile?.isAvailable ? Colors.success : '#ff9500' }, Typography.threeD]}>
                    {workerProfile?.isAvailable ? '🟢 Available' : '🔴 Offline'}
                  </Text>
                </View>
                {workerProfile?.bio && (
                  <View style={[styles.detailRow, { marginTop: 12 }]}>
                    <Text style={styles.bioLabel}>Bio</Text>
                    <Text style={styles.bioText}>{workerProfile.bio}</Text>
                  </View>
                )}
              </GlassCard>
            </Animated.View>
          )}

          {/* Settings Menu with Compact Vibrant Cards */}
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>Account Settings</Text>
            <MenuItem
              icon={User}
              label="Personal Information"
              delay={500}
              gradient={['#00F5FF30', '#00F5FF10']}
              onPress={() => router.push('/profile/personal-info')}
            />
            <MenuItem
              icon={Shield}
              label="Security & Privacy"
              delay={600}
              gradient={['#BF5AF230', '#BF5AF210']}
              onPress={() => router.push('/profile/security')}
            />
            <MenuItem
              icon={CreditCard}
              label="Payment Methods"
              delay={700}
              gradient={['#32D74B30', '#32D74B10']}
              onPress={() => router.push('/profile/payment-methods')}
            />
            <MenuItem
              icon={Bell}
              label="Notifications"
              delay={800}
              gradient={['#FF9F0A30', '#FF9F0A10']}
              onPress={() => router.push('/profile/notifications')}
            />
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>Support</Text>
            <MenuItem
              icon={HelpCircle}
              label="Help Center"
              delay={900}
              gradient={['#64D2FF20', '#64D2FF05']}
              onPress={() => router.push('/profile/help-center')}
            />
            <MenuItem icon={Star} label="Rate ApnaUstad" delay={1000} gradient={['#FFD60A20', '#FFD60A05']} />
          </View>

          <Animated.View entering={FadeInDown.delay(1100)}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color={Colors.error} />
              <Text style={styles.logoutText}>Log Out Account</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.versionText}>Version 2.4.0 (Alpha Build)</Text>
        </View>
      </Animated.ScrollView>
    </BackgroundWrapper>
  );
}

function MenuItem({ icon: Icon, label, delay, gradient, onPress }: { icon: any, label: string, delay: number, gradient?: [string, string, ...string[]], onPress?: () => void }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      true
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.6, 1, 0.6]),
    transform: [{ scale: interpolate(shimmer.value, [0, 0.5, 1], [0.95, 1.05, 0.95]) }],
  }));

  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()}>
      <GlassCard
        style={styles.menuItem}
        onPress={onPress}
        gradient={gradient}
        padding={Spacing.m}
        intensity={20}
        hasGlow
        glowColor="rgba(255,255,255,0.05)"
      >
        <View style={styles.menuRow}>
          <View style={styles.menuPrefix}>
            <Animated.View style={[styles.iconBox, iconStyle]}>
              <Icon size={18} color={gradient ? 'rgba(255,255,255,0.9)' : Colors.primary} strokeWidth={2.5} />
            </Animated.View>
            <Text style={[styles.menuLabel, Typography.threeD]}>{label}</Text>
          </View>
          <ChevronRight size={18} color={Colors.textDim} />
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100,
  },
  headerBg: {
    height: 320,
    width: width,
    position: 'absolute',
    top: 0,
  },
  svgContainer: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 60,
    transform: [{ rotate: '180deg' }],
  },
  svgCurve: {
    position: 'absolute',
    bottom: 0,
  },
  mainContent: {
    marginTop: 140,
    paddingHorizontal: Spacing.l,
    backgroundColor: 'transparent',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    padding: 2,
    marginBottom: 16,
    ...Shadows.depth,
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 60,
    opacity: 0.5,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    ...Shadows.glow,
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    ...Shadows.glow,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: Spacing.xl,
    ...Shadows.depth,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  menuSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.m,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8, // Reduced from 12
    marginBottom: 8, // Reduced from 10
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  menuPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Reduced from 16
  },
  iconBox: {
    width: 36, // Reduced from 44
    height: 36, // Reduced from 44
    borderRadius: 10, // Adjusted
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    color: '#fff',
    fontSize: 14, // Reduced from 16
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    marginTop: Spacing.m,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: Spacing.xl,
    fontWeight: '600',
  },
  workerDetailsCard: {
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  bioLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  bioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  }
});

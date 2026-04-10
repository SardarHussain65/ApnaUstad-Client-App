import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Shadows } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Clock, Calendar, Shield, Zap, X, MoreHorizontal, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 100;
const TICKET_TOP_OFFSET = 120; // Replaces dynamic image height

export default function JobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 50],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        
        {/* Floating Blur Header overlay */}
        <Animated.View style={[styles.solidHeader, { height: HEADER_HEIGHT + insets.top, paddingTop: insets.top + 10 }, headerAnimatedStyle]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.solidHeaderContent}>
            <Text style={[styles.solidHeaderTitle, Typography.threeD]}>Deep Cleaning</Text>
          </View>
        </Animated.View>

        <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {/* Content ScrollView */}
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: TICKET_TOP_OFFSET, paddingBottom: 160 }}
        >
        <Animated.View entering={FadeInUp.delay(300).duration(800)} style={styles.sheetContainer}>
          <GlassCard intensity={40} style={styles.mainSheet}>
            <View style={styles.handleBar} />

            {/* Mission Critical Titles */}
            <View style={styles.titleSection}>
              <View style={styles.badgeContainer}>
                <View style={[styles.pulseDot, { backgroundColor: Colors.cyan }]} />
                <Text style={styles.badgeText}>VERIFIED MISSION</Text>
              </View>
              <Text style={[styles.jobTitle, Typography.threeD]}>Deep Home Cleaning</Text>
              <Text style={styles.jobPrice}>Rs. 4,500 <Text style={styles.jobPriceDec}>.00</Text></Text>
            </View>

            {/* Quick Details Cards */}
            <View style={styles.quickDetailsGrid}>
              <GlassCard intensity={20} style={styles.quickDetailBox}>
                <Clock size={20} color={Colors.cyan} />
                <View style={styles.qdTextGroup}>
                  <Text style={styles.qdLabel}>TIME</Text>
                  <Text style={styles.qdValue}>02:30 PM</Text>
                </View>
              </GlassCard>
              <GlassCard intensity={20} style={styles.quickDetailBox}>
                <Calendar size={20} color={Colors.orange} />
                <View style={styles.qdTextGroup}>
                  <Text style={styles.qdLabel}>DATE</Text>
                  <Text style={styles.qdValue}>Oct 24, 2024</Text>
                </View>
              </GlassCard>
            </View>

            {/* Location Section */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, Typography.threeD]}>Sector Location</Text>
              <GlassCard intensity={15} style={styles.locationCard}>
                <View style={styles.locationIconWrapper}>
                  <MapPin color={Colors.primary} size={22} />
                </View>
                <View style={styles.locationTextGroup}>
                  <Text style={styles.locationPrimary}>Sector 4, Phase 2</Text>
                  <Text style={styles.locationSecondary}>124 Cosmic Avenue, Alpha Block</Text>
                </View>
              </GlassCard>
            </View>

            {/* Client Profile Snippet */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, Typography.threeD]}>Target Client</Text>
              <GlassCard intensity={15} style={styles.clientCard}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' }}
                  style={styles.clientAvatar}
                />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>Sarah Jenkins</Text>
                  <View style={styles.clientSub}>
                    <Shield size={12} color={Colors.success} />
                    <Text style={styles.clientTrusted}>Identity Verified</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.messageBtn}>
                  <MessageSquare size={18} color="#fff" />
                </TouchableOpacity>
              </GlassCard>
            </View>

            {/* Description Fragment */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, Typography.threeD]}>Mission Briefing</Text>
              <Text style={styles.descriptionText}>
                Complete deep cleaning required for a 3-bedroom orbital apartment. Please bring specific anti-gravity dusters. High priority on the main living area. Standard protocols apply.
              </Text>
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.ScrollView>

      {/* Action Footer */}
      <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.footerDock}>
        <BlurView intensity={80} tint="dark" style={[StyleSheet.absoluteFillObject, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={styles.footerContent}>
          <TouchableOpacity style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn}>
            <LinearGradient
              colors={['#1E90FF', '#FF1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptGradient}
            >
              <Zap size={20} color="#fff" fill="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.acceptText}>Accept Mission</Text>
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
    backgroundColor: 'transparent',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    zIndex: 10,
  },
  solidHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidHeaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  solidHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sheetContainer: {
    paddingHorizontal: Spacing.m,
  },
  mainSheet: {
    borderRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,144,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(30,144,255,0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  jobTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 36,
  },
  jobPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.orange,
  },
  jobPriceDec: {
    fontSize: 16,
    color: 'rgba(255,140,0,0.6)',
  },
  quickDetailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  quickDetailBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qdTextGroup: {
    marginLeft: 12,
  },
  qdLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  qdValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionBlock: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.m,
    marginLeft: 4,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
  },
  locationIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(100,210,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextGroup: {
    marginLeft: 16,
    flex: 1,
  },
  locationPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  locationSecondary: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
  },
  clientAvatar: {
    width: 48,
    height: 60,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
  clientInfo: {
    marginLeft: 14,
    flex: 1,
  },
  clientName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  clientSub: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientTrusted: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  messageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  footerDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 30, // account for safe area
  },
  footerContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.l,
    paddingTop: 20,
    gap: 16,
  },
  cancelBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1,
  },
  acceptGradient: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  }
});


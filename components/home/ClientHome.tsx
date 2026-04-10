import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import {
  Zap,
  Droplets,
  Wind,
  Hammer,
  Paintbrush,
  Wrench,
  ShieldCheck,
  Star,
  ChevronRight,
  Sparkles
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../../constants/Theme';
import { HomeHeader } from './HomeHeader';
import { GlassCard } from './GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { CosmicCircle } from './CosmicCircle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../common/BackgroundWrapper';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', title: 'Electrical', icon: Zap, gradient: ['#FFD700', '#FF8C00'] as [string, string, ...string[]] },
  { id: '2', title: 'Plumbing', icon: Droplets, gradient: ['#00BFFF', '#1E90FF'] as [string, string, ...string[]] },
  { id: '3', title: 'AC Repair', icon: Wind, gradient: ['#00FA9A', '#3CB371'] as [string, string, ...string[]] },
  { id: '4', title: 'Carpentry', icon: Hammer, gradient: ['#DEB887', '#8B4513'] as [string, string, ...string[]] },
  { id: '5', title: 'Painting', icon: Paintbrush, gradient: ['#FF69B4', '#C71585'] as [string, string, ...string[]] },
  { id: '6', title: 'Mechanic', icon: Wrench, gradient: ['#A9A9A9', '#696969'] as [string, string, ...string[]] },
];

export function ClientHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <BackgroundWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      >
        <HomeHeader />


        {/* Categories Grid - Optimized */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>Meta-Services</Text>
            <TouchableOpacity><Text style={styles.viewAll}>VIEW ALL</Text></TouchableOpacity>
          </View>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat, index) => (
              <Animated.View
                key={cat.id}
                entering={FadeInDown.delay(400 + index * 100).duration(800)}
                style={styles.categoryWrap}
              >
                <GlassCard
                  style={styles.categoryItem}
                  onPress={() => router.push({
                    pathname: '/category-details',
                    params: { 
                      id: cat.id, 
                      title: cat.title, 
                      color: cat.gradient[0] 
                    }
                  })}
                  gradient={cat.gradient}
                >
                  <View style={styles.categoryIconBox}>
                    <cat.icon size={20} color="#fff" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                </GlassCard>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Compact Cosmic Dashboard Header */}
        <Animated.View entering={FadeInDown.delay(200).duration(1000)} style={styles.dashboardSection}>
          <GlassCard intensity={50} glowColor={Colors.cyan} style={styles.dashboardCard}>
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={[styles.dashboardTitle, Typography.threeD]}>COSMIC INSIGHTS</Text>
                <Text style={styles.dashboardSub}>YOUR TRUST DIMENSION</Text>
              </View>
              <TouchableOpacity style={styles.expandBtn}>
                <Text style={styles.expandText}>EXPAND GALAXY</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dashboardContent}>
              <CosmicCircle
                value={0.871}
                label="87.1%"
                subLabel="TRUST SCORE"
                size={160}
              />
              <View style={styles.insightStats}>
                <View style={styles.statChip}>
                  <Text style={styles.statVal}>12</Text>
                  <Text style={styles.statLab}>ORBITS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statChip}>
                  <Text style={styles.statVal}>4.9</Text>
                  <Text style={styles.statLab}>STARS</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>


        {/* Elite Talent Card with Depth */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, Typography.threeD, { marginBottom: 20, paddingHorizontal: Spacing.l }]}>Elite Talents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {[1, 2].map((_, i) => (
              <Animated.View
                key={i}
                entering={FadeInRight.delay(800 + i * 200)}
                style={styles.talentCardWrap}
              >
                <GlassCard
                  style={styles.talentCard}
                  hasGlow
                  onPress={() => router.push('/worker-details')}
                  glowColor={i === 0 ? Colors.primary : Colors.secondary}
                  gradient={i === 0 ? ['#051937', '#004d7a'] as [string, string, ...string[]] : ['#2d0e3e', '#4b0082'] as [string, string, ...string[]]}
                >
                  <View style={styles.talentHeader}>
                    <View>
                      <Text style={[styles.talentName, Typography.threeD]}>Ahmed Malik</Text>
                      <Text style={styles.talentRole}>Quantum Mechanic</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Star size={12} fill="#FFD700" color="#FFD700" />
                      <Text style={styles.ratingText}>4.9/5</Text>
                    </View>
                  </View>

                  <View style={styles.talentFooter}>
                    <Text style={[styles.talentPrice, Typography.threeD]}>Rs. 1,200<Text style={styles.priceUnit}>/hr</Text></Text>
                    <View style={styles.eliteBadge}>
                      <ShieldCheck size={14} color={Colors.primary} />
                      <Text style={styles.eliteText}>Elite</Text>
                    </View>
                  </View>
                </GlassCard>
                <View style={{ height: 60 }} />

              </Animated.View>
            ))}

          </ScrollView>

        </View>

      </ScrollView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  dashboardSection: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.m,
  },
  dashboardCard: {
    padding: 20,
    borderRadius: 30,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  dashboardSub: {
    fontSize: 10,
    color: Colors.cyan,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  expandBtn: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  expandText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
  },
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightStats: {
    flex: 1,
    marginLeft: 20,
    gap: 15,
  },
  statChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '50%',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  statLab: {
    fontSize: 9,
    color: Colors.textDim,
    fontWeight: '800',
    letterSpacing: 1,
  },
  section: {
    marginVertical: Spacing.xl, // Reduced from xxl
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginBottom: Spacing.l, // Reduced from xl
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  viewAll: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: Spacing.l,
  },
  categoryWrap: {
    width: (width - (Spacing.l * 2) - 20) / 3,
  },
  categoryItem: {
    height: 100, // Reduced from 110
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconBox: {
    width: 40, // Reduced from 48
    height: 40, // Reduced from 48
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Shadows.depth,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  horizontalScroll: {
    paddingLeft: Spacing.l,
  },
  talentCardWrap: {
    marginRight: 16,
    width: width * 0.75,
  },
  talentCard: {
    padding: 20,
    height: 160,
  },
  talentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  talentName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  talentRole: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
  },
  talentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  talentPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
  priceUnit: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '600',
  },
  eliteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  eliteText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  }
});

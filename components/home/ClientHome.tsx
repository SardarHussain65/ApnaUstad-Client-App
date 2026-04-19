import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
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
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useCategories, useMyBookings } from '../../hooks';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../../constants/Theme';
import { getIconForCategory } from '../../constants/IconRegistry';
import { HomeHeader } from './HomeHeader';
import { SearchBar } from './SearchBar';
import { GlassCard } from './GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { CosmicCircle } from './CosmicCircle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../common/BackgroundWrapper';

const { width } = Dimensions.get('window');

const DEFAULT_GRADIENT = ['#6366f1', '#a855f7'] as [string, string, ...string[]];

export function ClientHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAllServices, setShowAllServices] = React.useState(false);

  // React Query hooks
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError, refetch: refetchBookings } = useMyBookings();

  const isLoading = categoriesLoading || bookingsLoading;

  // Filter categories based on search query
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    
    const query = searchQuery.toLowerCase();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Display limited or all categories
  const displayedCategories = React.useMemo(() => {
    if (searchQuery.trim() || showAllServices) {
      return filteredCategories;
    }
    return filteredCategories.slice(0, 9); // Show only first 9 (3 rows x 3 columns)
  }, [filteredCategories, showAllServices, searchQuery]);

  // Compute stats from bookings
  const stats = React.useMemo(() => ({
    jobs: bookings.length,
    rating: 4.8 // Mock rating since User model doesn't have it yet
  }), [bookings]);

  return (
    <BackgroundWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      >
        <HomeHeader />

        {/* Error States */}
        {categoriesError && (
          <View style={styles.errorContainer}>
            <View style={styles.errorContent}>
              <AlertCircle size={20} color="#FF6B6B" />
              <Text style={styles.errorText}>Failed to load services</Text>
            </View>
          </View>
        )}

        {bookingsError && (
          <View style={[styles.errorContainer, styles.errorWithAction]}>
            <View style={styles.errorContent}>
              <AlertCircle size={20} color="#FF6B6B" />
              <View style={styles.errorTextWrap}>
                <Text style={styles.errorText}>Failed to load bookings</Text>
                <Text style={styles.errorSubtext}>Check your connection and try again</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.retryBtn}
              onPress={() => refetchBookings()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}


        {/* Categories Grid - Optimized */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>Meta-Services</Text>
            {!searchQuery && categories.length > 9 && (
              <TouchableOpacity onPress={() => setShowAllServices(!showAllServices)}>
                <Text style={styles.viewAll}>{showAllServices ? 'SHOW LESS' : 'VIEW ALL'}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search Bar */}
          <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services..."
            variant="section"
          />

          <View style={styles.categoriesGrid}>
            {displayedCategories.map((cat, index) => {
              const Icon = getIconForCategory(cat);
              const gradient = cat.color ? [cat.color, cat.color + '40'] as [string, string, ...string[]] : DEFAULT_GRADIENT;
              
              return (
                <Animated.View
                  key={cat._id}
                  entering={FadeInDown.delay(400 + index * 100).duration(800)}
                  style={styles.categoryWrap}
                >
                  <GlassCard
                    style={styles.categoryItem}
                    onPress={() => router.push({
                      pathname: '/category-details',
                      params: { 
                        id: cat._id, 
                        title: cat.name, 
                        color: cat.color || '#fff',
                        description: cat.description
                      }
                    })}
                    gradient={gradient}
                  >
                    <View style={styles.categoryIconBox}>
                      <Icon size={22} color="#fff" strokeWidth={2} />
                    </View>
                    <Text style={styles.categoryTitle} numberOfLines={2}>{cat.name}</Text>
                  </GlassCard>
                </Animated.View>
              );
            })}
            {displayedCategories.length === 0 && !isLoading && (
               <Text style={styles.emptyText}>{searchQuery ? 'No services found' : 'No categories found'}</Text>
            )}
          </View>
        </View>

        {/* Cosmic Insights Dashboard */}
        <Animated.View entering={FadeInDown.delay(200).duration(1000)} style={styles.dashboardSection}>
          <GlassCard intensity={50} glowColor={Colors.cyan} style={styles.dashboardCard}>
            {/* Header with title and button */}
            <View style={styles.dashboardTop}>
              <View style={styles.dashboardTitleBox}>
                <Text style={[styles.dashboardTitle, Typography.threeD]}>COSMIC</Text>
                <Text style={[styles.dashboardTitle, Typography.threeD]}>INSIGHTS</Text>
                <Text style={styles.dashboardSub}>Trust Dimension</Text>
              </View>
              <TouchableOpacity style={styles.expandBtn}>
                <Text style={styles.expandText}>Expand</Text>
              </TouchableOpacity>
            </View>

            {/* Content - Circle and Stats */}
            <View style={styles.dashboardContent}>
              <CosmicCircle
                value={0.871}
                label="87.1%"
                subLabel="TRUST SCORE"
                size={170}
              />
              
              <View style={styles.insightStats}>
                <View style={styles.statChip}>
                  <Text style={styles.statVal}>{stats.jobs}</Text>
                  <Text style={styles.statLab}>Orbits</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statVal}>{stats.rating}</Text>
                  <Text style={styles.statLab}>Stars</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>


        {/* Elite Talent Card with Depth */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, Typography.threeD, { marginBottom: 20, paddingHorizontal: Spacing.l }]}>Elite Talents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {/* Placeholder message - waiting for public workers endpoint */}
            <Text style={[styles.emptyText, { marginLeft: 20, marginTop: 20 }]}>
              Awaiting public workers endpoint...
            </Text>
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
    marginTop: Spacing.xl,
    marginBottom: Spacing.m,
  },
  dashboardCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 28,
  },
  dashboardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  dashboardTitleBox: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    lineHeight: 24,
  },
  dashboardSub: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  expandBtn: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    flexShrink: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  expandText: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  dashboardContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  insightStats: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 0.5,
  },
  statLab: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 6,
    textTransform: 'capitalize',
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
    height: 120,
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.s,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Shadows.depth,
  },
  categoryTitle: {
    fontSize: 10,
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
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: Spacing.l,
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
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: Spacing.l,
    marginVertical: Spacing.m,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  errorWithAction: {
    justifyContent: 'space-between',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '700',
  },
  errorSubtext: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
    marginTop: 4,
  },
  retryBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

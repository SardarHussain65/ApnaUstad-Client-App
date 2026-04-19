import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Shadows } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import Animated, { 
  FadeInDown, 
  FadeInRight,
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
import { ChevronLeft, Zap, Star, ShieldCheck, Clock, MapPin, Search, Filter, Sparkles, Activity } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useWorkersByCategory, useToast } from '../hooks';
import { SkeletonCard } from '../components/ui';

const { width } = Dimensions.get('window');

// Data will be fetched from API

const QUICK_MISSIONS = [
  { id: '1', title: 'Power Restoration', price: '2,500', time: '15 min', icon: Zap, description: 'Emergency power failure. Circuit breaker keeps tripping. Need urgent restoration of essential electrical grid.' },
  { id: '2', title: 'System Diagnostics', price: '1,200', time: '10 min', icon: Search, description: 'Intermittent power flickering across the dwelling. Need a specialist to run diagnostic scans on the main panel.' },
  { id: '3', title: 'Circuit Upgrade', price: '4,500', time: '45 min', icon: Activity, description: 'Upgrading the internal power grid to support high-intensity cosmic appliances. Standard protocol upgrade required.' },
];

export default function CategoryDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useSharedValue(0);
  const { error: showError } = useToast();

  // React Query hook - fetch workers by category
  const { data: workers = [], isLoading, error } = useWorkersByCategory(
    params.title as string
  );

  // Show error toast if fetching failed
  React.useEffect(() => {
    if (error) {
      showError('Failed to load', 'Could not fetch workers for this category');
    }
  }, [error, showError]);

  // Dynamic Theme Base Color
  const themeColor = (params.color as string) || Colors.cyan;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 60], [0, 1], Extrapolate.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [0, 60], [-10, 0], Extrapolate.CLAMP) }
      ]
    };
  });

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        
        {/* Floating Solid Header (Appears on scroll) */}
        <Animated.View style={[styles.solidHeader, { height: 90 + insets.top, paddingTop: insets.top }, headerAnimatedStyle]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.solidHeaderContent}>
            <Text style={[styles.solidHeaderTitle, Typography.threeD]}>{params.title || 'Service Hub'}</Text>
          </View>
        </Animated.View>

        {/* Static Transparent Header Overlay */}
        <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
             <TouchableOpacity style={styles.iconBtn}>
                <Search color="#fff" size={20} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.iconBtn, { marginLeft: 10 }]}>
                <Filter color="#fff" size={20} />
             </TouchableOpacity>
          </View>
        </View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: 100 }}
        >
          {/* Dimension Hero Section */}
          <View style={styles.heroSection}>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.orbWrapper}>
               <View style={[styles.glowingOrb, { shadowColor: themeColor, borderColor: themeColor + '60' }]}>
                 <Sparkles color={themeColor} size={40} />
               </View>
            </Animated.View>
            
            <Animated.View entering={FadeInDown.delay(400)} style={styles.heroText}>
              <Text style={[styles.categoryTitle, Typography.threeD]}>{params.title || 'Energy Flow'}</Text>
              <Text style={styles.categorySub}>ACTIVE MISSION DIMENSION</Text>
              {params.description && (
                <Text style={styles.categoryDescription}>{params.description}</Text>
              )}
            </Animated.View>

            {/* Analytics Dashboard */}
            <Animated.View entering={FadeInUp.delay(500)} style={styles.analyticsSection}>
              <GlassCard intensity={20} style={styles.analyticsCard}>
                 <View style={styles.anaItem}>
                    <Activity color={Colors.success} size={18} />
                    <Text style={styles.anaVal}>{workers.length}</Text>
                    <Text style={styles.anaLab}>ACTIVE PROS</Text>
                 </View>
                 <View style={styles.anaDivider} />
                 <View style={styles.anaItem}>
                    <Clock color={Colors.orange} size={18} />
                    <Text style={styles.anaVal}>12m</Text>
                    <Text style={styles.anaLab}>AVG ARRIVAL</Text>
                 </View>
                 <View style={styles.anaDivider} />
                 <View style={styles.anaItem}>
                    <Star color="#FFD700" size={18} />
                    <Text style={styles.anaVal}>4.8</Text>
                    <Text style={styles.anaLab}>HUB RATING</Text>
                 </View>
              </GlassCard>
            </Animated.View>
          </View>

          {/* Quick Mission Accelerators */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>Mission Accelerators</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
               {QUICK_MISSIONS.map((task, idx) => (
                 <Animated.View key={task.id} entering={FadeInRight.delay(600 + idx * 100)}>
                    <GlassCard 
                        intensity={30} 
                        style={styles.taskCard}
                        onPress={() => router.push({
                          pathname: '/job-creation',
                          params: { 
                            title: params.title as string, 
                            color: themeColor,
                            initialDescription: (task as any).description 
                          }
                        })}
                      >
                       <View style={[styles.taskIconBox, { backgroundColor: themeColor + '20' }]}>
                          <task.icon color={themeColor} size={22} />
                       </View>
                       <Text style={styles.taskTitle}>{task.title}</Text>
                       <View style={styles.taskFooter}>
                          <Text style={styles.taskPrice}>Rs. {task.price}</Text>
                          <View style={styles.timeTag}>
                             <Clock size={10} color={Colors.textDim} />
                             <Text style={styles.timeText}>{task.time}</Text>
                          </View>
                       </View>
                    </GlassCard>
                 </Animated.View>
               ))}
            </ScrollView>
          </View>

          {/* Local Sector Specialists */}
          <View style={[styles.section, { paddingHorizontal: Spacing.l }]}>
            <View style={styles.sectionHeader}>
               <Text style={[styles.sectionTitle, Typography.threeD]}>Sector Specialists</Text>
               <TouchableOpacity><Text style={styles.viewAll}>VIEW ALL</Text></TouchableOpacity>
            </View>
            
            {isLoading ? (
              <View style={{ gap: Spacing.m }}>
                {Array(3).fill(0).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : (
              <>
                {workers.map((pro, idx) => (
                  <Animated.View key={pro._id} entering={FadeInDown.delay(800 + idx * 100)}>
                    <GlassCard 
                      intensity={15} 
                      style={styles.proCard} 
                      onPress={() => router.push({
                        pathname: '/worker-details',
                        params: { id: pro._id }
                      })}
                    >
                       <Image 
                         source={{ uri: pro.profileImage || `https://images.unsplash.com/photo-${1542909168 + idx}-82c3e7fdca5c?q=80&w=150` }} 
                         style={styles.proAvatar} 
                       />
                       <View style={styles.proInfo}>
                          <Text style={styles.proName}>{pro.fullName}</Text>
                          <View style={styles.proStats}>
                             <View style={styles.proBadge}>
                                <Star size={10} color="#FFD700" fill="#FFD700" />
                                <Text style={styles.proRating}>{pro.rating?.toFixed(1) || '5.0'}</Text>
                             </View>
                             <Text style={styles.proJobs}>{pro.totalJobs || 0} Successes</Text>
                          </View>
                       </View>
                       <View style={styles.proAction}>
                          <Text style={styles.proPrice}>Rs. {pro.hourlyRate}</Text>
                          <View style={[styles.onlineDot, { backgroundColor: pro.isAvailable ? Colors.success : Colors.error }]} />
                       </View>
                    </GlassCard>
                  </Animated.View>
                ))}
                {workers.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No specialists detected in this sector yet.</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </Animated.ScrollView>

        {/* Floating Custom Mission Button */}
        <Animated.View entering={FadeInUp.delay(1000)} style={[styles.floatingAction, { bottom: insets.bottom + 20 }]}>
           <TouchableOpacity 
             style={[styles.customBtn, { shadowColor: themeColor }]}
             onPress={() => router.push({
               pathname: '/job-creation',
               params: { title: params.title, color: themeColor }
             })}
           >
              <LinearGradient
                colors={[themeColor, Colors.card]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.customBtnGradient}
              >
                <Zap size={20} color="#fff" fill="#fff" />
                <Text style={styles.customBtnText}>START CUSTOM MISSION</Text>
              </LinearGradient>
           </TouchableOpacity>
        </Animated.View>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    zIndex: 100,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerRight: {
    flexDirection: 'row',
  },
  solidHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    justifyContent: 'center',
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
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    marginBottom: 40,
  },
  orbWrapper: {
    marginTop: 20,
    marginBottom: 24,
  },
  glowingOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  heroText: {
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 34,
    color: '#fff',
    fontWeight: '900',
  },
  categorySub: {
    fontSize: 10,
    color: Colors.textDim,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 8,
  },
  categoryDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  analyticsSection: {
    marginTop: 30,
    width: '100%',
    paddingHorizontal: Spacing.l,
  },
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  anaItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 80,
  },
  anaVal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 0,
    letterSpacing: 0.5,
  },
  anaLab: {
    color: Colors.textDim,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  anaDivider: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '900',
    marginBottom: 20,
    paddingHorizontal: Spacing.l,
  },
  horizontalScroll: {
    paddingLeft: Spacing.l,
  },
  taskCard: {
    width: width * 0.45,
    padding: 16,
    marginRight: 16,
    borderRadius: 24,
  },
  taskIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 16,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskPrice: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '900',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewAll: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '800',
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    marginBottom: 12,
  },
  proAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  proInfo: {
    flex: 1,
    marginLeft: 15,
  },
  proName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  proStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proRating: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
  },
  proJobs: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: '700',
  },
  proAction: {
    alignItems: 'flex-end',
    gap: 8,
  },
  proPrice: {
    color: Colors.cyan,
    fontSize: 14,
    fontWeight: '900',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  floatingAction: {
    position: 'absolute',
    left: Spacing.l,
    right: Spacing.l,
    alignItems: 'center',
    zIndex: 110,
  },
  customBtn: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  customBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  customBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyContainer: {
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: Spacing.l,
  }
});

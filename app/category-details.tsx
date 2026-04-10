import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Image } from 'react-native';
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

const { width } = Dimensions.get('window');

const SPECIALISTS = [
  { id: '1', name: 'Zeeshan Khan', rating: '4.8', jobs: '210', price: '1,500', avatar: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?q=80&w=150' },
  { id: '2', name: 'Maria Sharapova', rating: '4.9', jobs: '156', price: '1,800', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150' },
  { id: '3', name: 'Hamza Malik', rating: '4.7', jobs: '98', price: '1,200', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150' },
];

const QUICK_MISSIONS = [
  { id: '1', title: 'Power Restoration', price: '2,500', time: '15 min', icon: Zap },
  { id: '2', title: 'System Diagnostics', price: '1,200', time: '10 min', icon: Search },
  { id: '3', title: 'Circuit Upgrade', price: '4,500', time: '45 min', icon: Activity },
];

export default function CategoryDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useSharedValue(0);

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
            </Animated.View>

            {/* Analytics Dashboard */}
            <Animated.View entering={FadeInUp.delay(500)} style={styles.analyticsSection}>
              <GlassCard intensity={20} style={styles.analyticsCard}>
                 <View style={styles.anaItem}>
                    <Activity color={Colors.success} size={18} />
                    <Text style={styles.anaVal}>14</Text>
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
                    <GlassCard intensity={30} style={styles.taskCard}>
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
            
            {SPECIALISTS.map((pro, idx) => (
              <Animated.View key={pro.id} entering={FadeInDown.delay(800 + idx * 100)}>
                <GlassCard intensity={15} style={styles.proCard} onPress={() => router.push('/worker-details')}>
                   <Image source={{ uri: pro.avatar }} style={styles.proAvatar} />
                   <View style={styles.proInfo}>
                      <Text style={styles.proName}>{pro.name}</Text>
                      <View style={styles.proStats}>
                         <View style={styles.proBadge}>
                            <Star size={10} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.proRating}>{pro.rating}</Text>
                         </View>
                         <Text style={styles.proJobs}>{pro.jobs} Successes</Text>
                      </View>
                   </View>
                   <View style={styles.proAction}>
                      <Text style={styles.proPrice}>Rs. {pro.price}</Text>
                      <View style={[styles.onlineDot, { backgroundColor: Colors.success }]} />
                   </View>
                </GlassCard>
              </Animated.View>
            ))}
          </View>
        </Animated.ScrollView>
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
  analyticsSection: {
    marginTop: 30,
    width: '100%',
  },
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 24,
  },
  anaItem: {
    flex: 1,
    alignItems: 'center',
  },
  anaVal: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
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
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  }
});

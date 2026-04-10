import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  Star,
  Activity,
  Zap
} from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows } from '../../constants/Theme';
import { HomeHeader } from './HomeHeader';
import { GlassCard } from './GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { CosmicCircle } from './CosmicCircle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../common/BackgroundWrapper';

const AGENDA = [
  { id: '1', customer: 'Sarah Khan', service: 'Deep Cleaning', time: '10:00 AM', status: 'Upcoming', dist: '2.4 km', gradient: ['#FF8C00', '#FF4500'] as [string, string, ...string[]] },
  { id: '2', customer: 'John Doe', service: 'AC Maintenance', time: '02:30 PM', status: 'Scheduled', dist: '4.1 km', gradient: ['#1E90FF', '#0000FF'] as [string, string, ...string[]] },
  { id: '3', customer: 'Alice Wong', service: 'Plumbing Fix', time: '05:00 PM', status: 'Requested', dist: '1.2 km', gradient: ['#32CD32', '#006400'] as [string, string, ...string[]] },
];

export function WorkerHome() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const insets = useSafeAreaInsets();

  return (
    <BackgroundWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      >
        <HomeHeader />

        {/* System Status Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(1000)} style={styles.dashboardSection}>
          <GlassCard hasGlow intensity={30} glowColor={isOnline ? Colors.success : Colors.error} style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: isOnline ? Colors.success : Colors.error }]} />
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.dashboardTitle, Typography.threeD]} numberOfLines={1} adjustsFontSizeToFit>{isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</Text>
                  <Text style={styles.dashboardSub} numberOfLines={1} adjustsFontSizeToFit>VISIBLE TO ALL CLIENTS</Text>
                </View>
              </View>
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: 'rgba(255,255,255,0.05)', true: Colors.success + '40' }}
                thumbColor={isOnline ? Colors.success : '#fff'}
              />
            </View>
          </GlassCard>

          {/* Compact Mission Dashboard Header */}
          <GlassCard intensity={30} style={styles.dashboardCard}>

            <View style={styles.dashboardContent}>
              <CosmicCircle
                value={0.72}
                label="Rs. 4,250"
                subLabel="DAILY REVENUE"
                size={160}
              />
              <View style={styles.miniStatsContainer}>
                <View style={[styles.miniStatRow, { backgroundColor: 'rgba(255, 20, 147, 0.3)' }]}>
                  <Activity size={18} color={Colors.cyan} />
                  <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>98% <Text style={styles.miniStatLab}>SUCCESS</Text></Text>
                </View>
                <View style={[styles.miniStatRow, { backgroundColor: 'rgba(0, 122, 255, 0.3)' }]}>
                  <Star size={18} color="#ffd700" />
                  <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>4.9 <Text style={styles.miniStatLab}>RATING</Text></Text>
                </View>
                <View style={[styles.miniStatRow, { backgroundColor: 'rgba(255, 215, 0, 0.3)' }]}>
                  <Zap size={18} color="#BF5AF2" />
                  <Text style={[styles.miniStatVal, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>12 <Text style={styles.miniStatLab}>MISSIONS</Text></Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Agenda Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, Typography.threeD]}>Launch Agenda</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Full Schedule</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.agendaList}>
            {AGENDA.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(500 + index * 100).duration(600)}
              >
                <GlassCard
                  style={styles.jobCard}
                  hasGlow={index === 0}
                  glowColor={Colors.orange}
                  gradient={item.gradient}
                >
                  <View style={styles.jobRow}>
                    <View style={styles.timeCluster}>
                      <Text style={[styles.jobTime, Typography.threeD]}>{item.time.split(' ')[0]}</Text>
                      <Text style={styles.jobPeriod}>{item.time.split(' ')[1]}</Text>
                    </View>

                    <View style={styles.jobMain}>
                      <Text style={[styles.jobCustomer, Typography.threeD]}>{item.customer}</Text>
                      <Text style={styles.jobService}>{item.service}</Text>
                      <View style={styles.jobMeta}>
                        <MapPin size={12} color="#fff" opacity={0.7} />
                        <Text style={styles.metaText}>{item.dist}</Text>
                        <View style={styles.dot} />
                        <Text style={[styles.statusText, { color: '#fff' }]}>{item.status}</Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.actionBtn}>
                      <ChevronRight size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
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
  statusCard: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardCard: {
    padding: 10,
    borderRadius: 30,
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  },
  dashboardSub: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  miniStatsContainer: {
    flex: 1,
    marginLeft: 16, // reduced from 24 to give more space
    gap: 12,
  },
  miniStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 20, 147, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  miniStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  miniStatLab: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  section: {
    paddingHorizontal: Spacing.l,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.l,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  seeAll: {
    color: Colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  agendaList: {
    gap: 12,
  },
  jobCard: {
    padding: 0,
    overflow: 'hidden',
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  timeCluster: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    minWidth: 60,
  },
  jobTime: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  jobPeriod: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
  },
  jobMain: {
    flex: 1,
    paddingLeft: 16,
  },
  jobCustomer: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  jobService: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionBtn: {
    padding: 8,
  },
});

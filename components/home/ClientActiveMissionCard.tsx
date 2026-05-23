import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Briefcase, Calendar, ChevronRight, Clock, MapPin, Radio, Sparkles } from 'lucide-react-native';
import { JobPost } from '../../hooks';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Theme';
import { GlassCard } from './GlassCard';

interface ClientActiveMissionCardProps {
  job: JobPost;
  index: number;
  onPress: (job: JobPost) => void;
}

export const ClientActiveMissionCard = React.memo(function ClientActiveMissionCard({
  job,
  index,
  onPress,
}: ClientActiveMissionCardProps) {
  const bidCount = (job as any).bidCount || 0;
  
  const missionTime = useMemo(() => {
    if (job.urgency === 'instant') return 'Immediate Response';
    const dateLabel = job.scheduledDate
      ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Today';
    return job.scheduledTime ? `${dateLabel} at ${job.scheduledTime}` : dateLabel;
  }, [job]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(500)}>
      <GlassCard
        style={styles.card}
        contentStyle={styles.cardContent}
        padding={0}
        intensity={40}
        hasGlow
        glowColor={bidCount > 0 ? Colors.cyan : Colors.primary}
      >
        <LinearGradient
          colors={bidCount > 0 
            ? ['rgba(0,245,255,0.12)', 'rgba(5,8,20,0.4)', 'rgba(255,255,255,0.02)'] 
            : ['rgba(99,102,241,0.12)', 'rgba(5,8,20,0.4)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topRow}>
          <View style={[styles.statusPill, { 
            borderColor: (bidCount > 0 ? Colors.cyan : Colors.primary) + '44', 
            backgroundColor: (bidCount > 0 ? Colors.cyan : Colors.primary) + '15' 
          }]}>
            <Radio size={12} color={bidCount > 0 ? Colors.cyan : Colors.primary} />
            <Text style={[styles.statusText, { color: bidCount > 0 ? Colors.cyan : Colors.primary }]}>
              {job.status === 'reviewing' ? 'REVIEWING' : 'BROADCASTING'}
            </Text>
          </View>
          
          <View style={[styles.bidBadge, { 
            backgroundColor: bidCount > 0 ? 'rgba(0,255,127,0.12)' : 'rgba(255,255,255,0.05)',
            borderColor: bidCount > 0 ? 'rgba(0,255,127,0.25)' : 'rgba(255,255,255,0.1)'
          }]}>
            {bidCount > 0 ? <Sparkles size={12} color={Colors.green} /> : <Clock size={12} color="rgba(255,255,255,0.4)" />}
            <Text style={[styles.bidText, { color: bidCount > 0 ? Colors.green : 'rgba(255,255,255,0.5)' }]}>
              {bidCount} {bidCount === 1 ? 'BID' : 'BIDS'}
            </Text>
          </View>
        </View>

        <View style={styles.contentBody}>
          <View style={styles.iconHalo}>
            <Briefcase size={22} color={bidCount > 0 ? Colors.cyan : Colors.primary} />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.category, Typography.threeD]} numberOfLines={1}>
              {job.category}
            </Text>
            <Text style={styles.description} numberOfLines={1}>
              {job.description}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={13} color="rgba(255,255,255,0.4)" />
            <Text style={styles.metaText}>{missionTime}</Text>
          </View>
          <View style={[styles.metaItem, { flex: 1 }]}>
            <MapPin size={13} color="rgba(255,255,255,0.4)" />
            <Text style={styles.metaText} numberOfLines={1}>{job.address}</Text>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.8} 
          style={styles.actionButton} 
          onPress={() => onPress(job)}
        >
          <LinearGradient
            colors={bidCount > 0 ? [Colors.cyan, '#00d2ff'] : [Colors.primary, '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionText}>
              {bidCount > 0 ? 'VIEW MARKET PROPOSALS' : 'VIEW MISSION INTEL'}
            </Text>
            <ChevronRight size={18} color="#000" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </GlassCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    marginBottom: 16,
    marginHorizontal: Spacing.l,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  bidText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  contentBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  iconHalo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
  },
  category: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actionText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { GlassCard } from './GlassCard';
import { Colors, Typography } from '../../constants/Theme';
import { Zap, Calendar } from 'lucide-react-native';

interface WorkerStatusCardProps {
  isInstantOnline: boolean;
  onToggleInstant: (val: boolean) => void;
  isScheduledOnline: boolean;
  onToggleScheduled: (val: boolean) => void;
}

export const WorkerStatusCard = React.memo(({ 
  isInstantOnline, 
  onToggleInstant, 
  isScheduledOnline, 
  onToggleScheduled 
}: WorkerStatusCardProps) => {
  return (
    <View style={styles.container}>
      <GlassCard 
        hasGlow 
        intensity={30} 
        glowColor={isInstantOnline ? Colors.cyan : Colors.error} 
        style={styles.halfCard}
      >
        <View style={styles.cardHeader}>
          <Zap size={18} color={isInstantOnline ? Colors.cyan : '#fff'} />
          <Switch
            value={isInstantOnline}
            onValueChange={onToggleInstant}
            trackColor={{ false: 'rgba(255,255,255,0.05)', true: Colors.cyan + '40' }}
            thumbColor={isInstantOnline ? Colors.cyan : '#fff'}
            style={styles.miniSwitch}
          />
        </View>
        <Text style={[styles.statusTitle, Typography.threeD]}>INSTANT</Text>
        <Text style={styles.statusSub}>REAL-TIME</Text>
      </GlassCard>

      <GlassCard 
        hasGlow 
        intensity={30} 
        glowColor={isScheduledOnline ? Colors.worker : Colors.error} 
        style={styles.halfCard}
      >
        <View style={styles.cardHeader}>
          <Calendar size={18} color={isScheduledOnline ? Colors.worker : '#fff'} />
          <Switch
            value={isScheduledOnline}
            onValueChange={onToggleScheduled}
            trackColor={{ false: 'rgba(255,255,255,0.05)', true: Colors.worker + '40' }}
            thumbColor={isScheduledOnline ? Colors.worker : '#fff'}
            style={styles.miniSwitch}
          />
        </View>
        <Text style={[styles.statusTitle, Typography.threeD]}>SCHEDULED</Text>
        <Text style={styles.statusSub}>PLANNED</Text>
      </GlassCard>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfCard: {
    flex: 1,
    padding: 12,
    borderRadius: 24,
    minHeight: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  statusSub: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  miniSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  }
});

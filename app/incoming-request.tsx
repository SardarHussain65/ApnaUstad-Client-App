import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, X, MapPin, Clock, Banknote, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { AnimatedButton } from '../components/AnimatedButton';
import api from '../services/api';

const { height } = Dimensions.get('window');

export default function IncomingRequestScreen() {
  const router = useRouter();
  const { jobId, title, description, urgency, address } = useLocalSearchParams<any>();

  const handleAccept = async () => {
    try {
      if (urgency === 'instant') {
        const response = await api.post(`/jobs/${jobId}/accept-instant`);
        router.replace({
          pathname: '/transaction-details',
          params: { id: response.data.data._id }
        });
      } else {
        router.replace({
          pathname: '/bid-submission',
          params: { jobId, title, urgency }
        });
      }
    } catch (error) {
       console.error('Error accepting request:', error);
       router.back();
    }
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <Animated.View entering={SlideInUp.duration(1000)} style={styles.modalContent}>
          <GlassCard style={styles.card} hasGlow glowColor={Colors.cyan}>
            <View style={styles.badgeRow}>
               <View style={styles.urgentBadge}>
                  <Zap size={14} color="#fff" />
                  <Text style={styles.urgentText}>NEW MISSION DETECTED</Text>
               </View>
               <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                  <X color={Colors.textMuted} size={20} />
               </TouchableOpacity>
            </View>

            <View style={styles.mainInfo}>
               <Text style={[styles.jobTitle, Typography.threeD]}>{title}</Text>
               <Text style={styles.jobDesc} numberOfLines={3}>{description}</Text>
               
               <View style={styles.locationBox}>
                  <MapPin size={16} color={Colors.cyan} />
                  <Text style={styles.locationText} numberOfLines={1}>{address || 'Nearby Location'}</Text>
               </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
               <View style={styles.stat}>
                  <Clock size={16} color={Colors.textDim} />
                  <Text style={styles.statVal}>{urgency === 'instant' ? 'IMMEDIATE' : 'SCHEDULED'}</Text>
               </View>
               <View style={styles.statDivider} />
               <View style={styles.stat}>
                  <ShieldCheck size={16} color={Colors.textDim} />
                  <Text style={styles.statVal}>VERIFIED</Text>
               </View>
            </View>

            <View style={styles.footer}>
               <AnimatedButton 
                 title={urgency === 'instant' ? "ACCEPT & DISPATCH" : "SUBMIT PROPOSAL"} 
                 variant={urgency === 'instant' ? 'cyan' : 'orange'}
                 onPress={handleAccept}
                 style={styles.actionBtn}
               />
               <TouchableOpacity style={styles.ignoreBtn} onPress={() => router.back()}>
                  <Text style={styles.ignoreText}>IGNORE MISSION</Text>
               </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
  },
  card: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  urgentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainInfo: {
    gap: 12,
  },
  jobTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  jobDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    fontWeight: '600',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statVal: {
    color: Colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  footer: {
    gap: 15,
  },
  actionBtn: {
    height: 60,
  },
  ignoreBtn: {
    alignItems: 'center',
    padding: 10,
  },
  ignoreText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  }
});

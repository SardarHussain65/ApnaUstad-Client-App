import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Shield, Star, MapPin } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  useSharedValue,
  interpolate,
  FadeIn
} from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { socketService } from '../services/socketService';

const { width } = Dimensions.get('window');

export default function FindingWorkerScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [status, setStatus] = useState('SCANNING LOCAL DIMENSIONS...');
  
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Animations
    pulse.value = withRepeat(withTiming(1.2, { duration: 1500 }), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);

    // Socket Listeners
    const unsubscribe = socketService.on('job:assigned', (data) => {
      console.log('✅ Job Assigned:', data);
      setStatus('USTAD SECURED. INITIATING DEPLOYMENT...');
      
      // Redirect to booking details after a brief delay for UX
      setTimeout(() => {
        router.replace({
          pathname: '/transaction-details',
          params: { id: data.booking._id }
        });
      }, 1500);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.2], [0.6, 0.1]),
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.animationContainer}>
            <Animated.View style={[styles.pulseRing, ringStyle]} />
            <Animated.View style={[styles.pulseRing, ringStyle, { delay: 500 } as any]} />
            
            <Animated.View style={[styles.orbitContainer, orbitStyle]}>
               <View style={styles.orbitNode} />
            </Animated.View>

            <View style={styles.centerNode}>
               <Shield color={Colors.cyan} size={32} />
            </View>
          </View>

          <Animated.View entering={FadeIn.delay(500)} style={styles.textStack}>
            <Text style={[styles.statusText, Typography.threeD]}>{status}</Text>
            <Text style={styles.subText}>Broadcasting your requirement to elite specialists within 10km.</Text>
          </Animated.View>

          <View style={styles.statsRow}>
             <View style={styles.statItem}>
                <Text style={styles.statVal}>10</Text>
                <Text style={styles.statLab}>PINGS SENT</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statItem}>
                <Text style={styles.statVal}>4.8+</Text>
                <Text style={styles.statLab}>AVG RATING</Text>
             </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <X color={Colors.textMuted} size={20} />
          <Text style={styles.cancelText}>ABORT MISSION</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  animationContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.cyan,
  },
  centerNode: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  orbitContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
  },
  orbitNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.cyan,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  textStack: {
    alignItems: 'center',
    marginTop: 40,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subText: {
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  statLab: {
    fontSize: 9,
    color: Colors.textDim,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: '100%',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textMuted,
    letterSpacing: 1,
  }
});

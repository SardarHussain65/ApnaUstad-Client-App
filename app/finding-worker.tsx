import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Image, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Shield, Star, MapPin, Check, Briefcase, Zap } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  useSharedValue,
  interpolate,
  FadeIn,
  FadeOut,
  SlideInDown,
  withSpring,
  Easing
} from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { socketService } from '../services/socketService';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAcceptBidMutation } from '../hooks/mutations/useMutations';
import { useBidsByJob } from '../hooks/queries/useMessagesAndJobs';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function FindingWorkerScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [status, setStatus] = useState('SCANNING LOCAL DIMENSIONS...');
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);
  const satelliteRotation = useSharedValue(0);

  const { mutate: acceptBid, isPending: isAccepting } = useAcceptBidMutation({
    onSuccess: (data) => {
      setStatus('USTAD SECURED. INITIATING DEPLOYMENT...');
      setShowModal(false);
      
      Toast.show({
        type: 'success',
        text1: 'MISSION SECURED',
        text2: 'Worker assigned successfully.',
      });

      // Redirect to booking details after a brief delay for UX
      setTimeout(() => {
        router.replace({
          pathname: '/transaction-details',
          params: { id: data._id }
        });
      }, 1500);
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'LINK FAILURE',
        text2: err.response?.data?.message || 'Could not assign worker.',
      });
    }
  });

  const { data: initialBids, isLoading: isBidsLoading } = useBidsByJob(jobId as string, {
    enabled: !!jobId,
    refetchInterval: 30000, // Reduced polling frequency to 30 seconds
  });

  useEffect(() => {
    if (initialBids && initialBids.length > 0) {
      // Sync state with fetched bids, avoiding duplicates
      setApplicants(prev => {
        const combined = [...prev];
        initialBids.forEach(bid => {
          if (!combined.some(a => a._id === bid._id)) {
            combined.push(bid);
          }
        });
        return combined;
      });
      
      if (status === 'SCANNING LOCAL DIMENSIONS...') {
        setStatus('SENSORS TRIPPED! SPECIALIST DETECTED...');
      }
    }
  }, [initialBids]);

  useEffect(() => {
    console.log('🛸 [FindingWorker] Component Mounted. jobId:', jobId);
    // Animations
    pulse.value = withRepeat(withTiming(1.2, { duration: 1500 }), -1, true);
    rotation.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);
    satelliteRotation.value = withRepeat(withTiming(-360, { duration: 15000, easing: Easing.linear }), -1, false);

    // Socket Listeners
    const unsubscribeAssigned = socketService.on('job:assigned', (data) => {
      console.log('✅ Job Assigned:', data);
      setStatus('USTAD SECURED. INITIATING DEPLOYMENT...');
      
      Toast.show({
        type: 'success',
        text1: 'MISSION SECURED! 🚀',
        text2: `Elite specialist has accepted the mission.`,
      });
      
      setTimeout(() => {
        router.replace({
          pathname: '/transaction-details',
          params: { id: data.booking._id }
        });
      }, 1500);
    });

    const unsubscribeBids = socketService.on('bid:new', (newBid: any) => {
      console.log('📩 [FindingWorker] New Worker Application Received:', newBid);
      setApplicants(prev => {
        // Avoid duplicates
        if (prev.some(a => a._id === newBid._id)) return prev;
        return [...prev, newBid];
      });
      setStatus('SENSORS TRIPPED! SPECIALIST DETECTED...');
    });

    return () => {
      unsubscribeAssigned();
      unsubscribeBids();
    };
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.2], [0.6, 0.1]),
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const satelliteOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${satelliteRotation.value}deg` }],
  }));

  const handleWorkerPress = (worker: any) => {
    setSelectedWorker(worker);
    setShowModal(true);
  };

  const handleHire = () => {
    if (!selectedWorker) return;
    acceptBid({ 
      jobId: jobId as string, 
      bidId: selectedWorker._id 
    });
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.animationContainer}>
            <Animated.View style={[styles.pulseRing, ringStyle]} />
            <Animated.View style={[styles.pulseRing, ringStyle, { delay: 500 } as any]} />
            
            {/* Satellite Workers Orbit */}
            <Animated.View style={[styles.satelliteOrbit, satelliteOrbitStyle]}>
              {applicants.map((app, index) => {
                const angle = (index * (360 / Math.max(applicants.length, 1))) * (Math.PI / 180);
                const radius = 115;
                const tx = radius * Math.cos(angle);
                const ty = radius * Math.sin(angle);

                return (
                  <TouchableOpacity
                    key={app._id}
                    onPress={() => handleWorkerPress(app)}
                    style={[
                      styles.satelliteContainer,
                      {
                        transform: [
                          { translateX: tx },
                          { translateY: ty },
                          { rotate: `${-satelliteRotation.value}deg` } // Counter-rotate to keep image upright
                        ]
                      }
                    ]}
                  >
                    <Animated.View entering={FadeIn.delay(300 * index).duration(500)} style={styles.satelliteGlow}>
                      <Image 
                        source={{ uri: app.worker?.profileImage || 'https://via.placeholder.com/150' }} 
                        style={styles.satelliteImage} 
                      />
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>Rs.{app.proposedPrice}</Text>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            <Animated.View style={[styles.orbitContainer, orbitStyle]}>
               <View style={styles.orbitNode} />
            </Animated.View>

            <View style={styles.centerNode}>
               <Shield color={Colors.cyan} size={32} />
            </View>
          </View>

          <Animated.View entering={FadeIn.delay(500)} style={styles.textStack}>
            <Text style={[styles.statusText, Typography.threeD]}>{status}</Text>
            <Text style={styles.subText}>
              {applicants.length > 0 
                ? `${applicants.length} elite specialists have intercept signals. Select one to proceed.` 
                : "Broadcasting your requirement to elite specialists within 10km."}
            </Text>
          </Animated.View>

          <View style={styles.statsRow}>
             <View style={styles.statItem}>
                <Text style={styles.statVal}>{Math.max(10, 10 + applicants.length)}</Text>
                <Text style={styles.statLab}>PINGS SENT</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statItem}>
                <Text style={styles.statVal}>{applicants.length > 0 ? applicants[0].worker?.averageRating?.toFixed(1) + '+' : '4.8+'}</Text>
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

        {/* Worker Details Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              onPress={() => setShowModal(false)} 
            />
            
            <Animated.View 
              entering={SlideInDown.springify().damping(15)}
              style={styles.modalContent}
            >
              <LinearGradient
                colors={['#0C0E24', '#080916']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>SPECIALIST PROFILE</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                    <X size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.workerHero}>
                  <View style={styles.heroImageWrapper}>
                    <Image 
                      source={{ uri: selectedWorker?.worker?.profileImage || 'https://via.placeholder.com/150' }} 
                      style={styles.heroImage} 
                    />
                    <View style={styles.statusGlow} />
                  </View>
                  <Text style={styles.workerName}>{selectedWorker?.worker?.fullName}</Text>
                  <View style={styles.ratingRow}>
                    <Star size={14} color={Colors.yellow} fill={Colors.yellow} />
                    <Text style={styles.ratingText}>{selectedWorker?.worker?.averageRating?.toFixed(1)} Specialist Rating</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <Zap size={18} color={Colors.cyan} />
                    <Text style={styles.infoLabel}>RATE</Text>
                    <Text style={styles.infoValue}>Rs.{selectedWorker?.proposedPrice}/hr</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Shield size={18} color={Colors.cyan} />
                    <Text style={styles.infoLabel}>STATUS</Text>
                    <Text style={styles.infoValue}>VERIFIED</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.hireBtn} 
                  onPress={handleHire}
                  disabled={isAccepting}
                >
                  <LinearGradient
                    colors={['#00F0FF', '#0066FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.hireGradient}
                  >
                    {isAccepting ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <Check size={20} color="#000" strokeWidth={3} />
                        <Text style={styles.hireText}>HIRE SPECIALIST</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>
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
  },
  satelliteOrbit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteGlow: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: Colors.cyan,
    backgroundColor: '#000',
    overflow: 'visible',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  satelliteImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  priceBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: Colors.cyan,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  priceText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.3)',
  },
  modalGradient: {
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  workerHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.cyan,
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  statusGlow: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00FF00',
    borderWidth: 2,
    borderColor: '#000',
  },
  workerName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 13,
    color: Colors.textDim,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  infoBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
  hireBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  hireGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hireText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  }
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { Colors, Typography, Spacing, Shadows } from '../constants/Theme';
import { GlassCard } from '../components/home/GlassCard';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, ShieldCheck, Zap, Download, Info, Copy, CheckCircle2, MapPin, Phone, MessageCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { AnimatedButton } from '../components/AnimatedButton';

const { width } = Dimensions.get('window');

export default function TransactionDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, amount: initialAmount } = useLocalSearchParams<{ id: string; amount?: string }>();
  const { role } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchBookingDetails();

    const unsubscribe = socketService.on('booking:status', (data) => {
      if (data.bookingId === id) {
        setBooking((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    return () => unsubscribe();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      const response = await api.get(`/bookings/${id}`);
      setBooking(response.data.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: newStatus });
      fetchBookingDetails();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const navigateToChat = () => {
    const partner = role === 'worker' ? booking?.customer : booking?.worker;
    router.push({
      pathname: '/chat',
      params: {
        bookingId: id,
        recipientName: partner?.fullName || 'Partner',
        recipientId: partner?._id
      }
    });
  };

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.cyan} size="large" />
        </View>
      </BackgroundWrapper>
    );
  }

  const amount = booking?.finalPrice || initialAmount || 'PENDING';
  const status = booking?.status || 'accepted';
  const isWorker = role === 'worker';
  const partner = isWorker ? booking?.customer : booking?.worker;

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MISSION PARAMETERS</Text>
          <TouchableOpacity style={styles.backButton}>
            <Share2 color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Status Badge */}
          <Animated.View entering={FadeInUp} style={styles.statusRow}>
            <GlassCard intensity={20} style={[styles.statusBadge, { borderColor: status === 'completed' ? Colors.success : Colors.cyan }]}>
              <View style={[styles.statusDot, { backgroundColor: status === 'completed' ? Colors.success : Colors.cyan }]} />
              <Text style={[styles.statusText, { color: status === 'completed' ? Colors.success : Colors.cyan }]}>
                {status.toUpperCase().replace('_', ' ')}
              </Text>
            </GlassCard>
          </Animated.View>

          {/* Amount Card */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.amountCard}>
            <Text style={styles.amountLabel}>ALLOCATED BUDGET</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>PKR</Text>
              <Text style={[styles.amountValue, Typography.threeD]}>{amount}</Text>
            </View>
            <Text style={styles.dateText}>
              {booking?.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'PROTOCOL ACTIVE'}
            </Text>
          </Animated.View>

          {/* Profile Section */}
          <Animated.View entering={FadeInUp.delay(200)}>
            <GlassCard intensity={25} style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{partner?.fullName?.[0] || 'U'}</Text>
                </View>
                <View style={styles.profileMeta}>
                  <Text style={styles.roleLabel}>{isWorker ? 'CLIENT' : 'ASSIGNED USTAD'}</Text>
                  <Text style={styles.profileName}>{partner?.fullName || 'IDENTIFYING...'}</Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]} onPress={() => Linking.openURL(`tel:${partner?.phone}`)}>
                    <Phone size={18} color={Colors.cyan} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.cyan }]} onPress={navigateToChat}>
                    <MessageCircle size={18} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Details Section */}
          <Animated.View entering={FadeInUp.delay(300)} style={styles.detailsList}>
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Zap size={18} color={Colors.cyan} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>MISSION CATEGORY</Text>
                <Text style={styles.detailValue}>{booking?.category || 'General Service'}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <MapPin size={18} color={Colors.cyan} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>SERVICE LOCATION</Text>
                <Text style={styles.detailValue}>{booking?.jobPost?.address || 'Standard Orbit'}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Description Section */}
          <Animated.View entering={FadeInUp.delay(400)}>
            <GlassCard intensity={15} style={styles.descCard}>
              <Text style={styles.descLabel}>MISSION BRIEF</Text>
              <Text style={styles.descText}>{booking?.jobPost?.description || 'No mission notes provided.'}</Text>
            </GlassCard>
          </Animated.View>

          {/* Operational Controls */}
          {isWorker && status !== 'completed' && (
            <Animated.View entering={FadeInUp.delay(500)} style={styles.operationalSection}>
              <View style={styles.opHeader}>
                <ShieldCheck size={14} color={Colors.textDim} />
                <Text style={styles.opLabel}>OPERATIONAL CONTROLS</Text>
              </View>
              {status === 'accepted' && (
                <AnimatedButton
                  title="INITIALIZE MISSION"
                  variant="cyan"
                  onPress={() => updateStatus('ongoing')}
                  isLoading={isUpdating}
                />
              )}
              {status === 'ongoing' && (
                <AnimatedButton
                  title="FINALIZE DEPLOYMENT"
                  variant="success"
                  onPress={() => updateStatus('completed')}
                  isLoading={isUpdating}
                />
              )}
            </Animated.View>
          )}

          {!isWorker && status === 'ongoing' && (
            <View style={styles.clientActivity}>
              <ActivityIndicator size="small" color={Colors.cyan} />
              <Text style={styles.activityText}>USTAD IS CURRENTLY ON-SITE PERFORMING THE MISSION</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statusRow: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  amountCard: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 10,
  },
  amountLabel: {
    fontSize: 10,
    color: Colors.textDim,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '900',
    marginRight: 8,
  },
  amountValue: {
    fontSize: 48,
    color: '#fff',
    fontWeight: '900',
  },
  dateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  profileCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 25,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  profileMeta: {
    flex: 1,
    marginLeft: 15,
  },
  roleLabel: {
    fontSize: 9,
    color: Colors.textDim,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsList: {
    gap: 20,
    marginBottom: 25,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  detailContent: {
    marginLeft: 15,
  },
  detailLabel: {
    fontSize: 9,
    color: Colors.textDim,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  descCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 30,
  },
  descLabel: {
    fontSize: 10,
    color: Colors.cyan,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  descText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    fontWeight: '500',
  },
  operationalSection: {
    gap: 15,
  },
  opHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 5,
  },
  opLabel: {
    fontSize: 10,
    color: Colors.textDim,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  clientActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.03)',
    padding: 20,
    borderRadius: 20,
  },
  activityText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    flex: 1,
  }
});

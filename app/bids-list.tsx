import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, Clock, Banknote, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { AnimatedButton } from '../components/AnimatedButton';
import api from '../services/api';

export default function BidsListScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [bids, setBids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  useEffect(() => {
    fetchBids();
  }, [jobId]);

  const fetchBids = async () => {
    try {
      const response = await api.get(`/jobs/${jobId}/bids`);
      setBids(response.data.data);
    } catch (error) {
      console.error('Error fetching bids:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    setIsAccepting(bidId);
    try {
      const response = await api.post(`/jobs/bids/${bidId}/accept`);
      router.replace({
        pathname: '/transaction-details',
        params: { id: response.data.data._id }
      });
    } catch (error) {
      console.error('Error accepting bid:', error);
    } finally {
      setIsAccepting(null);
    }
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, Typography.threeD]}>DEPLOYMENT BIDS</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.cyan} size="large" />
            <Text style={styles.loadingText}>FETCHING MARKET PROPOSALS...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.countText}>{bids.length} SPECIALISTS RESPONDED</Text>

            {bids.map((bid, index) => (
              <Animated.View key={bid._id} entering={FadeInDown.delay(index * 100).duration(800)}>
                <GlassCard style={styles.bidCard} hasGlow glowColor={Colors.cyan + '20'}>
                  <View style={styles.bidHeader}>
                    <View style={styles.workerInfo}>
                      <Image 
                        source={{ uri: bid.worker?.profileImage || 'https://via.placeholder.com/100' }} 
                        style={styles.avatar} 
                      />
                      <View>
                        <Text style={styles.workerName}>{bid.worker?.fullName}</Text>
                        <View style={styles.ratingRow}>
                          <Star size={12} fill="#FFD700" color="#FFD700" />
                          <Text style={styles.ratingText}>{bid.worker?.averageRating?.toFixed(1) || '5.0'}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceLabel}>QUOTED PRICE</Text>
                      <Text style={styles.priceVal}>Rs. {bid.proposedPrice}</Text>
                    </View>
                  </View>

                  <Text style={styles.message}>{bid.message}</Text>

                  <View style={styles.footer}>
                     <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                           <ShieldCheck size={12} color={Colors.cyan} />
                           <Text style={styles.badgeText}>VERIFIED</Text>
                        </View>
                        <View style={styles.badge}>
                           <Clock size={12} color={Colors.textDim} />
                           <Text style={styles.badgeText}>AVAILABLE</Text>
                        </View>
                     </View>
                     <AnimatedButton 
                        title="DEPLOY USTAD" 
                        variant="cyan"
                        onPress={() => handleAcceptBid(bid._id)}
                        isLoading={isAccepting === bid._id}
                        style={styles.acceptBtn}
                     />
                  </View>
                </GlassCard>
              </Animated.View>
            ))}

            {bids.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No bids received yet. Please check back shortly.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  scrollBody: {
    padding: Spacing.l,
    paddingBottom: 40,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 20,
  },
  bidCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  workerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textDim,
  },
  priceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  message: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.textDim,
  },
  acceptBtn: {
    minWidth: 120,
    height: 40,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: Colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  }
});

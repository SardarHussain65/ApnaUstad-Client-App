import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Banknote, 
  MessageSquare, 
  ShieldCheck, 
  Zap,
  Calendar,
  Clock
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { AnimatedButton } from '../components/AnimatedButton';
import api from '../services/api';

export default function BidSubmissionScreen() {
  const router = useRouter();
  const { jobId, title, urgency } = useLocalSearchParams<{ jobId: string; title: string; urgency: string }>();
  
  const [proposedPrice, setProposedPrice] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      // We might need a specific get job by ID endpoint, but for now we'll assume we have basics or fetch context
      // Assuming for demo we use params or fetch from nearby list again
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setIsLoading(false);
    }
  };

  const handleSubmitBid = async () => {
    if (urgency === 'instant') {
      handleAcceptInstant();
      return;
    }

    if (!proposedPrice || !message) return;

    setIsSubmitting(true);
    try {
      await api.post(`/jobs/${jobId}/bids`, {
        message,
        proposedPrice: parseInt(proposedPrice),
      });
      router.replace('/(tabs)/bookings');
    } catch (error) {
      console.error('Error submitting bid:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInstant = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post(`/jobs/${jobId}/accept-instant`);
      router.replace({
        pathname: '/transaction-details',
        params: { id: response.data.data._id }
      });
    } catch (error) {
      console.error('Error accepting instant job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, Typography.threeD]}>MISSION DEPLOYMENT</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(800)}>
            <GlassCard style={styles.jobInfoCard} gradient={urgency === 'instant' ? [Colors.cyan, '#000'] as any : [Colors.worker, '#000'] as any}>
              <View style={styles.typeRow}>
                 {urgency === 'instant' ? <Zap size={16} color="#fff" /> : <Calendar size={16} color="#fff" />}
                 <Text style={styles.typeText}>{urgency?.toUpperCase()} MISSION</Text>
              </View>
              <Text style={[styles.jobTitle, Typography.threeD]}>{title}</Text>
              <Text style={styles.jobDesc}>Respond to this requirement with your elite proposal.</Text>
            </GlassCard>
          </Animated.View>

          {urgency === 'scheduled' && (
            <View style={styles.form}>
              <View style={styles.section}>
                 <Text style={styles.label}>PROPOSED COMPENSATION (RS.)</Text>
                 <GlassCard style={styles.inputCard}>
                    <View style={styles.inputRow}>
                       <Banknote size={20} color={Colors.cyan} />
                       <TextInput 
                          style={styles.textInput}
                          placeholder="e.g. 1500"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="numeric"
                          value={proposedPrice}
                          onChangeText={setProposedPrice}
                       />
                    </View>
                 </GlassCard>
              </View>

              <View style={styles.section}>
                 <Text style={styles.label}>SPECIFICATIONS / PITCH</Text>
                 <GlassCard style={styles.inputCard}>
                    <View style={styles.inputRowTop}>
                       <MessageSquare size={20} color={Colors.cyan} style={{ marginTop: 12 }} />
                       <TextInput 
                          style={[styles.textInput, { minHeight: 100 }]}
                          placeholder="Why are you the best specialist for this mission?"
                          placeholderTextColor={Colors.textMuted}
                          multiline
                          value={message}
                          onChangeText={setMessage}
                       />
                    </View>
                 </GlassCard>
              </View>
            </View>
          )}

          {urgency === 'instant' && (
             <View style={styles.instantInfo}>
                <Text style={styles.instantText}>This is an immediate deployment request. Accepting this mission requires immediate dispatch to the client's location.</Text>
                <View style={styles.statsGrid}>
                   <View style={styles.statItem}>
                      <Clock size={16} color={Colors.cyan} />
                      <Text style={styles.statText}>ETA {'<'} 20 MIN</Text>
                   </View>
                   <View style={styles.statDivider} />
                   <View style={styles.statItem}>
                      <ShieldCheck size={16} color={Colors.cyan} />
                      <Text style={styles.statText}>VERIFIED ZONE</Text>
                   </View>
                </View>
             </View>
          )}

          <View style={styles.footer}>
             <AnimatedButton 
                title={urgency === 'instant' ? "CONFIRM READINESS" : "SUBMIT PROPOSAL"} 
                variant={urgency === 'instant' ? 'cyan' : 'orange'}
                onPress={handleSubmitBid}
                isLoading={isSubmitting}
                style={styles.submitBtn}
             />
             <Text style={styles.disclaimer}>By submitting, you agree to the ApnaUstad Protocol standards.</Text>
          </View>
        </ScrollView>
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
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  scrollBody: {
    padding: Spacing.l,
    paddingBottom: 40,
  },
  jobInfoCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 30,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  jobDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textDim,
    letterSpacing: 1,
  },
  inputCard: {
    padding: 4,
    borderRadius: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '600',
  },
  instantInfo: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
    marginBottom: 30,
  },
  instantText: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
     color: Colors.cyan,
     fontSize: 11,
     fontWeight: '900',
  },
  statDivider: {
    width: 1,
    height: 15,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    height: 60,
    marginBottom: 20,
  },
  disclaimer: {
    fontSize: 10,
    color: Colors.textDim,
    fontWeight: '600',
  }
});

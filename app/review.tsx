import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ChevronLeft, CheckCircle2, MessageSquareText, Send, Star } from 'lucide-react-native';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { GlassCard } from '../components/home/GlassCard';
import { Colors, Spacing, Typography } from '../constants/Theme';
import { useBookingDetails, useCreateReviewMutation, useToast } from '../hooks';

const RATING_LABELS: Record<number, string> = {
  1: 'Needs serious improvement',
  2: 'Below expectations',
  3: 'Good enough',
  4: 'Great service',
  5: 'Outstanding work',
};

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: booking, isLoading, refetch } = useBookingDetails(bookingId);
  const { mutate: submitReview, isPending } = useCreateReviewMutation();

  const assignedWorker = booking?.worker as any;
  const workerId = typeof assignedWorker === 'string' ? assignedWorker : assignedWorker?._id;
  const workerName = typeof assignedWorker === 'object' ? assignedWorker?.fullName : 'Your Ustad';
  const canSubmit = !!bookingId && !!workerId && booking?.status === 'completed' && !booking?.isReviewed && rating >= 1 && !isPending;

  const commentCounter = useMemo(() => `${comment.trim().length}/500`, [comment]);

  const handleSubmit = () => {
    if (!canSubmit) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitReview(
      {
        booking: bookingId,
        worker: workerId,
        rating,
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success('Review submitted', 'Thanks for helping other customers choose confidently.');
          router.replace({ pathname: '/transaction-details', params: { id: bookingId } });
        },
        onError: (error: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          toast.error('Review failed', error?.response?.data?.message || error?.message || 'Please try again.');
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.cyan} size="large" />
          <Text style={styles.loadingText}>Preparing review console...</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>MISSION FEEDBACK</Text>
            <Text style={[styles.headerTitle, Typography.threeD]}>Rate Your Ustad</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {booking?.isReviewed ? (
            <Animated.View entering={FadeInUp.duration(500)}>
              <GlassCard intensity={25} style={styles.doneCard}>
                <CheckCircle2 size={50} color={Colors.success} />
                <Text style={styles.doneTitle}>Review Already Submitted</Text>
                <Text style={styles.doneText}>This completed mission already has customer feedback attached.</Text>
                <TouchableOpacity onPress={() => router.replace({ pathname: '/transaction-details', params: { id: bookingId } })} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>BACK TO DETAILS</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>
          ) : booking?.status !== 'completed' ? (
            <Animated.View entering={FadeInUp.duration(500)}>
              <GlassCard intensity={25} style={styles.doneCard}>
                <MessageSquareText size={50} color={Colors.orange} />
                <Text style={styles.doneTitle}>Review Unlocks After Completion</Text>
                <Text style={styles.doneText}>Once the mission is completed, you can rate the service and share your experience.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>GO BACK</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(500)}>
                <GlassCard intensity={25} style={styles.workerCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{workerName?.[0]?.toUpperCase() || 'U'}</Text>
                  </View>
                  <View style={styles.workerMeta}>
                    <Text style={styles.workerLabel}>ASSIGNED USTAD</Text>
                    <Text style={styles.workerName}>{workerName || 'Your Ustad'}</Text>
                    <Text style={styles.workerSub}>{booking?.category || 'Service Mission'}</Text>
                  </View>
                </GlassCard>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                <GlassCard intensity={20} style={styles.ratingCard}>
                  <Text style={styles.sectionTitle}>HOW WAS THE SERVICE?</Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = value <= rating;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => {
                            setRating(value);
                            Haptics.selectionAsync();
                          }}
                          style={styles.starBtn}
                        >
                          <Star size={38} color="#FFD700" fill={active ? '#FFD700' : 'transparent'} strokeWidth={2} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
                </GlassCard>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).duration(500)}>
                <GlassCard intensity={18} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.sectionTitle}>PUBLIC REVIEW</Text>
                    <Text style={styles.counter}>{commentCounter}</Text>
                  </View>
                  <TextInput
                    value={comment}
                    onChangeText={(text: string) => setComment(text.slice(0, 500))}
                    multiline
                    textAlignVertical="top"
                    placeholder="Share what went well, punctuality, quality of work, or anything future customers should know..."
                    placeholderTextColor="rgba(255,255,255,0.32)"
                    style={styles.input}
                  />
                </GlassCard>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {booking?.status === 'completed' && !booking?.isReviewed && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
            <TouchableOpacity activeOpacity={0.86} disabled={!canSubmit} onPress={handleSubmit} style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}>
              <LinearGradient
                colors={canSubmit ? ['#FFD700', '#FFB300'] : ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isPending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.submitText}>SUBMIT REVIEW</Text>
                    <Send size={17} color="#000" strokeWidth={2.5} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: Colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { alignItems: 'center' },
  headerEyebrow: { color: Colors.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 2.4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  scroll: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.s,
    paddingBottom: 140,
    gap: 18,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderColor: 'rgba(255,215,0,0.22)',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.38)',
    marginRight: 16,
  },
  avatarText: { color: '#FFD700', fontSize: 26, fontWeight: '900' },
  workerMeta: { flex: 1 },
  workerLabel: { color: Colors.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  workerName: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  workerSub: { color: Colors.cyan, fontSize: 12, fontWeight: '700', marginTop: 3 },
  ratingCard: { alignItems: 'center', borderRadius: 24 },
  sectionTitle: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, gap: 6 },
  starBtn: { padding: 4 },
  ratingLabel: { color: '#FFD700', fontSize: 18, fontWeight: '900', marginTop: 14 },
  commentCard: { borderRadius: 24 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  counter: { color: Colors.textDim, fontSize: 11, fontWeight: '700' },
  input: {
    minHeight: 150,
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    padding: 0,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.l,
    paddingTop: 16,
    backgroundColor: 'rgba(5,5,16,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  submitBtn: { borderRadius: 18, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.55 },
  submitGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  doneCard: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    paddingHorizontal: 22,
  },
  doneTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 18 },
  doneText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 22, marginTop: 10 },
  doneBtn: {
    marginTop: 26,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(0,245,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: Colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});

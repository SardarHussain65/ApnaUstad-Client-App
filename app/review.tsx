import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import {
  ChevronLeft,
  CheckCircle2,
  MessageSquareText,
  Send,
  Star,
  UserRound,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
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

const FEEDBACK_TAGS = [
  '⚡ On time',
  '🤝 Super polite',
  '🛠️ High quality',
  '💵 Fair pricing',
  '🧹 Kept it neat',
  '💯 Super honest',
];

const P = {
  gold: '#FFD700',
  goldMuted: 'rgba(255,215,0,0.14)',
  cyan: '#00F5FF',
  cyanMuted: 'rgba(0,245,255,0.12)',
  green: '#00FF7F',
  greenMuted: 'rgba(0,255,127,0.12)',
  surface: 'rgba(9, 12, 32, 0.74)',
  surfaceFocus: 'rgba(12, 16, 42, 0.94)',
  border: 'rgba(255,255,255,0.08)',
  borderFocus: 'rgba(0,245,255,0.35)',
  borderGold: 'rgba(255,215,0,0.35)',
  textDim: '#646B7E',
  textMuted: '#9BA3B4',
  text: '#FFFFFF',
};

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const { data: booking, isLoading, refetch } = useBookingDetails(bookingId);
  const { mutate: submitReview, isPending } = useCreateReviewMutation();

  const assignedWorker = booking?.worker as any;
  const workerId = typeof assignedWorker === 'string' ? assignedWorker : assignedWorker?._id;
  const workerName = typeof assignedWorker === 'object' ? assignedWorker?.fullName : 'Your Ustad';
  const workerImage = typeof assignedWorker === 'object' ? assignedWorker?.profileImage : '';
  const workerCategory = typeof assignedWorker === 'object' ? assignedWorker?.category : (booking?.category || 'Specialist');
  const isVerified = typeof assignedWorker === 'object' ? assignedWorker?.isVerified : false;

  const canSubmit = !!bookingId && !!workerId && booking?.status === 'completed' && !booking?.isReviewed && rating >= 1 && !isPending;
  const commentCounter = useMemo(() => `${comment.trim().length} / 500`, [comment]);

  const initialsFor = (name?: string) => {
    if (!name?.trim()) return 'AU';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  };

  const handleTagPress = (tagLabel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let newComment = comment;
    if (newComment.includes(tagLabel)) {
      newComment = newComment
        .replace(tagLabel + '. ', '')
        .replace(tagLabel, '')
        .trim();
    } else {
      newComment = newComment ? `${newComment} ${tagLabel}.` : `${tagLabel}.`;
    }
    setComment(newComment.slice(0, 500));
  };

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
          <ActivityIndicator color={P.cyan} size="large" />
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <ChevronLeft color="#fff" size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>JOB FEEDBACK</Text>
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
                <Text style={styles.doneText}>This completed job already has customer feedback attached.</Text>
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
                <Text style={styles.doneText}>Once the job is completed, you can rate the service and share your experience.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>GO BACK</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              {/* Ustad Profile Card */}
              <Animated.View entering={FadeInDown.duration(450)}>
                <View style={styles.workerCard}>
                  <LinearGradient
                    colors={['rgba(255,215,0,0.08)', 'rgba(9,12,32,0.92)', 'rgba(0,245,255,0.03)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.avatarShell}>
                    {workerImage ? (
                      <Image source={{ uri: workerImage }} style={styles.avatarImage} />
                    ) : (
                      <LinearGradient colors={['rgba(255,215,0,0.22)', 'rgba(0,245,255,0.18)']} style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>{initialsFor(workerName)}</Text>
                      </LinearGradient>
                    )}
                    {isVerified && (
                      <View style={styles.verifiedBadge}>
                        <ShieldCheck size={10} color="#001014" fill={P.cyan} />
                      </View>
                    )}
                  </View>
                  <View style={styles.workerMeta}>
                    <View style={styles.roleRow}>
                      <Text style={styles.workerLabel}>ASSIGNED USTAD</Text>
                      {isVerified && (
                        <View style={styles.verifiedLabel}>
                          <Sparkles size={8} color={P.cyan} />
                          <Text style={styles.verifiedLabelText}>Verified Specialist</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.workerName, Typography.threeD]} numberOfLines={1}>{workerName}</Text>
                    <Text style={styles.workerSub} numberOfLines={1}>{workerCategory}</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Star Rating Panel */}
              <Animated.View entering={FadeInDown.delay(100).duration(450)}>
                <View style={styles.ratingCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.02)', 'rgba(9,12,32,0.85)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.sectionTitle}>HOW WAS THE SERVICE?</Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = value <= rating;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => {
                            setRating(value);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }}
                          style={styles.starBtn}
                          activeOpacity={0.8}
                        >
                          <Star
                            size={36}
                            color={active ? P.gold : 'rgba(255,255,255,0.15)'}
                            fill={active ? P.gold : 'transparent'}
                            strokeWidth={1.8}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[styles.ratingBadge, { borderColor: `${P.gold}30`, backgroundColor: `${P.gold}10` }]}>
                    <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Smart Feedback Tags */}
              <Animated.View entering={FadeInDown.delay(180).duration(450)}>
                <View style={styles.tagsCard}>
                  <Text style={styles.sectionTitle}>QUICK COMPLEMENTS</Text>
                  <Text style={styles.tagsHint}>Tap tags to instantly add them to your review</Text>

                  <View style={styles.tagsWrapper}>
                    {FEEDBACK_TAGS.map((tag) => {
                      const active = comment.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => handleTagPress(tag)}
                          activeOpacity={0.8}
                          style={[
                            styles.tagChip,
                            active && {
                              borderColor: `${P.cyan}44`,
                              backgroundColor: `${P.cyan}16`,
                            },
                          ]}
                        >
                          <Text style={[styles.tagText, active && { color: P.cyan }]}>{tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>

              {/* Written Comment Card */}
              <Animated.View entering={FadeInDown.delay(260).duration(450)}>
                <View style={[
                  styles.commentCard,
                  {
                    borderColor: isFocused ? P.borderFocus : P.border,
                    backgroundColor: isFocused ? P.surfaceFocus : P.surface,
                  }
                ]}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.sectionTitle}>PUBLIC REVIEW</Text>
                    <View style={[
                      styles.counterPanel,
                      {
                        backgroundColor: comment.trim().length > 400 ? 'rgba(255,59,48,0.1)' : 'rgba(255,255,255,0.04)',
                        borderColor: comment.trim().length > 400 ? 'rgba(255,59,48,0.22)' : 'rgba(255,255,255,0.08)',
                      }
                    ]}>
                      <Text style={[
                        styles.counter,
                        comment.trim().length > 400 && { color: '#FF3B30' }
                      ]}>{commentCounter}</Text>
                    </View>
                  </View>
                  <TextInput
                    value={comment}
                    onChangeText={(text: string) => setComment(text.slice(0, 500))}
                    multiline
                    textAlignVertical="top"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Share what went well, punctuality, quality of work, or anything future customers should know..."
                    placeholderTextColor="rgba(255,255,255,0.26)"
                    style={styles.input}
                  />
                </View>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {booking?.status === 'completed' && !booking?.isReviewed && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
            <TouchableOpacity activeOpacity={0.86} disabled={!canSubmit} onPress={handleSubmit} style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}>
              <LinearGradient
                colors={canSubmit ? ['#FFC700', '#FF9500'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isPending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={[styles.submitText, !canSubmit && { color: P.textDim }]}>SUBMIT REVIEW</Text>
                    <Send size={15} color={canSubmit ? '#000' : P.textDim} strokeWidth={2.5} />
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
  doneCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(9, 12, 32, 0.74)',
    gap: 16,
    marginTop: 40,
  },
  doneTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  doneText: {
    color: '#646B7E',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  doneBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00F5FF',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
  },
  doneBtnText: {
    color: '#001014',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: P.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { alignItems: 'center' },
  headerEyebrow: { color: P.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 2.2 },
  headerTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 4 },
  scroll: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.s,
    paddingBottom: 140,
    gap: 16,
  },
  workerCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    backgroundColor: P.surface,
  },
  avatarShell: {
    position: 'relative',
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: 'rgba(255,215,0,0.38)',
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginRight: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFD700', fontSize: 21, fontWeight: '900' },
  verifiedBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#001014',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.3)',
  },
  workerMeta: { flex: 1 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  workerLabel: { color: P.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  verifiedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,245,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.18)',
  },
  verifiedLabelText: {
    color: P.cyan,
    fontSize: 8,
    fontWeight: '900',
  },
  workerName: { color: '#fff', fontSize: 19, fontWeight: '900', marginTop: 4 },
  workerSub: { color: P.cyan, fontSize: 12, fontWeight: '700', marginTop: 3 },
  ratingCard: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    backgroundColor: P.surface,
  },
  sectionTitle: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
  starBtn: { padding: 4 },
  ratingBadge: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingLabel: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  tagsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    backgroundColor: P.surface,
  },
  tagsHint: {
    color: P.textDim,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 12,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tagText: {
    color: '#d8d9e4',
    fontSize: 11,
    fontWeight: '800',
  },
  commentCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    minHeight: 180,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  counterPanel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  counter: { color: P.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  input: {
    minHeight: 110,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
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
    backgroundColor: 'rgba(5,5,16,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.4 },
  submitGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});

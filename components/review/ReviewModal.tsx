import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { CheckCircle2, Star, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeTypography } from '../../constants/Theme';
import { useCreateReviewMutation } from '../../hooks';

const FEEDBACK_TAGS = [
  '⚡ On time',
  '🤝 Super polite',
  '🛠️ High quality',
  '💵 Fair pricing',
  '🧹 Clean work',
  '💯 Super honest',
];

interface ReviewModalProps {
  visible: boolean;
  bookingId: string;
  workerId: string;
  workerName: string;
  workerImage?: string;
  category?: string;
  initialRating?: number;
  onClose: () => void;
  onSkip?: () => void;
  onSuccess?: () => void;
}

export function ReviewModal({
  visible,
  bookingId,
  workerId,
  workerName,
  workerImage,
  category,
  initialRating = 5,
  onClose,
  onSkip,
  onSuccess,
}: ReviewModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();

  const [selectedRating, setSelectedRating] = useState<number>(initialRating);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  React.useEffect(() => {
    if (visible && initialRating) {
      setSelectedRating(initialRating);
    }
  }, [visible, initialRating]);

  const { mutate: createReview, isPending: isSubmitting } = useCreateReviewMutation();

  const ratingLabel = useMemo(() => {
    switch (selectedRating) {
      case 1:
        return t('review.label1', 'Needs improvement');
      case 2:
        return t('review.label2', 'Below expectations');
      case 3:
        return t('review.label3', 'Good enough');
      case 4:
        return t('review.label4', 'Great work');
      case 5:
        return t('review.label5', 'Outstanding work!');
      default:
        return t('review.howWasService', 'Tap stars to rate');
    }
  }, [selectedRating, t]);

  const initials = useMemo(() => {
    if (!workerName?.trim()) return 'AU';
    return workerName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  }, [workerName]);

  const handleTagToggle = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let updatedTags: string[];
    if (selectedTags.includes(tag)) {
      updatedTags = selectedTags.filter(t => t !== tag);
    } else {
      updatedTags = [...selectedTags, tag];
    }
    setSelectedTags(updatedTags);

    // Keep comment in sync with selected tags if desired
    const tagText = tag.replace(/^[^\w\s]+\s*/, ''); // strip emoji
    if (!selectedTags.includes(tag)) {
      const cleanComment = reviewComment.trim();
      const addition = cleanComment.length > 0 ? `, ${tagText.toLowerCase()}` : tagText;
      setReviewComment(cleanComment ? `${cleanComment}${addition}` : addition);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  const handleSubmit = () => {
    if (selectedRating === 0 || !bookingId || !workerId || isSubmitting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createReview(
      {
        booking: bookingId,
        worker: workerId,
        rating: selectedRating,
        comment: reviewComment.trim() || undefined,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({
            type: 'success',
            text1: t('review.successTitle', 'Thank you!'),
            text2: t('review.successDesc', 'Your feedback helps maintain quality on Apna Ustad.'),
          });
          onSuccess?.();
          onClose();
        },
        onError: (err: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Toast.show({
            type: 'error',
            text1: t('review.failedTitle', 'Failed to Submit Review'),
            text2: err.response?.data?.message || t('common.tryAgain', 'Please try again.'),
          });
        },
      }
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalBackdrop}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 100}
            style={StyleSheet.absoluteFill}
            tint={theme.isDark ? 'dark' : 'light'}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <Animated.View
              entering={FadeInDown.duration(260)}
              exiting={FadeOut.duration(160)}
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.isDark ? '#090C1F' : '#FFFFFF',
                  borderColor: theme.isDark ? 'rgba(0, 245, 255, 0.22)' : theme.colors.border.subtle,
                  shadowColor: theme.colors.shadow.color,
                },
              ]}
            >
              <LinearGradient
                colors={
                  theme.isDark
                    ? ['rgba(0, 245, 255, 0.08)', 'rgba(9, 12, 31, 0.98)']
                    : ['rgba(0, 168, 107, 0.04)', 'rgba(255, 255, 255, 0.98)']
                }
                style={styles.cardGradient}
              >
                {/* Header Row: Close X on right */}
                <View style={styles.headerRow}>
                  <View style={styles.successPill}>
                    <CheckCircle2 size={13} color={colors.success} strokeWidth={2.5} />
                    <Text style={[styles.successPillText, { color: colors.success }]}>
                      {t('transactionDetails.paymentConfirmed', 'Payment Settled')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleSkip}
                    style={[styles.closeBtn, { backgroundColor: alpha(theme.colors.text.primary, 0.06) }]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={theme.colors.text.muted} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {/* Worker Info Avatar + Headline */}
                  <View style={styles.workerProfileRow}>
                    <View style={[styles.avatarShell, { borderColor: alpha(colors.primary, 0.3) }]}>
                      {workerImage ? (
                        <Image source={{ uri: workerImage }} style={styles.avatarImg} />
                      ) : (
                        <LinearGradient
                          colors={[alpha(colors.cyan, 0.35), alpha(colors.primary, 0.2)]}
                          style={styles.avatarFallback}
                        >
                          <Text style={[styles.avatarInitial, { color: theme.colors.text.primary }]}>{initials}</Text>
                        </LinearGradient>
                      )}
                    </View>

                    <View style={styles.workerMeta}>
                      <Text style={[styles.workerName, typography.threeD, { color: theme.colors.text.primary }]} numberOfLines={1}>
                        {workerName}
                      </Text>
                      {category ? (
                        <Text style={[styles.workerCategory, { color: theme.colors.text.muted }]} numberOfLines={1}>
                          {category}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Title & Subtitle */}
                  <Text style={[styles.modalTitle, typography.threeD, { color: theme.colors.text.primary }]}>
                    {t('transactionDetails.ratePartner', `How was ${workerName}'s work?`, { name: workerName })}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.text.muted }]}>
                    {t('transactionDetails.reviewSubtitle', 'Your rating helps good Ustads get more work.')}
                  </Text>

                  {/* Interactive Star Row */}
                  <View style={styles.starsWrapper}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((starNum) => {
                        const isActive = starNum <= selectedRating;
                        return (
                          <TouchableOpacity
                            key={starNum}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedRating(starNum);
                            }}
                            activeOpacity={0.7}
                            style={styles.starTouch}
                          >
                            <Star
                              size={34}
                              color={isActive ? '#FFD700' : alpha(theme.colors.text.primary, 0.18)}
                              fill={isActive ? '#FFD700' : 'transparent'}
                              strokeWidth={1.8}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={[styles.ratingFeedbackLabel, { color: '#FFD700' }]}>
                      {ratingLabel}
                    </Text>
                  </View>

                  {/* Feedback Tags / Chips */}
                  <View style={styles.tagsContainer}>
                    {FEEDBACK_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.tagChip,
                            {
                              backgroundColor: isSelected
                                ? alpha(colors.cyan, 0.16)
                                : alpha(theme.colors.text.primary, 0.05),
                              borderColor: isSelected
                                ? alpha(colors.cyan, 0.5)
                                : alpha(theme.colors.text.primary, 0.1),
                            },
                          ]}
                          onPress={() => handleTagToggle(tag)}
                          activeOpacity={0.74}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              {
                                color: isSelected ? colors.cyan : theme.colors.text.secondary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Comment Input */}
                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : theme.colors.surface.subtle,
                        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.09)' : theme.colors.border.subtle,
                        color: theme.colors.text.primary,
                      },
                    ]}
                    placeholder={t('transactionDetails.commentPlaceholder', 'Tell others how the work went... (optional)')}
                    placeholderTextColor={theme.colors.text.muted}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    multiline
                    numberOfLines={Platform.OS === 'ios' ? 3 : 2}
                    maxLength={350}
                  />

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        { backgroundColor: colors.success },
                        (selectedRating === 0 || isSubmitting) && styles.btnDisabled,
                      ]}
                      disabled={selectedRating === 0 || isSubmitting}
                      onPress={handleSubmit}
                      activeOpacity={0.84}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#001014" />
                      ) : (
                        <Text style={styles.submitBtnText}>
                          {t('transactionDetails.submitReview', 'Send Rating')}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.skipBtn}
                      onPress={handleSkip}
                      activeOpacity={0.7}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.skipBtnText, { color: theme.colors.text.muted }]}>
                        {t('review.skipForNow', 'Skip for now')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  cardGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  successPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
  },
  successPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 4,
  },
  workerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatarShell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
  },
  workerMeta: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  workerCategory: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 17,
  },
  starsWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 6,
  },
  starTouch: {
    padding: 3,
  },
  ratingFeedbackLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 64,
    marginBottom: 16,
  },
  actionRow: {
    gap: 8,
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#001014',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  skipBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});


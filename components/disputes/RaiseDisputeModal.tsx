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
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Info, Scale, X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BeautifulModal } from '../ui/BeautifulModal';
import { alpha, useTheme, useThemeColors } from '../../constants/Theme';
import { raiseDisputeRequest, uploadDisputeEvidence, type DisputeReason } from '../../hooks/queries/useDisputes';
import { queryKeys } from '../../lib/queryKeyFactory';

const REASONS: DisputeReason[] = [
  'no_show',
  'incomplete_work',
  'poor_quality',
  'unfair_pricing',
  'payment_issue',
  'other',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  jobAmount?: number;
  onSubmitted: () => void;
};

const formatPKR = (value: number) => `Rs. ${Math.round(value).toLocaleString('en-PK')}`;

export function RaiseDisputeModal({ visible, onClose, bookingId, jobAmount = 0, onSubmitted }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<DisputeReason>('poor_quality');
  const [description, setDescription] = useState('');
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = description.trim().length >= 10 && !submitting;

  const reasonLabel = useMemo(() => (
    (value: DisputeReason) => t(`disputes.reasons.${value}`, value.replace(/_/g, ' '))
  ), [t]);

  const uploadProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('disputes.photoPermission', 'Photo permission is required to attach proof.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(0, 3 - proofImages.length),
    });

    if (result.canceled || !result.assets?.length) return;

    setSubmitting(true);
    setError('');
    try {
      const uploaded = await uploadDisputeEvidence(result.assets);
      setProofImages((current) => [...current, ...uploaded].slice(0, 3));
    } catch {
      setError(t('disputes.uploadFailed', 'Could not upload proof photos. You can still submit without them.'));
    } finally {
      setSubmitting(false);
    }
  };

  const removeProofImage = (index: number) => {
    setProofImages((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await raiseDisputeRequest({
        bookingId,
        reason,
        description: description.trim(),
        proofImages,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.disputes.my() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.disputes.byBooking(bookingId) });
      setDescription('');
      setProofImages([]);
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('disputes.submitFailed', 'Could not submit complaint.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BeautifulModal
      visible={visible}
      onClose={onClose}
      title={t('disputes.raiseTitle', 'Report an Issue')}
      height={Platform.OS === 'ios' ? '86%' : '88%'}
      icon={<Scale size={24} color={theme.colors.brand.primary} strokeWidth={2.2} />}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Info Banner */}
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.isDark
                  ? alpha(theme.colors.brand.primary, 0.1)
                  : alpha(theme.colors.brand.primary, 0.07),
                borderColor: alpha(theme.colors.brand.primary, theme.isDark ? 0.32 : 0.22),
              },
            ]}
          >
            <Info size={18} color={theme.colors.brand.primary} strokeWidth={2.2} style={{ marginTop: 1 }} />
            <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
              {t('disputes.raiseHelper', 'Tell us honestly what went wrong. Our team checks both sides fairly. Cash payment stays on hold during review.')}
            </Text>
          </View>

          {/* Steps Progress Row */}
          <View style={styles.stepsRow}>
            {['1', '2', '3'].map((step, index) => (
              <View key={step} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: alpha(theme.colors.brand.primary, theme.isDark ? 0.18 : 0.12),
                      borderColor: theme.colors.brand.primary,
                    },
                  ]}
                >
                  <Text style={[styles.stepDotText, { color: theme.colors.brand.primary }]}>{step}</Text>
                </View>
                <Text style={[styles.stepLabel, { color: theme.colors.text.secondary }]}>
                  {t(`disputes.step${index + 1}`, ['Sent', 'Checking', 'Solved'][index])}
                </Text>
              </View>
            ))}
          </View>

          {/* Job Price Card */}
          {jobAmount > 0 ? (
            <View
              style={[
                styles.amountBanner,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : '#F8FAFC',
                  borderColor: theme.isDark
                    ? alpha(theme.colors.brand.primary, 0.25)
                    : theme.colors.border.default,
                },
              ]}
            >
              <Text
                style={[
                  styles.amountLabel,
                  { color: theme.colors.brand.primary },
                ]}
              >
                {t('disputes.jobAmountLabel', 'Job Price')}
              </Text>
              <Text style={[styles.amountValue, { color: theme.colors.text.primary }]}>
                {formatPKR(jobAmount)}
              </Text>
              <Text style={[styles.amountHint, { color: theme.colors.text.muted }]}>
                {t('disputes.jobAmountHint', 'Taken automatically from your booking.')}
              </Text>
            </View>
          ) : null}

          {/* What Happened / Reasons Section */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
              {t('disputes.reasonLabel', 'What happened?')}
            </Text>
            <View style={styles.reasonWrap}>
              {REASONS.map((item) => {
                const active = reason === item;
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setReason(item)}
                    activeOpacity={0.75}
                    style={[
                      styles.reasonChip,
                      {
                        borderColor: active
                          ? theme.colors.brand.primary
                          : (theme.isDark ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border.default),
                        backgroundColor: active
                          ? alpha(theme.colors.brand.primary, theme.isDark ? 0.2 : 0.14)
                          : (theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        {
                          color: active ? theme.colors.brand.primary : theme.colors.text.secondary,
                          fontWeight: active ? '800' : '600',
                        },
                      ]}
                    >
                      {reasonLabel(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
              {t('disputes.descriptionLabel', 'Tell us what happened')}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('disputes.descriptionPlaceholder', 'Explain in simple words: what went wrong, how much cash was asked/paid, etc.')}
              placeholderTextColor={theme.colors.text.muted}
              multiline
              numberOfLines={4}
              style={[
                styles.input,
                {
                  color: theme.colors.text.primary,
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border.default,
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                },
              ]}
            />
            <Text style={[styles.minCharsText, { color: theme.colors.text.muted }]}>
              {t('disputes.minChars', 'At least 10 letters')} · {description.trim().length}/1000
            </Text>
          </View>

          {/* Evidence Upload Section */}
          <View style={styles.sectionWrap}>
            <TouchableOpacity
              onPress={uploadProof}
              disabled={submitting || proofImages.length >= 3}
              activeOpacity={0.75}
              style={[
                styles.uploadBtn,
                {
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border.default,
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                },
              ]}
            >
              <ImagePlus size={18} color={theme.colors.brand.primary} strokeWidth={2.2} />
              <Text style={[styles.uploadBtnText, { color: theme.colors.text.primary }]}>
                {t('disputes.addProof', 'Add Photos (Optional)')} ({proofImages.length}/3)
              </Text>
            </TouchableOpacity>

            {/* Uploaded Images Thumbnails */}
            {proofImages.length > 0 && (
              <View style={styles.thumbnailsRow}>
                {proofImages.map((uri, idx) => (
                  <View key={idx} style={[styles.thumbnailWrap, { borderColor: theme.colors.border.subtle }]}>
                    <Image source={{ uri }} style={styles.thumbnailImg} />
                    <TouchableOpacity
                      onPress={() => removeProofImage(idx)}
                      style={styles.thumbnailRemoveBtn}
                      activeOpacity={0.7}
                    >
                      <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.proofHintText, { color: theme.colors.text.muted }]}>
              {t('disputes.proofHint', 'Add photos of the work or chat screenshots if you have them.')}
            </Text>
          </View>
        </ScrollView>

        {/* Sticky Submit Footer */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
              backgroundColor: theme.isDark ? 'rgba(15, 15, 26, 0.96)' : 'rgba(255, 255, 255, 0.96)',
            },
          ]}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit
                  ? theme.colors.brand.primary
                  : (theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'),
              },
            ]}
            activeOpacity={0.82}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.button.primaryText} />
            ) : (
              <Text
                style={[
                  styles.submitBtnText,
                  {
                    color: canSubmit
                      ? theme.colors.button.primaryText
                      : theme.colors.text.muted,
                  },
                ]}
              >
                {t('disputes.submit', 'Send Complaint')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BeautifulModal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 14,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontWeight: '900',
    fontSize: 12,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountBanner: {
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 14,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  amountHint: {
    fontSize: 11.5,
    marginTop: 3,
    fontWeight: '500',
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  reasonChipText: {
    fontSize: 12,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 13.5,
    lineHeight: 19,
  },
  minCharsText: {
    fontSize: 11,
    fontWeight: '500',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  uploadBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  thumbnailWrap: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailRemoveBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  error: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
});

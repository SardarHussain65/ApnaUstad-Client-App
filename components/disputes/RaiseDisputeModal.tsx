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
import { Check, ImagePlus, Scale, ShieldCheck, X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BeautifulModal } from '../ui/BeautifulModal';
import { alpha, useTheme, useThemeColors } from '../../constants/Theme';
import { raiseDisputeRequest, uploadDisputeEvidence, type DisputeReason } from '../../hooks/queries/useDisputes';
import { queryKeys } from '../../lib/queryKeyFactory';

const REASONS: DisputeReason[] = [
  'poor_quality',
  'incomplete_work',
  'unfair_pricing',
  'no_show',
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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = description.trim().length >= 10 && !submitting && !uploadingPhotos;

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

    setUploadingPhotos(true);
    setError('');
    try {
      const uploaded = await uploadDisputeEvidence(result.assets);
      setProofImages((current) => [...current, ...uploaded].slice(0, 3));
    } catch {
      setError(t('disputes.uploadFailed', 'Could not upload proof photos. You can still submit without them.'));
    } finally {
      setUploadingPhotos(false);
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
      height={Platform.OS === 'ios' ? '76%' : '78%'}
      icon={<Scale size={24} color={theme.colors.brand.primary} strokeWidth={2.2} />}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Subtitle & Amount */}
          <View style={styles.headerContext}>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              {t('disputes.raiseSubtitle', 'Tell us what went wrong. Our team reviews both sides fairly.')}
            </Text>
            {jobAmount > 0 && (
              <View
                style={[
                  styles.amountBadge,
                  {
                    backgroundColor: alpha(theme.colors.brand.primary, theme.isDark ? 0.16 : 0.08),
                    borderColor: alpha(theme.colors.brand.primary, 0.25),
                  },
                ]}
              >
                <Text style={[styles.amountBadgeLabel, { color: theme.colors.text.muted }]}>
                  {t('disputes.jobAmountLabel', 'Job Price')}:
                </Text>
                <Text style={[styles.amountBadgeValue, { color: theme.colors.brand.primary }]}>
                  {formatPKR(jobAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Issue Selection */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
              {t('disputes.reasonLabel', 'What happened?')}
            </Text>
            <View style={styles.reasonsGrid}>
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
                          : (theme.isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border.default),
                        backgroundColor: active
                          ? alpha(theme.colors.brand.primary, theme.isDark ? 0.2 : 0.12)
                          : (theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC'),
                      },
                    ]}
                  >
                    {active && (
                      <Check size={12} color={theme.colors.brand.primary} strokeWidth={3} style={styles.checkIcon} />
                    )}
                    <Text
                      style={[
                        styles.reasonChipText,
                        {
                          color: active ? theme.colors.brand.primary : theme.colors.text.secondary,
                          fontWeight: active ? '700' : '600',
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
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
                {t('disputes.descriptionLabel', 'Tell us what happened')}
              </Text>
              <Text
                style={[
                  styles.counterText,
                  {
                    color: description.trim().length >= 10
                      ? (colors.success || '#10B981')
                      : theme.colors.text.muted,
                  },
                ]}
              >
                {description.trim().length}/1000
              </Text>
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('disputes.descriptionPlaceholder', 'Explain in simple words: what went wrong, cash paid, etc.')}
              placeholderTextColor={theme.colors.text.muted}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                {
                  color: theme.colors.text.primary,
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border.default,
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                },
              ]}
            />
          </View>

          {/* Photo Attachments (Compact & Clean) */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
                {t('disputes.proofLabel', 'Photos')}{' '}
                <Text style={styles.optionalText}>({t('common.optional', 'Optional')})</Text>
              </Text>
              <Text style={[styles.photoCounter, { color: theme.colors.text.muted }]}>
                {proofImages.length}/3
              </Text>
            </View>

            <View style={styles.photosRow}>
              {proofImages.map((uri, idx) => (
                <View key={idx} style={[styles.thumbnailWrap, { borderColor: theme.colors.border.subtle }]}>
                  <Image source={{ uri }} style={styles.thumbnailImg} />
                  <TouchableOpacity
                    onPress={() => removeProofImage(idx)}
                    style={styles.thumbnailRemoveBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={11} color="#FFFFFF" strokeWidth={2.8} />
                  </TouchableOpacity>
                </View>
              ))}

              {proofImages.length < 3 && (
                <TouchableOpacity
                  onPress={uploadProof}
                  disabled={uploadingPhotos || submitting}
                  activeOpacity={0.75}
                  style={[
                    styles.addPhotoCard,
                    {
                      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : theme.colors.border.default,
                      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                    },
                  ]}
                >
                  {uploadingPhotos ? (
                    <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                  ) : (
                    <>
                      <ImagePlus size={16} color={theme.colors.brand.primary} strokeWidth={2.2} />
                      <Text style={[styles.addPhotoText, { color: theme.colors.text.secondary }]}>
                        {proofImages.length === 0 ? t('disputes.addPhoto', 'Add Photo') : t('disputes.addMore', 'Add More')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Sticky Submit Footer */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle,
              backgroundColor: theme.isDark ? 'rgba(15, 15, 26, 0.98)' : 'rgba(255, 255, 255, 0.98)',
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

          <View style={styles.safetyRow}>
            <ShieldCheck size={12} color={theme.colors.text.muted} strokeWidth={2.2} />
            <Text style={[styles.safetyText, { color: theme.colors.text.muted }]}>
              {t('disputes.activeNoticeCompact', 'Cash payment is paused while our team reviews')}
            </Text>
          </View>
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
    paddingBottom: 12,
    gap: 14,
  },
  headerContext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 2,
  },
  headerSubtitle: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  amountBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionWrap: {
    gap: 7,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  checkIcon: {
    marginRight: 4,
  },
  reasonChipText: {
    fontSize: 12.5,
  },
  input: {
    minHeight: 84,
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 13.5,
    lineHeight: 19,
  },
  optionalText: {
    textTransform: 'none',
    fontWeight: '400',
    fontSize: 11,
  },
  photoCounter: {
    fontSize: 11,
    fontWeight: '600',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbnailWrap: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.2,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.2,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingTop: 10,
    paddingBottom: 2,
    borderTopWidth: 1,
    gap: 8,
  },
  submitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  safetyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  error: {
    color: '#FF3B30',
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },
});

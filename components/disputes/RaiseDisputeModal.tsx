import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Info, Scale } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BeautifulModal } from '../ui/BeautifulModal';
import { alpha, useTheme } from '../../constants/Theme';
import { raiseDisputeRequest, type DisputeReason } from '../../hooks/queries/useDisputes';
import { queryKeys } from '../../lib/queryKeyFactory';
import api from '../../services/api';

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
      const formData = new FormData();
      result.assets.forEach((asset, index) => {
        formData.append('images', {
          uri: asset.uri,
          name: asset.fileName || `dispute-proof-${Date.now()}-${index}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as any);
      });

      const response = await api.post('/jobs/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = response.data?.data?.imageUrls || response.data?.imageUrls || [];
      setProofImages((current) => [...current, ...uploaded].slice(0, 3));
    } catch {
      setError(t('disputes.uploadFailed', 'Could not upload proof photos. You can still submit without them.'));
    } finally {
      setSubmitting(false);
    }
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
      title={t('disputes.raiseTitle', 'Report a problem')}
      height="78%"
      icon={<Scale size={22} color={theme.colors.brand.primary} />}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.infoBox, { backgroundColor: alpha(theme.colors.brand.primary, 0.08), borderColor: alpha(theme.colors.brand.primary, 0.25) }]}>
          <Info size={16} color={theme.colors.brand.primary} />
          <Text style={[styles.infoText, { color: theme.colors.text.muted }]}>
            {t('disputes.raiseHelper', 'Tell us what went wrong. ApnaUstad will hear both sides. Cash payment stays on hold during review.')}
          </Text>
        </View>

        <View style={styles.stepsRow}>
          {['1', '2', '3'].map((step, index) => (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: alpha(theme.colors.brand.primary, 0.15), borderColor: theme.colors.brand.primary }]}>
                <Text style={{ color: theme.colors.brand.primary, fontWeight: '800', fontSize: 11 }}>{step}</Text>
              </View>
              <Text style={[styles.stepLabel, { color: theme.colors.text.dim }]}>
                {t(`disputes.step${index + 1}`, ['Report', 'Review', 'Decision'][index])}
              </Text>
            </View>
          ))}
        </View>

        {jobAmount > 0 ? (
          <View style={[styles.amountBanner, { borderColor: theme.colors.border.subtle, backgroundColor: alpha(theme.colors.surface.subtle, 0.6) }]}>
            <Text style={{ color: theme.colors.text.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              {t('disputes.jobAmountLabel', 'Job amount')}
            </Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 18, fontWeight: '900', marginTop: 2 }}>
              {formatPKR(jobAmount)}
            </Text>
            <Text style={{ color: theme.colors.text.dim, fontSize: 11, marginTop: 4 }}>
              {t('disputes.jobAmountHint', 'Taken from your booking — you do not need to enter any amount.')}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.label, { color: theme.colors.text.dim }]}>{t('disputes.reasonLabel', 'What went wrong?')}</Text>
        <View style={styles.reasonWrap}>
          {REASONS.map((item) => {
            const active = reason === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setReason(item)}
                style={[
                  styles.reasonChip,
                  {
                    borderColor: active ? theme.colors.brand.primary : alpha(theme.colors.border.subtle, 0.8),
                    backgroundColor: active ? alpha(theme.colors.brand.primary, 0.12) : alpha(theme.colors.surface.subtle, 0.5),
                  },
                ]}
              >
                <Text style={{ color: active ? theme.colors.brand.primary : theme.colors.text.primary, fontSize: 12, fontWeight: '700' }}>
                  {reasonLabel(item)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.colors.text.dim }]}>{t('disputes.descriptionLabel', 'Explain in detail')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('disputes.descriptionPlaceholder', 'What happened? When? Include dates, amounts paid in cash, and any promises made...')}
          placeholderTextColor={theme.colors.text.dim}
          multiline
          numberOfLines={5}
          style={[styles.input, { color: theme.colors.text.primary, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
        />
        <Text style={{ color: theme.colors.text.dim, fontSize: 11 }}>
          {t('disputes.minChars', 'Minimum 10 characters')} · {description.trim().length}/1000
        </Text>

        <TouchableOpacity onPress={uploadProof} disabled={submitting || proofImages.length >= 3} style={[styles.uploadBtn, { borderColor: theme.colors.border.subtle }]}>
          <ImagePlus size={18} color={theme.colors.brand.primary} />
          <Text style={{ color: theme.colors.text.primary, fontWeight: '700' }}>
            {t('disputes.addProof', 'Add photos (optional)')} ({proofImages.length}/3)
          </Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text.dim, fontSize: 11 }}>
          {t('disputes.proofHint', 'Screenshots, damaged work, or chat proof help our team decide faster.')}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: canSubmit ? theme.colors.brand.primary : alpha(theme.colors.text.dim, 0.3) }]}
        >
          {submitting ? <ActivityIndicator color={theme.colors.button.primaryText} /> : (
            <Text style={{ color: theme.colors.button.primaryText, fontWeight: '800' }}>
              {t('disputes.submit', 'Submit complaint')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </BeautifulModal>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, gap: 12 },
  infoBox: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  amountBanner: { borderWidth: 1, borderRadius: 14, padding: 14 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  input: { minHeight: 110, borderWidth: 1, borderRadius: 16, padding: 14, textAlignVertical: 'top', fontSize: 14 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 14 },
  submitBtn: { marginTop: 8, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#FF3B30', fontSize: 13 },
});

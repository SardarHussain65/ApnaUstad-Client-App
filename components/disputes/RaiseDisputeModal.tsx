import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Scale,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BeautifulModal } from '../ui/BeautifulModal';
import { alpha, useTheme, useThemeColors } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import { raiseDisputeRequest, uploadDisputeEvidence, type DisputeReason } from '../../hooks/queries/useDisputes';
import { useUpdateBookingStatusMutation } from '../../hooks/mutations/useMutations';
import { queryKeys } from '../../lib/queryKeyFactory';

type Props = {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  bookingStatus?: string;
  jobAmount?: number;
  isWorker?: boolean;
  onSubmitted: () => void;
  onCancelled?: () => void;
};

interface CancelOption {
  id: string;
  label: string;
}

const CUSTOMER_CANCEL_REASONS: CancelOption[] = [
  { id: 'no_show', label: "Ustad didn't arrive / Running late" },
  { id: 'worker_asked', label: "Ustad asked me to cancel" },
  { id: 'price_issue', label: "Disagreement on price or charges" },
  { id: 'changed_mind', label: "No longer needed / Changed mind" },
  { id: 'other', label: "Other reason" },
];

const WORKER_CANCEL_REASONS: CancelOption[] = [
  { id: 'customer_unreachable', label: "Customer not answering / unreachable" },
  { id: 'customer_asked', label: "Customer asked to cancel" },
  { id: 'price_issue', label: "Disagreement on price or work scope" },
  { id: 'wrong_location', label: "Location too far or address incorrect" },
  { id: 'vehicle_emergency', label: "Emergency or transport breakdown" },
  { id: 'other', label: "Other reason" },
];

interface ReportCategoryOption {
  id: DisputeReason;
  label: string;
}

const CUSTOMER_REPORT_CATEGORIES: ReportCategoryOption[] = [
  { id: 'poor_quality', label: 'Work quality issue' },
  { id: 'unfair_pricing', label: 'Overcharged / Extra fee' },
  { id: 'payment_issue', label: 'Cash payment problem' },
  { id: 'other', label: 'Something else' },
];

const WORKER_REPORT_CATEGORIES: ReportCategoryOption[] = [
  { id: 'payment_issue', label: 'Customer refused to pay agreed amount' },
  { id: 'unfair_pricing', label: 'Customer demands extra work without pay' },
  { id: 'poor_quality', label: 'Work dispute with customer' },
  { id: 'other', label: 'Abusive behavior or other issue' },
];

const formatPKR = (value: number) => `Rs. ${Math.round(value).toLocaleString('en-PK')}`;

export function RaiseDisputeModal({
  visible,
  onClose,
  bookingId,
  bookingStatus = 'accepted',
  jobAmount = 0,
  isWorker: propIsWorker,
  onSubmitted,
  onCancelled,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const isWorker = propIsWorker ?? (role === 'worker');

  const cancelReasons = isWorker ? WORKER_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;
  const reportCategories = isWorker ? WORKER_REPORT_CATEGORIES : CUSTOMER_REPORT_CATEGORIES;

  const canCancel = bookingStatus !== 'completed' && bookingStatus !== 'cancelled';

  // Mode: 'cancel' for cancelling booking with reason, 'report' for submitting a complaint
  const [mode, setMode] = useState<'cancel' | 'report'>(canCancel ? 'cancel' : 'report');

  // Cancel state
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>(
    isWorker ? 'customer_unreachable' : 'no_show'
  );
  const [cancelNote, setCancelNote] = useState('');

  // Report state
  const [reportCategory, setReportCategory] = useState<DisputeReason>(
    isWorker ? 'payment_issue' : 'poor_quality'
  );
  const [description, setDescription] = useState('');
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedCancelReason(isWorker ? 'customer_unreachable' : 'no_show');
    setReportCategory(isWorker ? 'payment_issue' : 'poor_quality');
  }, [isWorker]);

  const { mutate: updateBookingStatus, isPending: isCancelling } = useUpdateBookingStatusMutation();

  const canSubmitReport = description.trim().length >= 10 && !submitting && !uploadingPhotos && !isCancelling;

  const getCancelReasonLabel = (id: string, defaultLabel: string) => {
    return isWorker
      ? t(`disputes.cancelReasonsWorker.${id}`, defaultLabel)
      : t(`disputes.cancelReasons.${id}`, defaultLabel);
  };

  const getReportCategoryLabel = (id: string, defaultLabel: string) => {
    return isWorker
      ? t(`disputes.reportCategoriesWorker.${id}`, defaultLabel)
      : t(`disputes.reportCategories.${id}`, defaultLabel);
  };

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

  const handleConfirmCancel = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const selectedItem = cancelReasons.find((r) => r.id === selectedCancelReason);
    const actorPrefix = isWorker ? 'Ustad: ' : 'Customer: ';
    const reasonText = selectedCancelReason === 'other' && cancelNote.trim()
      ? `${actorPrefix}${cancelNote.trim()}`
      : `${actorPrefix}${selectedItem?.label || 'Cancelled'}`;

    const confirmMsg = isWorker
      ? t('disputes.confirmCancelMsgWorker', 'Are you sure you want to cancel this booking? Your commission hold will be refunded back to your wallet.')
      : t('disputes.confirmCancelMsg', 'Are you sure you want to cancel this booking? If the Ustad hasn’t arrived, no fee will be charged.');

    Alert.alert(
      t('disputes.confirmCancelTitle', 'Cancel Booking?'),
      confirmMsg,
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('disputes.yesCancel', 'Yes, Cancel Booking'),
          style: 'destructive',
          onPress: () => {
            setError('');
            updateBookingStatus(
              {
                bookingId,
                status: 'cancelled',
                cancelReason: reasonText,
              },
              {
                onSuccess: () => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) });
                  queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
                  queryClient.invalidateQueries({ queryKey: queryKeys.bookings.myBookings() });
                  Toast.show({
                    type: 'info',
                    text1: t('disputes.bookingCancelledTitle', 'Booking Cancelled'),
                    text2: t('disputes.bookingCancelledMsg', 'Your booking has been cancelled.'),
                  });
                  onCancelled?.();
                  onClose();
                },
                onError: (err: any) => {
                  setError(err?.response?.data?.message || err?.message || t('disputes.cancelFailed', 'Could not cancel booking.'));
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleSubmitDispute = async () => {
    if (!canSubmitReport) return;
    setSubmitting(true);
    setError('');
    try {
      await raiseDisputeRequest({
        bookingId,
        reason: reportCategory,
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
      title={t('disputes.raiseTitle', 'Help & Support')}
      height={Platform.OS === 'ios' ? '80%' : '82%'}
      icon={<Scale size={24} color={theme.colors.brand.primary} strokeWidth={2.2} />}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Segmented Mode Switch (Cancel Booking vs Report Issue) */}
        {canCancel && (
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                void Haptics.selectionAsync();
                setMode('cancel');
                setError('');
              }}
              style={[
                styles.tabItem,
                mode === 'cancel' && {
                  backgroundColor: theme.isDark ? '#EF4444' : '#DC2626',
                  shadowColor: '#EF4444',
                  shadowOpacity: 0.35,
                  shadowRadius: 5,
                  elevation: 3,
                },
              ]}
              activeOpacity={0.8}
            >
              <XCircle
                size={15}
                color={mode === 'cancel' ? '#FFFFFF' : theme.colors.text.muted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.tabItemText,
                  {
                    color: mode === 'cancel' ? '#FFFFFF' : theme.colors.text.secondary,
                    fontWeight: mode === 'cancel' ? '800' : '600',
                  },
                ]}
              >
                {t('disputes.tabCancel', 'Cancel Booking')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void Haptics.selectionAsync();
                setMode('report');
                setError('');
              }}
              style={[
                styles.tabItem,
                mode === 'report' && {
                  backgroundColor: theme.colors.brand.primary,
                  shadowColor: theme.colors.brand.primary,
                  shadowOpacity: 0.35,
                  shadowRadius: 5,
                  elevation: 3,
                },
              ]}
              activeOpacity={0.8}
            >
              <AlertTriangle
                size={15}
                color={mode === 'report' ? '#FFFFFF' : theme.colors.text.muted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.tabItemText,
                  {
                    color: mode === 'report' ? '#FFFFFF' : theme.colors.text.secondary,
                    fontWeight: mode === 'report' ? '800' : '600',
                  },
                ]}
              >
                {t('disputes.tabReport', 'Report Issue')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Description & Job Price Badge */}
          <View style={styles.headerInfoBlock}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerHeading, { color: theme.colors.text.primary }]}>
                {mode === 'cancel'
                  ? t('disputes.cancelHeader', 'Why are you cancelling?')
                  : t('disputes.reportHeader', 'What went wrong?')}
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
                  <Text style={[styles.amountBadgeValue, { color: theme.colors.brand.primary }]}>
                    {formatPKR(jobAmount)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              {mode === 'cancel'
                ? (isWorker
                    ? t('disputes.cancelSubWorker', 'Select a reason below. Your commission hold will be refunded.')
                    : t('disputes.cancelSub', 'Select a reason below. If the Ustad hasn\'t arrived, no fee will apply.'))
                : t('disputes.reportSub', 'Our support team will review your report and ensure fair mediation.')}
            </Text>
          </View>

          {/* ─────── MODE 1: CANCEL BOOKING ─────── */}
          {mode === 'cancel' && (
            <View style={styles.sectionWrap}>
              <View style={styles.reasonsList}>
                {cancelReasons.map((item) => {
                  const selected = selectedCancelReason === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setSelectedCancelReason(item.id);
                      }}
                      activeOpacity={0.75}
                      style={[
                        styles.reasonCard,
                        {
                          borderColor: selected
                            ? (colors.error || '#EF4444')
                            : (theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle),
                          backgroundColor: selected
                            ? (theme.isDark ? alpha('#EF4444', 0.12) : '#FEF2F2')
                            : (theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF'),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: selected ? (colors.error || '#EF4444') : theme.colors.text.muted,
                            backgroundColor: selected ? (colors.error || '#EF4444') : 'transparent',
                          },
                        ]}
                      >
                        {selected && <View style={styles.radioDot} />}
                      </View>
                      <Text
                        style={[
                          styles.reasonCardText,
                          {
                            color: selected ? (colors.error || '#EF4444') : theme.colors.text.primary,
                            fontWeight: selected ? '700' : '500',
                          },
                        ]}
                      >
                        {getCancelReasonLabel(item.id, item.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedCancelReason === 'other' && (
                <TextInput
                  value={cancelNote}
                  onChangeText={setCancelNote}
                  placeholder={t('disputes.otherReasonPlaceholder', 'Tell us more details (optional)...')}
                  placeholderTextColor={theme.colors.text.muted}
                  style={[
                    styles.noteInput,
                    {
                      color: theme.colors.text.primary,
                      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border.default,
                      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                    },
                  ]}
                />
              )}
            </View>
          )}

          {/* ─────── MODE 2: REPORT ISSUE ─────── */}
          {mode === 'report' && (
            <View style={{ gap: 14 }}>
              {/* Category Chips */}
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
                  {t('disputes.categoryLabel', 'Select Problem Type')}
                </Text>
                <View style={styles.categoryGrid}>
                  {reportCategories.map((cat) => {
                    const selected = reportCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setReportCategory(cat.id);
                        }}
                        activeOpacity={0.75}
                        style={[
                          styles.catChip,
                          {
                            borderColor: selected
                              ? theme.colors.brand.primary
                              : (theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.border.subtle),
                            backgroundColor: selected
                              ? alpha(theme.colors.brand.primary, theme.isDark ? 0.2 : 0.1)
                              : (theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC'),
                          },
                        ]}
                      >
                        {selected && (
                          <Check size={12} color={theme.colors.brand.primary} strokeWidth={3} style={{ marginRight: 4 }} />
                        )}
                        <Text
                          style={[
                            styles.catChipText,
                            {
                              color: selected ? theme.colors.brand.primary : theme.colors.text.secondary,
                              fontWeight: selected ? '700' : '500',
                            },
                          ]}
                        >
                          {getReportCategoryLabel(cat.id, cat.label)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.colors.text.secondary }]}>
                    {t('disputes.descriptionLabel', 'Details')}
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
                    {description.trim().length}/1000{description.trim().length < 10 ? ' (min 10)' : ''}
                  </Text>
                </View>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={
                    isWorker
                      ? t('disputes.descriptionPlaceholderWorker', 'Describe what happened with the customer (payment, work scope, misconduct)...')
                      : t('disputes.descriptionPlaceholder', 'Explain in simple words: what went wrong, cash paid, quality issue, etc.')
                  }
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

              {/* Photo Attachments */}
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
                      disabled={uploadingPhotos || submitting || isCancelling}
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
            </View>
          )}
        </ScrollView>

        {/* ─────── STICKY FOOTER ─────── */}
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

          {mode === 'cancel' ? (
            <TouchableOpacity
              onPress={handleConfirmCancel}
              disabled={isCancelling}
              style={[
                styles.submitBtn,
                { backgroundColor: colors.error || '#EF4444' },
              ]}
              activeOpacity={0.82}
            >
              {isCancelling ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {t('disputes.confirmCancelBtn', 'Confirm & Cancel Booking')}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              disabled={!canSubmitReport}
              onPress={handleSubmitDispute}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: canSubmitReport
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
                      color: canSubmitReport
                        ? theme.colors.button.primaryText
                        : theme.colors.text.muted,
                    },
                  ]}
                >
                  {t('disputes.submit', 'Send Complaint')}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.safetyRow}>
            <ShieldCheck size={12} color={theme.colors.text.muted} strokeWidth={2.2} />
            <Text style={[styles.safetyText, { color: theme.colors.text.muted }]}>
              {mode === 'cancel'
                ? (isWorker
                    ? t('disputes.noFeeNoteWorker', 'Commission hold will be refunded to your wallet')
                    : t('disputes.noFeeNote', 'No cancellation fee if Ustad has not arrived'))
                : t('disputes.activeNoticeCompact', 'Cash payment is paused while our team reviews')}
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
  tabBar: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  tabItemText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 12,
    gap: 12,
  },
  headerInfoBlock: {
    gap: 3,
    marginBottom: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerHeading: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16.5,
    fontWeight: '500',
  },
  amountBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  amountBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionWrap: {
    gap: 7,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  reasonsList: {
    gap: 8,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  radioCircle: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  reasonCardText: {
    fontSize: 13,
    flex: 1,
  },
  noteInput: {
    height: 44,
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catChipText: {
    fontSize: 12.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
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
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
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

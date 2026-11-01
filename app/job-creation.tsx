import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  Mic,
  Square,
  Trash2,
  Camera,
  X,
  Target,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingStatus,
} from 'expo-audio';
import { useTranslation } from 'react-i18next';

import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { AlertModal, ConfirmModal } from '../components/ui';
import { useConfirmModal, useCreateJobMutation, useToast, useUploadJobImagesMutation } from '../hooks';
import { useTheme, alpha } from '../constants/Theme';
import { useJobCreationPalette } from '../components/job-creation/shared';
import { SchedulePickerModal } from '../components/job-creation/SchedulePickerModal';
import { calculateUrgentPrice, getRateForCategory } from '../constants/UrgentPricing';

// ─── Types & Constants ────────────────────────────────────────────────────────

type Urgency = 'instant' | 'scheduled';
type EvidenceAsset = { uri: string; type: 'image' | 'video' };

const CATEGORY_QUICK_CHIPS: Record<string, string[]> = {
  'AC & Appliances': ['Not cooling', 'Gas refill', 'Water leaking', 'Noisy unit', 'Compressor issue'],
  'AC Technician': ['Not cooling', 'Gas refill', 'Water leaking', 'Noisy unit', 'Compressor issue'],
  'Electrician': ['Short circuit', 'Switch replacement', 'Fan installation', 'Wiring issue', 'UPS problem'],
  'Plumber': ['Pipe leaking', 'Tap replacement', 'Drain blockage', 'Water motor', 'Sanitary fitting'],
  'Carpenter': ['Door lock repair', 'Hinge repair', 'Furniture assembly', 'Wood polish', 'Cabinet fixing'],
  'Painter': ['Wall touchup', 'Full room paint', 'Ceiling dampness', 'Door paint', 'Exterior wall'],
  'Cleaner': ['Deep home cleaning', 'Sofa & carpet wash', 'Kitchen cleaning', 'Water tank', 'Bathroom wash'],
  'Mason': ['Tile fixing', 'Plaster repair', 'Wall crack', 'Roof seepage', 'Marble grinding'],
  'Welder': ['Gate repair', 'Grill fixing', 'Railing welding', 'Sheet repair', 'Window frame'],
  'Solar Panel Services': ['Panel cleaning', 'Inverter issue', 'Wiring inspection', 'Battery check', 'Capacity test'],
};

const DEFAULT_QUICK_CHIPS = ['Not working', 'Inspection needed', 'Replacement', 'Emergency fix'];

const formatCleanAddress = (rawAddress: string) => {
  if (!rawAddress) return '';
  const cleaned = rawAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '').trim();
  return cleaned || rawAddress;
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function JobCreationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const palette = useJobCreationPalette();
  const theme = useTheme();
  const { success, error: showError } = useToast();

  const {
    visible: confirmVisible,
    showConfirm,
    closeConfirm,
    isLoading: isConfirming,
    setLoading: setConfirmLoading,
  } = useConfirmModal();

  const {
    title,
    color,
    initialDescription,
    targetWorkerId,
    targetWorkerName,
    urgency: urgencyParam,
  } = useLocalSearchParams<{
    title?: string;
    color?: string;
    initialDescription?: string;
    targetWorkerId?: string;
    targetWorkerName?: string;
    urgency?: Urgency;
  }>();

  const categoryName = title ?? 'AC & Appliances';
  const isDark = theme.isDark;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [urgency, setUrgency] = useState<Urgency>((urgencyParam as Urgency) || 'instant');
  const [description, setDescription] = useState<string>(initialDescription ?? '');
  const [amount, setAmount] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [selectedMedia, setSelectedMedia] = useState<EvidenceAsset[]>([]);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);

  // Location state
  const [address, setAddress] = useState<string>('Detecting location...');
  const [latitude, setLatitude] = useState<number>(33.6927);
  const [longitude, setLongitude] = useState<number>(73.0743);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [tempAddressInput, setTempAddressInput] = useState<string>('');

  // Scheduled date & time state
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'custom'>('tomorrow');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 86_400_000));
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 AM');
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);

  // Modals state
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const isInstant = urgency === 'instant';
  const activeColor = isInstant ? '#2DD4BF' : '#FB923C';

  // Rate calculations
  const rateInfo = useMemo(() => getRateForCategory(categoryName), [categoryName]);
  const baseRate = rateInfo.baseRatePerHour;
  const fixedPrice = useMemo(() => calculateUrgentPrice(categoryName, estimatedHours), [categoryName, estimatedHours]);

  // Quick chips
  const quickChips = useMemo(() => CATEGORY_QUICK_CHIPS[categoryName] || DEFAULT_QUICK_CHIPS, [categoryName]);

  // ─── Audio Recorder ─────────────────────────────────────────────────────────
  const handleRecordingStatus = useCallback((status: RecordingStatus) => {
    if (status.isFinished && status.url) {
      setVoiceNoteUri(status.url);
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
  }, []);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, handleRecordingStatus);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const isRecording = recorderState.isRecording;
  const voiceDurationMillis = recorderState.durationMillis;
  const voiceSeconds = Math.max(0, Math.floor(voiceDurationMillis / 1000));
  const voiceTimerText = `${Math.floor(voiceSeconds / 60)}:${String(voiceSeconds % 60).padStart(2, '0')}`;

  const startVoiceNote = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showError('Microphone Required', 'Allow microphone access to record a voice note.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record({ forDuration: 60 });
      setVoiceNoteUri(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      showError('Recording Failed', error instanceof Error ? error.message : 'Could not start recording.');
    }
  }, [audioRecorder, showError]);

  const stopVoiceNote = useCallback(async () => {
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      setVoiceNoteUri(audioRecorder.uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showError('Recording Failed', error instanceof Error ? error.message : 'Could not save recording.');
    }
  }, [audioRecorder, showError]);

  // ─── Location Fetcher ───────────────────────────────────────────────────────
  const handleGetLiveLocation = useCallback(async (silent = false) => {
    try {
      setIsGettingLocation(true);
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        if (!silent) showError('Permission Denied', 'Location permission is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      setLatitude(lat);
      setLongitude(lng);

      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const geo = results[0];
        const name = geo.name && geo.name !== geo.city ? geo.name : null;
        const street = geo.street ? geo.street : null;
        const area = name || street;
        const city = geo.city ?? geo.subregion ?? '';
        const resolved = area ? `${area}, ${city}` : city;
        const clean = formatCleanAddress(resolved);
        setAddress(clean);
        setTempAddressInput(clean);
      }
      if (!silent) success('Location Updated', 'Position updated to your current location.');
    } catch (e) {
      if (!silent && e instanceof Error) {
        showError('Location Error', e.message || 'Failed to acquire location.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  }, [showError, success]);

  // Run location fetch ONLY ONCE on mount
  useEffect(() => {
    void handleGetLiveLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Media Picker ──────────────────────────────────────────────────────────
  const pickMedia = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('Permission Needed', 'Please allow photo access in settings to attach pictures.');
        return;
      }
      const remainingSlots = Math.max(1, 5 - selectedMedia.length);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        aspect: [16, 9],
        quality: 0.65,
        videoMaxDuration: 45,
      });
      if (!result.canceled && result.assets.length > 0) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const nextAssets: EvidenceAsset[] = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
        }));
        setSelectedMedia((prev) => [...prev, ...nextAssets].slice(0, 5));
      }
    } catch {
      showError('Media Error', 'Could not open media library.');
    }
  }, [selectedMedia.length, showError]);

  const removeMedia = useCallback((indexToRemove: number) => {
    setSelectedMedia((current) => current.filter((_, index) => index !== indexToRemove));
    void Haptics.selectionAsync();
  }, []);

  // ─── Quick Chip Toggle ─────────────────────────────────────────────────────
  const handleToggleChip = useCallback((chip: string) => {
    void Haptics.selectionAsync();
    const hasChip = description.toLowerCase().includes(chip.toLowerCase());
    if (hasChip) {
      const regex = new RegExp(`(^|,\\s*)${chip}`, 'i');
      const updated = description.replace(regex, '').replace(/^,\s*/, '').trim();
      setDescription(updated);
    } else {
      if (!description.trim()) {
        setDescription(chip);
      } else {
        setDescription(`${description.trim()}, ${chip}`);
      }
    }
  }, [description]);

  // ─── Date & Time Selection ─────────────────────────────────────────────────
  const handleSelectDateOption = useCallback((option: 'today' | 'tomorrow' | 'custom') => {
    void Haptics.selectionAsync();
    setSelectedDateOption(option);
    if (option === 'today') {
      setScheduledDate(new Date());
    } else if (option === 'tomorrow') {
      setScheduledDate(new Date(Date.now() + 86400000));
    } else {
      setShowPickerModal(true);
    }
  }, []);

  const handleSelectTimeSlot = useCallback((slot: string) => {
    void Haptics.selectionAsync();
    setSelectedTimeSlot(slot);
    if (slot === '10:00 AM') setScheduledTime('10:00');
    else if (slot === '2:00 PM') setScheduledTime('14:00');
    else if (slot === '6:00 PM') setScheduledTime('18:00');
  }, []);

  const handleCustomScheduleSave = useCallback((date: Date, time: string) => {
    setScheduledDate(date);
    setScheduledTime(time);
    setSelectedDateOption('custom');
    setSelectedTimeSlot(time);
    setShowPickerModal(false);
  }, []);

  // ─── Submit Mutation ───────────────────────────────────────────────────────
  const { mutate: createJob, isPending: isSubmittingJob } = useCreateJobMutation();
  const { mutateAsync: uploadImages } = useUploadJobImagesMutation();
  const isSubmitting = isSubmittingJob || isConfirming;

  const handlePostJob = useCallback(() => {
    if (description.trim().length < 5) {
      showError(t('jobCreation.descTooShortTitle', 'Add More Details'), t('jobCreation.descTooShortDesc', 'Please describe the problem or pick a quick tag above.'));
      return;
    }
    if (!address.trim() || address.includes('Detecting')) {
      showError(t('jobCreation.invalidLocation', 'Address Needed'), t('jobCreation.invalidLocationDesc', 'Please tap Change to enter your address or refresh GPS.'));
      return;
    }

    const priceText = isInstant ? `Rs. ${fixedPrice.toLocaleString()}` : (amount ? `Rs. ${amount}` : 'Open to offers');
    showConfirm(
      isInstant ? t('jobCreation.postUrgentTitle', 'Confirm Urgent Job') : t('jobCreation.postServiceTitle', 'Post Job Request'),
      isInstant
        ? t('jobCreation.postUrgentConfirm', { price: fixedPrice.toLocaleString() })
        : t('jobCreation.postServiceConfirm', 'Your request will be sent to nearby Ustads so they can bid their rates.'),
      handleConfirmSubmit,
      closeConfirm,
      isInstant ? `Find Ustad - ${priceText}` : 'Post Request',
      t('jobCreation.keepEditing', 'Go Back'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, address, isInstant, fixedPrice, amount, t]);

  const handleConfirmSubmit = useCallback(async () => {
    setConfirmLoading(true);
    try {
      let uploadedImageUrls: string[] = [];
      let uploadedVideoUrls: string[] = [];
      let uploadedAudioUrls: string[] = [];

      if (selectedMedia.length > 0 || voiceNoteUri) {
        const formData = new FormData();
        selectedMedia.forEach((asset, i) => {
          const filename = asset.uri.split('/').pop() ?? `${asset.type}_${i}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
          const ext = /\.(\w+)$/.exec(filename);
          const subtype = ext?.[1]?.toLowerCase();
          const normalizedImageSubtype = subtype === 'jpg' ? 'jpeg' : subtype;
          const type = asset.type === 'video'
            ? subtype === 'mov'
              ? 'video/quicktime'
              : `video/${subtype || 'mp4'}`
            : `image/${normalizedImageSubtype || 'jpeg'}`;
          formData.append('images', {
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
            name: filename,
            type,
          } as unknown as Blob);
        });

        if (voiceNoteUri) {
          const filename = voiceNoteUri.split('/').pop() ?? 'job-voice-note.m4a';
          formData.append('images', {
            uri: Platform.OS === 'ios' ? voiceNoteUri.replace('file://', '') : voiceNoteUri,
            name: filename,
            type: 'audio/m4a',
          } as unknown as Blob);
        }

        const response = await uploadImages(formData);
        uploadedImageUrls = response.imageUrls ?? [];
        uploadedVideoUrls = response.videoUrls ?? [];
        uploadedAudioUrls = response.audioUrls ?? [];
      }

      const clientOffer = amount && Number(amount) > 0 ? parseFloat(amount) : 0;
      const finalPrice = isInstant ? fixedPrice : clientOffer;

      const payload = {
        category: categoryName,
        description,
        urgency,
        address,
        amount: finalPrice,
        estimatedHours: isInstant ? estimatedHours : undefined,
        imageUrls: uploadedImageUrls,
        videoUrls: uploadedVideoUrls,
        audioUrls: uploadedAudioUrls,
        longitude,
        latitude,
        targetWorkerId,
        scheduledDate: !isInstant ? scheduledDate : undefined,
        scheduledTime: !isInstant ? scheduledTime : undefined,
      };

      createJob(payload, {
        onSuccess: (response) => {
          setConfirmLoading(false);
          closeConfirm();
          setCreatedJobId(response._id as string);
          setShowSuccessModal(true);
        },
        onError: (err: Error) => {
          setConfirmLoading(false);
          showError(t('jobCreation.requestFailed', 'Could Not Send Request'), err.message || 'Something went wrong.');
        },
      });
    } catch (err) {
      setConfirmLoading(false);
      showError(t('jobCreation.uploadFailed', 'Upload Failed'), err instanceof Error ? err.message : 'Media upload failed.');
    }
  }, [
    selectedMedia,
    voiceNoteUri,
    uploadImages,
    categoryName,
    description,
    urgency,
    address,
    isInstant,
    fixedPrice,
    amount,
    estimatedHours,
    longitude,
    latitude,
    targetWorkerId,
    scheduledDate,
    scheduledTime,
    createJob,
    closeConfirm,
    showError,
    setConfirmLoading,
    t,
  ]);

  const handleSuccessModalDismiss = useCallback(() => {
    setShowSuccessModal(false);
    router.push({ pathname: '/finding-worker', params: { jobId: createdJobId } });
  }, [createdJobId, router]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safe}>
        {/* ── 1. Top Minimal Header: Back Arrow + Category Title ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: palette.border }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft color={palette.textPrimary} size={20} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── 2. Mode Selector Pill Toggle ── */}
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.modePill,
                  isInstant
                    ? [styles.modePillActive, { backgroundColor: '#2DD4BF', borderColor: '#2DD4BF' }]
                    : [styles.modePillInactive, { borderColor: palette.border }]
                ]}
                onPress={() => {
                  setUrgency('instant');
                  void Haptics.selectionAsync();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modePillText, isInstant ? styles.modePillTextActive : { color: palette.textSecondary }]}>
                  Urgent - Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modePill,
                  !isInstant
                    ? [styles.modePillActive, { backgroundColor: '#FB923C', borderColor: '#FB923C' }]
                    : [styles.modePillInactive, { borderColor: palette.border }]
                ]}
                onPress={() => {
                  setUrgency('scheduled');
                  void Haptics.selectionAsync();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modePillText, !isInstant ? styles.modePillTextActive : { color: palette.textSecondary }]}>
                  Book later
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── 3. Section: What needs fixing? ── */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                {t('jobCreation.whatNeedsFixing', 'What needs fixing?')}
              </Text>

              {/* Text Card with Embedded Mic Button */}
              <View style={[styles.inputCard, { borderColor: palette.border }]} collapsable={false}>
                <TextInput
                  style={[styles.textArea, { color: palette.textPrimary }]}
                  placeholder={t('jobCreation.describePlaceholder', 'Describe the problem...')}
                  placeholderTextColor={palette.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                />

                <View style={styles.inputCardBottomRow}>
                  {voiceNoteUri ? (
                    <View style={[styles.voiceStatusPill, { backgroundColor: alpha(activeColor, 0.12), borderColor: alpha(activeColor, 0.3) }]}>
                      <Mic size={13} color={activeColor} strokeWidth={2.5} />
                      <Text style={[styles.voiceStatusText, { color: activeColor }]}>
                        Voice note attached
                      </Text>
                      <TouchableOpacity onPress={() => setVoiceNoteUri(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Trash2 size={13} color="#FF6B63" />
                      </TouchableOpacity>
                    </View>
                  ) : isRecording ? (
                    <View style={styles.recordingStatusWrap}>
                      <View style={styles.pulseDotRed} />
                      <Text style={styles.recordingTimerText}>
                        {voiceTimerText} / 1:00
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}

                  <TouchableOpacity
                    style={[
                      styles.micCircleBtn,
                      { backgroundColor: isRecording ? '#EF4444' : activeColor }
                    ]}
                    onPress={isRecording ? stopVoiceNote : (voiceNoteUri ? () => setVoiceNoteUri(null) : startVoiceNote)}
                    activeOpacity={0.8}
                  >
                    {isRecording ? (
                      <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
                    ) : (
                      <Mic size={18} color="#001014" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Problem Tag Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickChipsScroll}
              >
                {quickChips.map((chip) => {
                  const isChipActive = description.toLowerCase().includes(chip.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={chip}
                      style={[
                        styles.quickChip,
                        { borderColor: isChipActive ? activeColor : palette.border },
                        isChipActive && { backgroundColor: alpha(activeColor, 0.15) }
                      ]}
                      onPress={() => handleToggleChip(chip)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          { color: isChipActive ? activeColor : palette.textSecondary },
                          isChipActive && { fontWeight: '700' }
                        ]}
                      >
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── 4. Service Location Card ── */}
            <View style={styles.sectionWrap}>
              <View style={[styles.locationCard, { borderColor: palette.border }]}>
                <View style={[styles.locationIconWrap, { backgroundColor: alpha(activeColor, 0.14) }]}>
                  <MapPin size={18} color={activeColor} strokeWidth={2.3} />
                </View>

                <View style={styles.locationDetails}>
                  <Text style={[styles.locationAddressText, { color: palette.textPrimary }]} numberOfLines={1}>
                    {formatCleanAddress(address) || 'Detecting location...'}
                  </Text>
                  <Text style={[styles.locationSubText, { color: palette.textSecondary }]}>
                    {t('jobCreation.serviceLocationSub', 'Service location')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.locationChangeBtn}
                  onPress={() => {
                    setTempAddressInput(address);
                    setShowLocationModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.locationChangeBtnText, { color: activeColor }]}>
                    {t('common.change', 'Change')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── 5. Mode Dependent Details ── */}
            {isInstant ? (
              /* Urgent - Now Details (Hours needed & Fixed price) */
              <View style={styles.sectionWrap}>
                <View style={[styles.pricingCard, { borderColor: palette.border }]}>
                  {/* Hours needed row */}
                  <View style={styles.hoursRow}>
                    <View>
                      <Text style={[styles.hoursTitle, { color: palette.textPrimary }]}>
                        {t('jobCreation.hoursNeeded', 'Hours needed')}
                      </Text>
                      <Text style={[styles.hoursRateSub, { color: palette.textSecondary }]}>
                        {t('jobCreation.hoursRate', 'Rs. {{rate}} / hour', { rate: baseRate })}
                      </Text>
                    </View>

                    <View style={[styles.stepperContainer, { borderColor: palette.border }]}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, estimatedHours <= 1 && styles.stepperBtnDisabled]}
                        onPress={() => {
                          if (estimatedHours > 1) {
                            setEstimatedHours((h) => h - 1);
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        }}
                        disabled={estimatedHours <= 1}
                      >
                        <Text style={[styles.stepperBtnText, { color: palette.textPrimary }]}>-</Text>
                      </TouchableOpacity>

                      <Text style={[styles.stepperValText, { color: palette.textPrimary }]}>
                        {estimatedHours}
                      </Text>

                      <TouchableOpacity
                        style={[styles.stepperBtn, estimatedHours >= 8 && styles.stepperBtnDisabled]}
                        onPress={() => {
                          if (estimatedHours < 8) {
                            setEstimatedHours((h) => h + 1);
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        }}
                        disabled={estimatedHours >= 8}
                      >
                        <Text style={[styles.stepperBtnText, { color: palette.textPrimary }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: palette.border }]} />

                  {/* Fixed price row */}
                  <View style={styles.fixedPriceRow}>
                    <View style={styles.fixedPriceLeft}>
                      <Text style={[styles.fixedPriceTitle, { color: palette.textPrimary }]}>
                        {t('jobCreation.fixedPriceLabel', 'Fixed price')}
                      </Text>
                      <Text style={[styles.fixedPriceSub, { color: palette.textSecondary }]}>
                        {t('jobCreation.fixedPriceGuarantee', "First Ustad to accept is hired. Price can't change.")}
                      </Text>
                    </View>

                    <Text style={[styles.fixedPriceAmount, { color: '#2DD4BF' }]}>
                      Rs. {fixedPrice.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Book later Details (When date/time & Your budget) */
              <>
                {/* When? (Schedule) */}
                <View style={styles.sectionWrap}>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                    {t('jobCreation.whenLabel', 'When?')}
                  </Text>

                  {/* Date pills */}
                  <View style={styles.pillRow}>
                    <TouchableOpacity
                      style={[
                        styles.chipPill,
                        selectedDateOption === 'today'
                          ? [styles.chipPillActive, { backgroundColor: '#FB923C', borderColor: '#FB923C' }]
                          : [styles.chipPillInactive, { borderColor: palette.border }]
                      ]}
                      onPress={() => handleSelectDateOption('today')}
                    >
                      <Text style={[styles.chipPillText, selectedDateOption === 'today' ? styles.chipPillTextActive : { color: palette.textSecondary }]}>
                        {t('jobCreation.today', 'Today')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.chipPill,
                        selectedDateOption === 'tomorrow'
                          ? [styles.chipPillActive, { backgroundColor: '#FB923C', borderColor: '#FB923C' }]
                          : [styles.chipPillInactive, { borderColor: palette.border }]
                      ]}
                      onPress={() => handleSelectDateOption('tomorrow')}
                    >
                      <Text style={[styles.chipPillText, selectedDateOption === 'tomorrow' ? styles.chipPillTextActive : { color: palette.textSecondary }]}>
                        {t('jobCreation.tomorrow', 'Tomorrow')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.chipPill,
                        selectedDateOption === 'custom'
                          ? [styles.chipPillActive, { backgroundColor: '#FB923C', borderColor: '#FB923C' }]
                          : [styles.chipPillInactive, { borderColor: palette.border }]
                      ]}
                      onPress={() => setShowPickerModal(true)}
                    >
                      <Text style={[styles.chipPillText, selectedDateOption === 'custom' ? styles.chipPillTextActive : { color: palette.textSecondary }]}>
                        {selectedDateOption === 'custom' ? scheduledDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : t('jobCreation.pickDate', 'Pick date')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Time pills */}
                  <View style={[styles.pillRow, { marginTop: 10 }]}>
                    {['10:00 AM', '2:00 PM', '6:00 PM'].map((slot) => {
                      const isSelected = selectedTimeSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.chipPill,
                            isSelected
                              ? [styles.chipPillActive, { backgroundColor: '#FB923C', borderColor: '#FB923C' }]
                              : [styles.chipPillInactive, { borderColor: palette.border }]
                          ]}
                          onPress={() => handleSelectTimeSlot(slot)}
                        >
                          <Text style={[styles.chipPillText, isSelected ? styles.chipPillTextActive : { color: palette.textSecondary }]}>
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Your budget */}
                <View style={styles.sectionWrap}>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                    {t('jobCreation.yourBudgetLabel', 'Your budget')}
                  </Text>

                  <View style={[styles.budgetInputCard, { borderColor: palette.border }]}>
                    <Text style={[styles.budgetCurrencyLabel, { color: palette.textSecondary }]}>PKR</Text>
                    <TextInput
                      style={[styles.budgetTextInput, { color: palette.textPrimary }]}
                      placeholder={t('jobCreation.openToOffers', 'Open to offers')}
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                    />
                  </View>

                  <View style={styles.budgetChipsRow}>
                    {['500', '1000', '2000'].map((amt) => {
                      const isSelected = amount === amt;
                      return (
                        <TouchableOpacity
                          key={amt}
                          style={[
                            styles.budgetChipBtn,
                            { borderColor: isSelected ? '#FB923C' : palette.border },
                            isSelected && { backgroundColor: alpha('#FB923C', 0.15) }
                          ]}
                          onPress={() => {
                            setAmount(isSelected ? '' : amt);
                            void Haptics.selectionAsync();
                          }}
                        >
                          <Text style={[styles.budgetChipText, { color: isSelected ? '#FB923C' : palette.textSecondary }, isSelected && { fontWeight: '700' }]}>
                            Rs. {Number(amt).toLocaleString()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* ── 6. Photos or Video (Optional) ── */}
            <View style={styles.sectionWrap}>
              <TouchableOpacity
                style={[styles.photoCard, { borderColor: palette.border }]}
                onPress={pickMedia}
                activeOpacity={0.8}
              >
                <View style={[styles.photoIconBox, { backgroundColor: alpha(palette.textSecondary, 0.12) }]}>
                  <Camera size={18} color={palette.textSecondary} strokeWidth={2} />
                </View>
                <Text style={[styles.photoCardText, { color: palette.textSecondary }]}>
                  {selectedMedia.length > 0
                    ? `${selectedMedia.length}/5 files attached (Tap to add more)`
                    : t('jobCreation.addPhotosOrVideo', 'Add photos or a short video (optional)')}
                </Text>
              </TouchableOpacity>

              {/* Thumbnails preview */}
              {selectedMedia.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsScroll}>
                  {selectedMedia.map((asset, index) => (
                    <View key={index} style={styles.thumbWrapper}>
                      <Image source={{ uri: asset.uri }} style={styles.thumbImage} />
                      <TouchableOpacity
                        style={styles.thumbRemoveBtn}
                        onPress={() => removeMedia(index)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <X size={11} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </ScrollView>

          {/* ── 7. Clean Full-Width Sticky Bottom Button ── */}
          <View
            style={[
              styles.stickyFooter,
              {
                backgroundColor: isDark ? 'rgba(8,12,24,0.96)' : 'rgba(255,255,255,0.96)',
                borderTopColor: palette.border,
                paddingBottom: Math.max(insets.bottom, 16),
              }
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={handlePostJob}
              disabled={isSubmitting}
              style={[
                styles.bottomActionBtn,
                {
                  shadowColor: isInstant ? '#2DD4BF' : '#FB923C',
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                },
                isSubmitting && { opacity: 0.7 }
              ]}
            >
              <LinearGradient
                colors={isInstant ? ['#2DD4BF', '#00E5FF'] : ['#FB923C', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bottomActionGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#001014" size="small" />
                ) : (
                  <Text style={styles.bottomActionText}>
                    {isInstant
                      ? t('jobCreation.findUstadBtn', 'Find an Ustad - Rs. {{price}}', { price: fixedPrice.toLocaleString() })
                      : t('jobCreation.postRequestBtn', 'Post request')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* ── Location Edit Modal ── */}
        <Modal
          visible={showLocationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#111527' : '#FFFFFF', borderColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                {t('jobCreation.serviceLocation', 'Service Location')}
              </Text>

              <TouchableOpacity
                style={[styles.modalGpsBtn, { backgroundColor: alpha(activeColor, 0.12), borderColor: alpha(activeColor, 0.3) }]}
                onPress={() => handleGetLiveLocation(false)}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={activeColor} />
                ) : (
                  <>
                    <Target size={16} color={activeColor} />
                    <Text style={[styles.modalGpsText, { color: activeColor }]}>
                      {t('jobCreation.useCurrentLocation', 'Use my current location')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={[styles.modalInputLabel, { color: palette.textSecondary }]}>
                Or type your address:
              </Text>
              <TextInput
                style={[styles.modalTextInput, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' }]}
                placeholder={t('jobCreation.locationPlaceholder', 'House / flat, street, block, area...')}
                placeholderTextColor={palette.textMuted}
                multiline
                value={tempAddressInput}
                onChangeText={setTempAddressInput}
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: palette.border }]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: palette.textSecondary }]}>
                    {t('common.cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: activeColor }]}
                  onPress={() => {
                    if (tempAddressInput.trim()) {
                      setAddress(tempAddressInput.trim());
                    }
                    setShowLocationModal(false);
                  }}
                >
                  <Text style={styles.modalSaveText}>
                    {t('common.done', 'Done')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Confirmation Modal ── */}
        <ConfirmModal
          visible={confirmVisible}
          onConfirm={handleConfirmSubmit}
          onCancel={closeConfirm}
          title={isInstant ? t('jobCreation.postUrgentTitle') : t('jobCreation.postServiceTitle')}
          message={
            isInstant
              ? t('jobCreation.postUrgentConfirm', { price: fixedPrice.toLocaleString() })
              : t('jobCreation.postServiceConfirm')
          }
          confirmText={isInstant ? `Find Ustad - Rs. ${fixedPrice.toLocaleString()}` : 'Post Request'}
          cancelText={t('jobCreation.cancel')}
          isLoading={isConfirming}
          confirmColor={activeColor}
        />

        {/* ── Success Modal ── */}
        <AlertModal
          visible={showSuccessModal}
          onDismiss={handleSuccessModalDismiss}
          title={t('jobCreation.successTitle', 'REQUEST SENT!')}
          type="success"
          buttonText={t('common.done', 'Done')}
          message={
            isInstant
              ? t('jobCreation.successModalUrgentDesc', 'Your urgent request has been sent to nearby Ustads!\n\nThe first Ustad who accepts will get the job right away.')
              : t('jobCreation.successModalScheduledDesc', 'Your job has been posted! Nearby Ustads will check it and send you their rates shortly.')
          }
        />

        {/* ── Schedule Selector Modal ── */}
        <SchedulePickerModal
          visible={showPickerModal}
          onDismiss={() => setShowPickerModal(false)}
          onSave={handleCustomScheduleSave}
          initialDate={scheduledDate}
          initialTime={scheduledTime}
        />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardAvoider: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // 1. Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },

  // 2. Mode Selector Pill Toggle
  modeToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  modePill: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modePillActive: {},
  modePillInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modePillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modePillTextActive: {
    color: '#001014',
    fontWeight: '800',
  },

  // Section Wrap
  sectionWrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.1,
  },

  // 3. What Needs Fixing Card
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  textArea: {
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    padding: 0,
    marginBottom: 10,
  },
  inputCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  voiceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordingStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  micCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },

  // Quick chips
  quickChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 4. Location Card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDetails: {
    flex: 1,
  },
  locationAddressText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationSubText: {
    fontSize: 11,
    fontWeight: '500',
  },
  locationChangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  locationChangeBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // 5. Urgent Pricing Card (Hours & Fixed Price)
  pricingCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  hoursRateSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 10,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  stepperValText: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  fixedPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fixedPriceLeft: {
    flex: 1,
    paddingRight: 10,
  },
  fixedPriceTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  fixedPriceSub: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  fixedPriceAmount: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  // 5. Book Later: Date & Time Pills
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chipPill: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipPillActive: {},
  chipPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipPillTextActive: {
    color: '#001014',
    fontWeight: '800',
  },

  // Book Later: Budget
  budgetInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 50,
  },
  budgetCurrencyLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },
  budgetTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  budgetChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  budgetChipBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  budgetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 6. Photos/Video
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  photoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCardText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  thumbsScroll: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  thumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbRemoveBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 7. Sticky Bottom Action
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomActionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bottomActionGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#001014',
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  modalGpsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalTextInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#001014',
  },
});

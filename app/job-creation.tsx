import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingStatus,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  Mic,
  Send,
  Users,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
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
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useCreateJobMutation, useToast, useUploadJobImagesMutation } from '../hooks';
import { addAlpha } from '../utils/colorUtils';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '../constants/Theme';

// Sub-components
import { BudgetInput } from '../components/job-creation/BudgetInput';
import { LocationSelector } from '../components/job-creation/LocationSelector';
import { MediaEvidencePicker } from '../components/job-creation/MediaEvidencePicker';
import { SchedulePickerModal } from '../components/job-creation/SchedulePickerModal';
import { GlassInput, P, SectionLabel, useJobCreationPalette } from '../components/job-creation/shared';
import { UrgencyToggle } from '../components/job-creation/UrgencyToggle';
import { VoiceBriefRecorder } from '../components/job-creation/VoiceBriefRecorder';
import { UrgentPricingCard } from '../components/job-creation/UrgentPricingCard';
import { calculateUrgentPrice, getRateForCategory } from '../constants/UrgentPricing';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Urgency = 'instant' | 'scheduled';
type EvidenceAsset = { uri: string; type: 'image' | 'video' };

const formatVoiceDuration = (durationMillis: number) => {
  const seconds = Math.max(0, Math.floor(durationMillis / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

// ─── CollapsibleCard Component ───────────────────────────────────────────────
interface CollapsibleCardProps {
  title: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  color: string;
  summary: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleCard({
  title,
  icon: Icon,
  color,
  summary,
  isExpanded,
  onToggle,
  children,
}: CollapsibleCardProps) {
  const palette = useJobCreationPalette();

  return (
    <View style={[
      styles.collapsibleContainer,
      {
        backgroundColor: palette.surfaceRaised,
        borderColor: palette.border,
      },
      isExpanded && { borderColor: addAlpha(color, '30') }
    ]}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.collapsibleIconWrap, { backgroundColor: addAlpha(color, '12') }]}>
          <Icon size={16} color={color} strokeWidth={2.2} />
        </View>
        <View style={styles.collapsibleHeaderText}>
          <Text style={[styles.collapsibleTitle, { color }]}>{title}</Text>
          <Text style={[styles.collapsibleSummary, { color: palette.textSecondary }]} numberOfLines={1}>{summary}</Text>
        </View>
        <View style={styles.collapsibleRight}>
          {isExpanded ? (
            <ChevronUp size={16} color={palette.textSecondary} strokeWidth={2.5} />
          ) : (
            <ChevronDown size={16} color={palette.textSecondary} strokeWidth={2.5} />
          )}
        </View>
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.collapsibleContent, { borderTopColor: palette.border }]}>
          {children}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function JobCreationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const palette = useJobCreationPalette();
  const theme = useTheme();
  const { success, error: showError } = useToast();
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

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

  // ─── State ──────────────────────────────────────────────────────────────────
  const [urgency, setUrgency] = useState<Urgency>(
    (urgencyParam as Urgency) || 'instant'
  );
  const [description, setDescription] = useState<string>(initialDescription ?? '');
  const [amount, setAmount] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [selectedMedia, setSelectedMedia] = useState<EvidenceAsset[]>([]);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('Detecting location...');
  const [latitude, setLatitude] = useState<number>(33.6927);
  const [longitude, setLongitude] = useState<number>(73.0743);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 86_400_000));
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);

  const [expandedSections, setExpandedSections] = useState({
    budget: true,
    schedule: true,
    media: false,
    voice: false,
  });

  // ─── Initialize Urgent Price on mount/urgency toggle ─────────────────────
  useEffect(() => {
    if (urgency === 'instant') {
      const calculated = calculateUrgentPrice(title ?? 'General', estimatedHours);
      setAmount(calculated.toString());
    } else {
      setAmount('');
    }
  }, [urgency, title, estimatedHours]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRecordingStatus = useCallback((status: RecordingStatus) => {
    if (status.isFinished && status.url) {
      setVoiceNoteUri(status.url);
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
  }, []);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, handleRecordingStatus);
  const recorderState = useAudioRecorderState(audioRecorder, 250);

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
      showError('Recording Failed', error instanceof Error ? error.message : 'Could not start the voice note.');
    }
  }, [audioRecorder, showError]);

  const stopVoiceNote = useCallback(async () => {
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      setVoiceNoteUri(audioRecorder.uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showError('Recording Failed', error instanceof Error ? error.message : 'Could not save the voice note.');
    }
  }, [audioRecorder, showError]);

  const validateSchedule = useCallback((date: Date, timeStr: string): boolean => {
    const [h, m] = timeStr.split(':').map(Number);
    const check = new Date(date);
    check.setHours(h, m, 0, 0);
    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
    return check.getTime() >= oneHourLater.getTime();
  }, []);

  const handleScheduleSave = useCallback((date: Date, time: string) => {
    setScheduledDate(date);
    setScheduledTime(time);
    setShowPickerModal(false);
    success('Schedule Saved', `Visit scheduled for ${date.toLocaleDateString('en-GB')} at ${time}`);
  }, [success]);

  const { mutate: createJob, isPending: isSubmittingJob } = useCreateJobMutation();
  const { mutateAsync: uploadImages } = useUploadJobImagesMutation();
  const isSubmitting = isSubmittingJob || isUploadingMedia;

  const accentColor: string = color ?? palette.cyan;
  const isInstant = urgency === 'instant';
  const submitLabel = targetWorkerId
    ? t('jobCreation.submitDirect')
    : isInstant
      ? t('jobCreation.submitInstant')
      : t('jobCreation.submitScheduled');

  // ─── Auto-fetch location on mount ─────────────────────────────────────────
  useEffect(() => {
    void handleGetLiveLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Location ─────────────────────────────────────────────────────────────
  const handleGetLiveLocation = useCallback(async (silent = false) => {
    try {
      setIsGettingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) showError('Permission Denied', 'Location permission is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = loc.coords;
      setLatitude(lat);
      setLongitude(lng);

      // Reverse geocode to get a human-readable address
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const geo = results[0];
        const name = geo.name && geo.name !== geo.city ? geo.name : null;
        const city = geo.city ?? geo.subregion ?? '';
        const country = geo.country ?? '';
        setAddress(name ? `${name}, ${city}` : `${city}, ${country}`);
      }

      if (!silent) success('Location Locked', 'Position updated to your current location.');
    } catch (e) {
      if (!silent && e instanceof Error) {
        showError('Location Error', e.message || 'Failed to acquire location.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  }, [showError, success]);

  // ─── Media Picker ──────────────────────────────────────────────────────────
  const pickMedia = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(t('common.error', 'Permission Needed'), t('jobCreation.permissionDenied'));
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
      showError(t('common.error', 'Media Error'), t('jobCreation.mediaLibraryError'));
    }
  }, [selectedMedia.length, showError, t]);

  const removeMedia = useCallback((indexToRemove: number) => {
    setSelectedMedia((current) => current.filter((_, index) => index !== indexToRemove));
    void Haptics.selectionAsync();
  }, []);

  // ─── Submit flow ──────────────────────────────────────────────────────────
  const handlePostJob = useCallback(async () => {
    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 3 && !voiceNoteUri) {
      showError(t('jobCreation.descTooShortTitle'), t('jobCreation.descTooShortDesc'));
      return;
    }
    if (!address.trim() || address === 'Detecting location...' || address === 'Detecting location') {
      showError(t('jobCreation.invalidLocation'), t('jobCreation.invalidLocationDesc'));
      return;
    }
    if (isInstant) {
      const rateInfo = getRateForCategory(title ?? 'General');
      const minPrice = rateInfo.minimumPrice;
      const currentPrice = Number(amount) || 0;
      if (currentPrice < minPrice) {
        showError(
          t('common.error', 'Error'),
          t('jobCreation.minPriceRequired', 'Minimum price is Rs. {{price}}', { price: minPrice })
        );
        return;
      }
    } else {
      if (amount && Number(amount) <= 0) {
        showError(t('jobCreation.invalidOffer'), t('jobCreation.invalidOfferDesc'));
        return;
      }
      if (!validateSchedule(scheduledDate, scheduledTime)) {
        showError(t('jobCreation.invalidSchedule'), t('jobCreation.invalidScheduleDesc'));
        return;
      }
    }

    setIsUploadingMedia(true);
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

      const fixedPrice = isInstant
        ? (amount && Number(amount) > 0 ? parseFloat(amount) : calculateUrgentPrice(title ?? 'General', estimatedHours))
        : (amount && Number(amount) > 0) ? parseFloat(amount) : 500;

      const payload = {
        category: title ?? 'General',
        description: trimmedDesc || t('jobCreation.voiceNoteFallback', 'Voice note attached'),
        urgency,
        address,
        amount: fixedPrice,
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

      setIsUploadingMedia(false);
      createJob(payload, {
        onSuccess: (response) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          success(t('jobCreation.successTitle', 'Request Sent'), t('findingWorker.searchingUstads', 'Finding nearby Ustads...'));
          router.replace({ pathname: '/finding-worker', params: { jobId: response._id as string } });
        },
        onError: (err: Error) => {
          showError(t('jobCreation.requestFailed'), err.message || t('jobDetails.toastUnableRespond'));
        },
      });
    } catch (err) {
      setIsUploadingMedia(false);
      showError(t('jobCreation.uploadFailed'), err instanceof Error ? err.message : t('registerDetails.uploadError'));
    }
  }, [
    description, voiceNoteUri, address, isInstant, title, amount, validateSchedule,
    scheduledDate, scheduledTime, selectedMedia, uploadImages, estimatedHours,
    urgency, longitude, latitude, targetWorkerId, createJob, showError, success, router, t,
  ]);

  // Summaries for collapsible sections
  const budgetSummary = amount ? `Rs. ${Number(amount).toLocaleString('en-PK')}` : 'Open Bid / Negotiable';

  const mediaCount = selectedMedia.length;
  const mediaSummary = mediaCount === 0
    ? 'No photos or videos attached'
    : `${mediaCount} file${mediaCount > 1 ? 's' : ''} attached`;

  const voiceDuration = recorderState.durationMillis;
  const voiceSummary = recorderState.isRecording
    ? `Recording... ${formatVoiceDuration(voiceDuration)}`
    : voiceNoteUri
      ? 'Voice brief attached'
      : 'No voice brief recorded';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.colors.text.primary, 0.04),
                borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
              },
            ]}
          >
            <ArrowLeft color={palette.textPrimary} size={18} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerEyebrow, { color: accentColor }]}>
              {targetWorkerName ? t('jobCreation.directRequest', 'DIRECT REQUEST') : t('jobCreation.findUstad', 'BOOK AN USTAD').toUpperCase()}
            </Text>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]} numberOfLines={1}>
              {targetWorkerName ? `${targetWorkerName} • ${title ?? ''}` : (title ?? t('jobCreation.findUstad', 'Book an Ustad'))}
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </Animated.View>

        {/* ── Urgency Toggle ── */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          <UrgencyToggle
            urgency={urgency}
            onChange={setUrgency}
            colors={palette}
          />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* ── Scrollable Content ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Browse Ustads Option Pill (replaces category-details interstitial) ── */}
            {!targetWorkerId && (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() =>
                  router.push({
                    pathname: '/worker-list',
                    params: { category: title ?? '', color: accentColor, title: title ?? '' },
                  })
                }
                style={[
                  styles.browseUstadsPill,
                  {
                    backgroundColor: alpha(palette.orange, 0.08),
                    borderColor: alpha(palette.orange, 0.25),
                  },
                ]}
              >
                <Users size={16} color={palette.orange} />
                <Text style={[styles.browseUstadsText, { color: palette.textPrimary }]}>
                  {t('jobCreation.preferBrowseUstads', 'Prefer to choose an Ustad yourself?')}
                </Text>
                <Text style={[styles.browseUstadsLink, { color: palette.orange }]}>
                  {t('categoryDetails.browse', 'Browse')}
                </Text>
                <ChevronRight size={14} color={palette.orange} />
              </TouchableOpacity>
            )}

            {/* ── 1. Problem Description + Voice / Photos ── */}
            <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.section}>
              <SectionLabel icon={FileText} label={t('jobCreation.describeNeed').toUpperCase()} />
              <GlassInput glowColor={description.trim().length >= 3 || voiceNoteUri ? palette.cyan : undefined}>
                <TextInput
                  style={[styles.textArea, { color: palette.textPrimary }]}
                  placeholder={t('jobCreation.placeholder')}
                  placeholderTextColor={palette.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                />
                <View style={styles.inputFooter}>
                  <Text style={[styles.inputHint, { color: palette.textMuted }]}>
                    {t('jobCreation.descHint', 'Write briefly or record a voice note below')}
                  </Text>
                  <Text style={[styles.charCount, { color: palette.textMuted }]}>
                    {description.length}/1000
                  </Text>
                </View>
              </GlassInput>

              {/* Quick Voice & Photo Attachments right below description */}
              <View style={{ marginTop: 12 }}>
                <CollapsibleCard
                  title={t('jobCreation.voiceBrief')}
                  icon={Mic}
                  color={palette.orange}
                  summary={voiceSummary}
                  isExpanded={expandedSections.voice || Boolean(voiceNoteUri) || recorderState.isRecording}
                  onToggle={() => toggleSection('voice')}
                >
                  <VoiceBriefRecorder
                    isRecording={recorderState.isRecording}
                    durationMillis={recorderState.durationMillis}
                    voiceNoteUri={voiceNoteUri}
                    onStartRecord={startVoiceNote}
                    onStopRecord={stopVoiceNote}
                    onRemoveRecord={() => setVoiceNoteUri(null)}
                    hideLabel
                  />
                </CollapsibleCard>

                <CollapsibleCard
                  title={t('jobCreation.photosOrVideo')}
                  icon={Camera}
                  color={palette.purple}
                  summary={mediaSummary}
                  isExpanded={expandedSections.media || selectedMedia.length > 0}
                  onToggle={() => toggleSection('media')}
                >
                  <MediaEvidencePicker
                    selectedMedia={selectedMedia}
                    onPickMedia={pickMedia}
                    onRemoveMedia={removeMedia}
                    onClearAll={() => setSelectedMedia([])}
                    hideLabel
                  />
                </CollapsibleCard>
              </View>
            </Animated.View>

            {/* ── 2. Location Selector ── */}
            <Animated.View entering={FadeInDown.delay(150).duration(450)}>
              <LocationSelector
                address={address}
                latitude={latitude}
                longitude={longitude}
                isGettingLocation={isGettingLocation}
                onAddressChange={setAddress}
                onGetLiveLocation={() => handleGetLiveLocation(false)}
              />
            </Animated.View>

            {/* ── 3. Schedule (when Scheduled) ── */}
            {!isInstant && (
              <Animated.View entering={FadeInDown.delay(190).duration(450)} style={styles.section}>
                <SectionLabel icon={Calendar} label={t('jobCreation.visitSchedule', 'VISIT DATE & TIME').toUpperCase()} color={palette.orange} />
                <View style={styles.scheduleRow}>
                  <TouchableOpacity
                    style={[styles.scheduleCard, { borderColor: addAlpha(palette.orange, '35'), backgroundColor: palette.orangeMuted }]}
                    activeOpacity={0.7}
                    onPress={() => setShowPickerModal(true)}
                  >
                    <Calendar size={15} color={palette.orange} strokeWidth={1.8} />
                    <Text style={[styles.scheduleValue, { color: palette.orange }]}>
                      {scheduledDate.toLocaleDateString('en-GB')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scheduleCard, { borderColor: addAlpha(palette.orange, '35'), backgroundColor: palette.orangeMuted }]}
                    activeOpacity={0.7}
                    onPress={() => setShowPickerModal(true)}
                  >
                    <Clock size={15} color={palette.orange} strokeWidth={1.8} />
                    <Text style={[styles.scheduleValue, { color: palette.orange }]}>{scheduledTime}</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── 4. Budget / Price ── */}
            {isInstant ? (
              <Animated.View entering={FadeInDown.delay(220).duration(450)}>
                <UrgentPricingCard
                  category={title ?? 'General'}
                  estimatedHours={estimatedHours}
                  onChangeHours={setEstimatedHours}
                  amount={amount}
                  onChangeAmount={setAmount}
                />
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.delay(220).duration(450)}>
                <CollapsibleCard
                  title={t('jobCreation.yourOffer')}
                  icon={Banknote}
                  color={palette.success}
                  summary={budgetSummary}
                  isExpanded={expandedSections.budget}
                  onToggle={() => toggleSection('budget')}
                >
                  <BudgetInput
                    amount={amount}
                    onChangeAmount={setAmount}
                    hideLabel
                  />
                </CollapsibleCard>
              </Animated.View>
            )}

            <View style={styles.scrollBottomSpace} />
          </ScrollView>

          {/* ── Clean Sticky Submit Button ── */}
          <Animated.View
            entering={FadeInUp.delay(260).duration(450)}
            style={[
              styles.stickyFooter,
              {
                backgroundColor: theme.isDark ? 'rgba(4,8,20,0.94)' : alpha(theme.colors.background.elevated, 0.96),
                borderTopColor: theme.isDark ? 'rgba(0,245,255,0.12)' : theme.colors.border.subtle,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={handlePostJob}
              disabled={isSubmitting}
              style={[
                styles.submitWrapper,
                {
                  shadowColor: isInstant ? theme.colors.brand.primary : theme.colors.brand.worker,
                  shadowOpacity: 0.28,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                },
                isSubmitting && { opacity: 0.7 },
              ]}
            >
              <LinearGradient
                colors={
                  isInstant
                    ? (theme.colors.gradients.primary as [string, string, ...string[]])
                    : (theme.colors.gradients.worker as [string, string, ...string[]])
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator
                    color={isInstant ? theme.colors.button.primaryText : theme.colors.button.workerText}
                    size="small"
                  />
                ) : (
                  <View style={styles.submitInner}>
                    <Send
                      size={18}
                      color={isInstant ? theme.colors.button.primaryText : theme.colors.button.workerText}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.submitText,
                        { color: isInstant ? theme.colors.button.primaryText : theme.colors.button.workerText },
                      ]}
                    >
                      {submitLabel}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>

        {/* ── Schedule Selector Modal ── */}
        <SchedulePickerModal
          visible={showPickerModal}
          onDismiss={() => setShowPickerModal(false)}
          onSave={handleScheduleSave}
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerEyebrow: {
    fontSize: 9, fontWeight: '800', letterSpacing: 3,
    color: P.textMuted, marginBottom: 2,
  },
  headerTitle: {
    fontSize: 16, fontWeight: '800', color: P.textPrimary, letterSpacing: 0.3,
  },
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  liveText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  scrollBottomSpace: { height: 22 },

  browseUstadsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  browseUstadsText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  browseUstadsLink: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Mission Card
  missionCard: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, marginBottom: 26,
  },
  missionCardGradient: { padding: 18 },
  missionCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16,
  },
  categoryIcon: {
    width: 54, height: 54, borderRadius: 16,
    borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  missionMeta: { flex: 1 },
  missionEyebrow: {
    fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 3,
  },
  missionName: {
    fontSize: 19, fontWeight: '800', color: P.white,
  },
  missionSub: {
    fontSize: 11, color: P.textSecondary, fontWeight: '600',
    marginTop: 3, letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statDivider: {
    width: 1,
    marginVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Section
  section: { marginBottom: 24 },

  // Text Area
  textArea: {
    fontSize: 15, color: P.textPrimary,
    minHeight: 110, padding: 16,
    fontWeight: '500', lineHeight: 22,
  },
  inputFooter: {
    paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  inputHint: { flex: 1, fontSize: 10, color: P.textMuted, fontWeight: '600' },
  charCount: { fontSize: 11, color: P.textMuted, fontWeight: '600' },

  // Schedule
  scheduleRow: { flexDirection: 'row', gap: 12 },
  scheduleCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 13, paddingVertical: 13,
  },
  scheduleValue: {
    flex: 1, fontSize: 13, fontWeight: '700',
  },

  // Persistent submit panel
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: 'rgba(4,8,20,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,245,255,0.12)',
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completionCopy: { gap: 2 },
  completionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completionTitle: {
    fontSize: 11,
    color: P.textPrimary,
    fontWeight: '800',
  },
  completionText: {
    fontSize: 10,
    color: P.textSecondary,
    fontWeight: '600',
  },
  completionPercent: {
    fontSize: 15,
    fontWeight: '900',
  },
  completionTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  completionFill: {
    height: '100%',
    borderRadius: 2,
  },
  submitWrapper: {
    borderRadius: 18,
    overflow: 'visible',
  },
  submitGradient: {
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Collapsible Card styles
  collapsibleContainer: {
    backgroundColor: P.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  collapsibleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleHeaderText: {
    flex: 1,
    gap: 2,
  },
  collapsibleTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  collapsibleSummary: {
    fontSize: 11,
    color: P.textSecondary,
    fontWeight: '600',
  },
  collapsibleRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsibleContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 16,
  },
  optionalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  optionalLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionalDividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: P.textSecondary,
    letterSpacing: 2.5,
  },
});

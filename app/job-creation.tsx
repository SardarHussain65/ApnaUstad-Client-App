import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingStatus,
} from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ShieldCheck,
  Target,
  FileText,
  Send,
  ClipboardList,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { addAlpha } from '../utils/colorUtils';
import { useCreateJobMutation, useUploadJobImagesMutation, useToast, useConfirmModal } from '../hooks';
import { ConfirmModal, AlertModal } from '../components/ui';

// Sub-components
import { UrgencyToggle } from '../components/job-creation/UrgencyToggle';
import { BudgetInput } from '../components/job-creation/BudgetInput';
import { LocationSelector } from '../components/job-creation/LocationSelector';
import { MediaEvidencePicker } from '../components/job-creation/MediaEvidencePicker';
import { VoiceBriefRecorder } from '../components/job-creation/VoiceBriefRecorder';
import { SchedulePickerModal } from '../components/job-creation/SchedulePickerModal';
import { SectionLabel, GlassInput, StatBadge, P } from '../components/job-creation/shared';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Urgency = 'instant' | 'scheduled';
type EvidenceAsset = { uri: string; type: 'image' | 'video' };

const formatVoiceDuration = (durationMillis: number) => {
  const seconds = Math.max(0, Math.floor(durationMillis / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function JobCreationScreen() {
  const router = useRouter();
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

  // ─── State ──────────────────────────────────────────────────────────────────
  const [urgency, setUrgency] = useState<Urgency>(
    (urgencyParam as Urgency) || 'instant'
  );
  const [description, setDescription] = useState<string>(initialDescription ?? '');
  const [amount, setAmount] = useState<string>('');
  const [selectedMedia, setSelectedMedia] = useState<EvidenceAsset[]>([]);
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('Detecting location...');
  const [latitude, setLatitude] = useState<number>(33.6927);
  const [longitude, setLongitude] = useState<number>(73.0743);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 86_400_000));
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);

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

  // --- DEPLOY BUTTON HEARTBEAT PULSE ---
  const deployBtnScale = useSharedValue(1);
  useEffect(() => {
    deployBtnScale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1100 }),
        withTiming(1, { duration: 1100 })
      ),
      -1,
      true
    );
  }, [deployBtnScale]);

  const deployBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deployBtnScale.value }],
  }));

  const { mutate: createJob, isPending: isSubmittingJob } = useCreateJobMutation();
  const { mutateAsync: uploadImages } = useUploadJobImagesMutation();
  const isSubmitting = isSubmittingJob || isConfirming;

  const accentColor: string = color ?? P.cyan;
  const isInstant = urgency === 'instant';
  const selectedImageCount = selectedMedia.filter((asset) => asset.type === 'image').length;
  const selectedVideoCount = selectedMedia.filter((asset) => asset.type === 'video').length;
  const hasDescription = description.trim().length >= 10;
  const hasValidOffer = Number(amount) > 0;
  const hasLocation = Boolean(address.trim() && address !== 'Detecting location...');
  const hasValidSchedule = isInstant || validateSchedule(scheduledDate, scheduledTime);
  const requiredStepCount = isInstant ? 3 : 4;
  const completedStepCount = [hasDescription, hasValidOffer, hasLocation, ...(!isInstant ? [hasValidSchedule] : [])]
    .filter(Boolean)
    .length;
  const completionPercentage = Math.round((completedStepCount / requiredStepCount) * 100);
  const submitLabel = targetWorkerId
    ? 'Send Request to Ustad'
    : isInstant
      ? 'Find an Ustad Now'
      : 'Post Scheduled Request';

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
        alert('Permission Denied, Access to your photo library is required.');
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
      alert('Error: Could not access the media library.');
    }
  }, [selectedMedia.length]);

  const removeMedia = useCallback((indexToRemove: number) => {
    setSelectedMedia((current) => current.filter((_, index) => index !== indexToRemove));
    void Haptics.selectionAsync();
  }, []);

  // ─── Submit flow ──────────────────────────────────────────────────────────
  const handlePostJob = useCallback(() => {
    if (description.trim().length < 10) {
      showError('Description Too Short', 'Please describe the job with at least 10 characters.');
      return;
    }
    if (!address.trim() || address === 'Detecting location...') {
      showError('Invalid Location', 'Please provide or detect a booking address.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showError('Offer Required', 'Add the amount you are offering for this work.');
      return;
    }
    if (!isInstant) {
      if (!validateSchedule(scheduledDate, scheduledTime)) {
        showError('Invalid Schedule', 'The scheduled date & time must be at least 1 hour in the future.');
        return;
      }
    }
    showConfirm(
      'Post Service Request',
      `Your ${isInstant ? 'instant' : 'scheduled'} service request is ready to post.`,
      handleConfirmSubmit,
      closeConfirm,
      'Post Request',
      'Keep Editing',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, address, amount, isInstant, scheduledDate, scheduledTime, validateSchedule]);

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

      const payload = {
        category: title ?? 'General',
        description,
        urgency,
        address,
        amount: parseFloat(amount),
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
          showError('Request Failed', err.message || 'Failed to post job.');
        },
      });
    } catch (err) {
      setConfirmLoading(false);
      showError('Upload Failed', err instanceof Error ? err.message : 'Failed to upload job evidence.');
    }
  }, [
    selectedMedia, voiceNoteUri, uploadImages, title, description, urgency,
    address, amount, longitude, latitude, targetWorkerId,
    isInstant, scheduledDate, scheduledTime,
    createJob, closeConfirm, showError, setConfirmLoading,
  ]);

  const handleSuccessModalDismiss = useCallback(() => {
    setShowSuccessModal(false);
    router.push({ pathname: '/finding-worker', params: { jobId: createdJobId } });
  }, [createdJobId, router]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={P.textPrimary} size={18} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>SERVICE REQUEST</Text>
            <Text style={styles.headerTitle}>Create Request</Text>
          </View>

          {/* Live status indicator */}
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: isInstant ? P.cyan : P.orange }]} />
            <Text style={[styles.liveText, { color: isInstant ? P.cyan : P.orange }]}>
              {isInstant ? 'NOW' : 'PLANNED'}
            </Text>
          </View>
        </Animated.View>

        {/* ── Urgency Toggle ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <UrgencyToggle
            urgency={urgency}
            onChange={setUrgency}
            colors={P}
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

            {/* ── Request Summary Card ── */}
            <Animated.View entering={FadeInDown.delay(150).duration(600)} style={[styles.missionCard, { borderColor: addAlpha(accentColor, '20') }]}>
              <LinearGradient
                colors={[addAlpha(accentColor, '22'), 'rgba(10,16,35,0.94)', 'rgba(123,97,255,0.10)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1.2, y: 1.2 }}
                style={styles.missionCardGradient}
              >
                <View style={styles.missionCardInner}>
                  <View style={[styles.categoryIcon, { borderColor: addAlpha(accentColor, '50') }]}>
                    <LinearGradient
                      colors={[addAlpha(accentColor, '25'), addAlpha(accentColor, '05')]}
                      style={StyleSheet.absoluteFill}
                    />
                    {targetWorkerName
                      ? <Target color={accentColor} size={24} strokeWidth={1.5} />
                      : <ClipboardList color={accentColor} size={24} strokeWidth={1.5} />}
                  </View>

                  <View style={styles.missionMeta}>
                    <Text style={[styles.missionEyebrow, { color: accentColor }]}>
                      {targetWorkerName ? 'SELECTED USTAD' : 'SERVICE CATEGORY'}
                    </Text>
                    <Text style={styles.missionName} numberOfLines={1}>
                      {targetWorkerName ?? title ?? 'General Service'}
                    </Text>
                    <Text style={styles.missionSub}>
                      {targetWorkerName ? `${title ?? 'General'} service request` : `${isInstant ? 'Urgent request' : 'Scheduled visit'} for nearby Ustads`}
                    </Text>
                  </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <StatBadge
                    label="SERVICE"
                    value={isInstant ? 'NOW' : 'PLANNED'}
                    color={isInstant ? P.cyan : P.orange}
                  />
                  <View style={styles.statDivider} />
                  <StatBadge
                    label="EVIDENCE"
                    value={`${selectedMedia.length}/5`}
                    color={P.purple}
                  />
                  <View style={styles.statDivider} />
                  <StatBadge
                    label="BUDGET"
                    value={amount ? `RS ${amount}` : 'ADD'}
                    color={P.success}
                  />
                </View>
              </LinearGradient>
            </Animated.View>

            {/* ── Service Details ── */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
              <SectionLabel icon={FileText} label="DESCRIBE THE WORK" badge="Required" />
              <GlassInput glowColor={description.trim().length >= 10 ? P.cyan : (description.trim().length > 0 ? P.error : undefined)}>
                <TextInput
                  style={styles.textArea}
                  placeholder="What needs to be fixed? Add useful details for the Ustad."
                  placeholderTextColor={P.textMuted}
                  multiline
                  numberOfLines={5}
                  maxLength={1000}
                  value={description}
                  onChangeText={setDescription}
                  textAlignVertical="top"
                />
                <View style={styles.inputFooter}>
                  {description.trim().length > 0 && description.trim().length < 10 ? (
                    <Text style={[styles.inputHint, { color: P.error, fontWeight: '700' }]}>
                      ⚠️ Description too short (minimum 10 characters)
                    </Text>
                  ) : (
                    <Text style={styles.inputHint}>Include the issue, size, and access details</Text>
                  )}
                  <Text style={[
                    styles.charCount,
                    description.trim().length > 0 && description.trim().length < 10 && { color: P.error, fontWeight: '700' }
                  ]}>
                    {description.length}/1000
                  </Text>
                </View>
              </GlassInput>
            </Animated.View>

            {/* ── Budget Offer ── */}
            <Animated.View entering={FadeInDown.delay(260).duration(600)}>
              <BudgetInput
                amount={amount}
                onChangeAmount={setAmount}
              />
            </Animated.View>

            {/* ── Schedule (conditional) ── */}
            {!isInstant && (
              <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.section}>
                <SectionLabel icon={Calendar} label="VISIT SCHEDULE" color={P.orange} badge="Required" />
                <View style={styles.scheduleRow}>
                  <TouchableOpacity
                    style={[styles.scheduleCard, { borderColor: P.orange + '35', backgroundColor: P.orangeMuted }]}
                    activeOpacity={0.7}
                    onPress={() => setShowPickerModal(true)}
                  >
                    <Calendar size={15} color={P.orange} strokeWidth={1.5} />
                    <Text style={[styles.scheduleValue, { color: P.orange }]}>
                      {scheduledDate.toLocaleDateString('en-GB')}
                    </Text>
                    <Clock size={13} color={P.orange + '80'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scheduleCard, { borderColor: P.orange + '35', backgroundColor: P.orangeMuted }]}
                    activeOpacity={0.7}
                    onPress={() => setShowPickerModal(true)}
                  >
                    <Clock size={15} color={P.orange} strokeWidth={1.5} />
                    <Text style={[styles.scheduleValue, { color: P.orange }]}>{scheduledTime}</Text>
                    <Clock size={13} color={P.orange + '80'} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── Location Selector ── */}
            <Animated.View entering={FadeInDown.delay(320).duration(600)}>
              <LocationSelector
                address={address}
                latitude={latitude}
                longitude={longitude}
                isGettingLocation={isGettingLocation}
                onAddressChange={setAddress}
                onGetLiveLocation={() => handleGetLiveLocation(false)}
              />
            </Animated.View>

            {/* ── Media Evidence Picker ── */}
            <Animated.View entering={FadeInDown.delay(380).duration(600)}>
              <MediaEvidencePicker
                selectedMedia={selectedMedia}
                onPickMedia={pickMedia}
                onRemoveMedia={removeMedia}
                onClearAll={() => setSelectedMedia([])}
              />
            </Animated.View>

            {/* ── Voice Brief Recorder ── */}
            <Animated.View entering={FadeInDown.delay(420).duration(600)}>
              <VoiceBriefRecorder
                isRecording={recorderState.isRecording}
                durationMillis={recorderState.durationMillis}
                voiceNoteUri={voiceNoteUri}
                onStartRecord={startVoiceNote}
                onStopRecord={stopVoiceNote}
                onRemoveRecord={() => setVoiceNoteUri(null)}
              />
            </Animated.View>

            <View style={styles.scrollBottomSpace} />
          </ScrollView>

          {/* ── Persistent Submit Panel ── */}
          <Animated.View entering={FadeInUp.delay(450).duration(600)} style={styles.stickyFooter}>
            <View style={styles.completionRow}>
              <View style={styles.completionCopy}>
                <View style={styles.completionTitleRow}>
                  <ShieldCheck size={14} color={completionPercentage === 100 ? P.success : P.cyanDim} strokeWidth={2.3} />
                  <Text style={styles.completionTitle}>Request readiness</Text>
                </View>
                <Text style={styles.completionText}>
                  {completedStepCount}/{requiredStepCount} required details ready
                </Text>
              </View>
              <Text style={[styles.completionPercent, { color: completionPercentage === 100 ? P.success : P.cyan }]}>
                {completionPercentage}%
              </Text>
            </View>
            <View style={styles.completionTrack}>
              <LinearGradient
                colors={completionPercentage === 100 ? [P.success, P.cyan] : [P.cyan, P.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.completionFill, { width: `${completionPercentage}%` }]}
              />
            </View>
            <Animated.View style={deployBtnStyle}>
              <TouchableOpacity
                activeOpacity={0.76}
                onPress={handlePostJob}
                disabled={isSubmitting}
                style={[
                  styles.submitWrapper,
                  {
                    shadowColor: isInstant ? '#007AFF' : '#FF6B00',
                    shadowOpacity: 0.38,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 10,
                  },
                  isSubmitting && { opacity: 0.7 }
                ]}
              >
                <LinearGradient
                  colors={isInstant
                    ? ['#00F5FF', '#007AFF', '#7D00FF']
                    : ['#FF6B00', '#FF8F00', '#FF3D00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.glassHighlight}
                  />

                  {isSubmitting ? (
                    <ActivityIndicator color={isInstant ? '#FFFFFF' : '#001014'} size="small" />
                  ) : (
                    <View style={styles.submitInner}>
                      <Send size={18} color={isInstant ? '#FFFFFF' : '#001014'} strokeWidth={2.5} />
                      <Text style={[styles.submitText, { color: isInstant ? '#FFFFFF' : '#001014' }]}>
                        {submitLabel}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>

        {/* ── Modals ── */}
        <ConfirmModal
          visible={confirmVisible}
          onConfirm={handleConfirmSubmit}
          onCancel={closeConfirm}
          title="Confirm Booking Request"
          message={`Your ${isInstant ? 'instant' : 'scheduled'} ${title ?? 'service'} request is ready.`}
          confirmText="Confirm & Post"
          cancelText="Keep Editing"
          isLoading={isConfirming}
          confirmColor={isInstant ? P.cyan : P.orange}
        />
        <AlertModal
          visible={showSuccessModal}
          onDismiss={handleSuccessModalDismiss}
          title="REQUEST POSTED"
          type="success"
          buttonText="UNDERSTOOD"
          message={`Your service request has been posted successfully. ${isInstant
              ? 'Nearby Ustads can now respond to your request.'
              : 'Available Ustads can now review the details and submit bids.'
            }\n\nYou can track updates from your Jobs tab.`}
        />

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
});

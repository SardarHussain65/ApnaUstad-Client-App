import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
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
  MapPin,
  Camera,
  ShieldCheck,
  Target,
  FileText,
  Banknote,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
  Send,
  CheckCircle2,
  PlayCircle,
  X,
  ClipboardList,
  Mic,
  Square,
  Trash2,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { addAlpha } from '../utils/colorUtils';
import { useCreateJobMutation, useUploadJobImagesMutation, useToast, useConfirmModal } from '../hooks';
import { ConfirmModal, AlertModal } from '../components/ui';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Urgency = 'instant' | 'scheduled';
type EvidenceAsset = { uri: string; type: 'image' | 'video' };

// ─── Design Tokens ────────────────────────────────────────────────────────────
const P = {
  bg: '#060810',
  surface: '#0C0F1A',
  surfaceRaised: '#111527',
  surfaceHigh: '#161B30',
  border: 'rgba(255,255,255,0.06)',
  borderMedium: 'rgba(255,255,255,0.10)',
  cyan: '#00F5FF',
  cyanDim: '#00B8C0',
  cyanMuted: 'rgba(0,245,255,0.10)',
  cyanGlow: 'rgba(0,245,255,0.20)',
  orange: '#FF6B00',
  orangeDim: '#CC5500',
  orangeMuted: 'rgba(255,107,0,0.10)',
  white: '#FFFFFF',
  textPrimary: '#E8EAED',
  textSecondary: '#8892A4',
  textMuted: '#3D4455',
  success: '#00E676',
  purple: '#7B61FF',
  purpleMuted: 'rgba(123,97,255,0.12)',
} as const;

const formatVoiceDuration = (durationMillis: number) => {
  const seconds = Math.max(0, Math.floor(durationMillis / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

// ─── Sub-components ────────────────────────────────────────────────────────────
interface SectionLabelProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  color?: string;
  badge?: string;
}
const SectionLabel = ({ icon: Icon, label, color = P.cyan, badge }: SectionLabelProps) => (
  <View style={sectionStyles.row}>
    <View style={[sectionStyles.iconWrap, { backgroundColor: addAlpha(color, '18') }]}>
      <Icon size={11} color={color} strokeWidth={2.5} />
    </View>
    <Text style={[sectionStyles.label, { color }]}>{label}</Text>
    <View style={[sectionStyles.line, { backgroundColor: addAlpha(color, '22') }]} />
    {!!badge && <Text style={[sectionStyles.badge, { color }]}>{badge}</Text>}
  </View>
);

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  iconWrap: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  line: { flex: 1, height: 1 },
  badge: { fontSize: 9, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
});

interface GlassInputProps {
  children: React.ReactNode;
  style?: object;
  glowColor?: string;
}
const GlassInput = ({ children, style, glowColor }: GlassInputProps) => (
  <View style={[
    glassStyles.card,
    glowColor ? { borderColor: addAlpha(glowColor, '30'), shadowColor: glowColor, shadowOpacity: 0.15, shadowRadius: 12 } : {},
    style,
  ]}>
    {children}
  </View>
);

const glassStyles = StyleSheet.create({
  card: {
    backgroundColor: P.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
});

// ─── Stat Badge ────────────────────────────────────────────────────────────────
interface StatBadgeProps {
  label: string;
  value: string;
  color: string;
}
const StatBadge = ({ label, value, color }: StatBadgeProps) => (
  <View style={badgeStyles.wrap}>
    <Text style={[badgeStyles.value, { color }]}>{value}</Text>
    <Text style={badgeStyles.label}>{label}</Text>
  </View>
);
const badgeStyles = StyleSheet.create({
  wrap: {
    flex: 1, paddingVertical: 7, alignItems: 'center', gap: 2,
  },
  value: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 9, color: P.textMuted, fontWeight: '700', letterSpacing: 1 },
});

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
  const [tempDate, setTempDate] = useState<Date>(new Date(Date.now() + 86_400_000));
  const [tempTime, setTempTime] = useState<string>('10:00');
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      showError('Recording Failed', error instanceof Error ? error.message : 'Could not start the voice note.');
    }
  }, [audioRecorder, showError]);

  const stopVoiceNote = useCallback(async () => {
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      setVoiceNoteUri(audioRecorder.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showError('Recording Failed', error instanceof Error ? error.message : 'Could not save the voice note.');
    }
  }, [audioRecorder, showError]);

  const getNext14Days = useCallback(() => {
    const days = [];
    const start = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const validateSchedule = useCallback((date: Date, timeStr: string): boolean => {
    const [h, m] = timeStr.split(':').map(Number);
    const check = new Date(date);
    check.setHours(h, m, 0, 0);
    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
    return check.getTime() >= oneHourLater.getTime();
  }, []);

  const openSchedulePicker = useCallback(() => {
    setTempDate(scheduledDate);
    setTempTime(scheduledTime);
    setShowPickerModal(true);
  }, [scheduledDate, scheduledTime]);

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
  const hasDescription = description.trim().length > 0;
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
    handleGetLiveLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Location ─────────────────────────────────────────────────────────────
  /**
   * WHY `silent` param:
   * On mount we auto-detect location silently (no error toasts for the user).
   * On manual tap we show feedback. This keeps UX clean on first load.
   */
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
      // Only show error on explicit user tap, not on silent auto-detect
      if (!silent && e instanceof Error) {
        showError('Location Error', e.message || 'Failed to acquire location.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  }, [showError, success]);

  // ─── Media Picker ──────────────────────────────────────────────────────────
  /**
   * Opens the native library for photos or a short video. The backend still uses
   * the `images` multipart field for compatibility, but it now accepts job media.
   */
  const pickMedia = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Access to your photo library is required.');
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const nextAssets: EvidenceAsset[] = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
        }));
        setSelectedMedia((prev) => [...prev, ...nextAssets].slice(0, 5));
      }
    } catch {
      Alert.alert('Error', 'Could not access the media library.');
    }
  }, [selectedMedia.length]);

  const removeMedia = useCallback((indexToRemove: number) => {
    setSelectedMedia((current) => current.filter((_, index) => index !== indexToRemove));
    Haptics.selectionAsync();
  }, []);

  // ─── Submit flow ──────────────────────────────────────────────────────────
  const handlePostJob = useCallback(() => {
    if (!description.trim()) {
      showError('Missing Details', 'Please describe the job.');
      return;
    }
    if (!address.trim() || address === 'Detecting location...') {
      showError('Invalid Location', 'Please provide or detect a deployment address.');
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

  /**
   * WHY FormData for images:
   * The API expects multipart/form-data to receive binary image files.
   * We build the FormData manually because React Native's `fetch` doesn't
   * support the standard File API — we pass an object with `uri`, `name`, `type`.
   */
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
          // WHY cast `as any`: React Native's FormData accepts a special
          // object shape for file uploads that TypeScript doesn't know about.
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
          showError('Deployment Failed', err.message || 'Failed to post job.');
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
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.toggleContainer}>
          <View style={styles.toggleTrack}>
            <View style={[
              styles.toggleHighlight,
              {
                left: isInstant ? 4 : '50%',
                backgroundColor: isInstant ? P.cyanMuted : P.orangeMuted,
                borderColor: isInstant ? P.cyan + '50' : P.orange + '50',
              },
            ]} />
            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => { setUrgency('instant'); Haptics.selectionAsync(); }}
              activeOpacity={0.7}
            >
              <Zap size={13} color={isInstant ? P.cyan : P.textMuted} strokeWidth={2.5} />
              <Text style={[styles.toggleText, isInstant && { color: P.cyan }]}>Instant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => { setUrgency('scheduled'); Haptics.selectionAsync(); }}
              activeOpacity={0.7}
            >
              <Calendar size={13} color={!isInstant ? P.orange : P.textMuted} strokeWidth={2.5} />
              <Text style={[styles.toggleText, !isInstant && { color: P.orange }]}>Schedule</Text>
            </TouchableOpacity>
          </View>
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

          {/* ── Request Summary ── */}
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
            <GlassInput glowColor={description.length > 20 ? P.cyan : undefined}>
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
                <Text style={styles.inputHint}>Include the issue, size, and access details</Text>
                <Text style={styles.charCount}>{description.length}/1000</Text>
              </View>
            </GlassInput>
          </Animated.View>

          {/* ── Budget ── */}
          <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.section}>
            <SectionLabel icon={Banknote} label="YOUR OFFER" color={P.success} badge="Required" />
            <GlassInput glowColor={amount ? P.success : undefined}>
              <View style={styles.budgetRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencySymbol}>PKR</Text>
                </View>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Enter your offered amount"
                  placeholderTextColor={P.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              <View style={styles.quickBudgetRow}>
                {['500', '1000', '2000'].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.quickBudgetChip, amount === value && styles.quickBudgetChipActive]}
                    onPress={() => setAmount(value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.quickBudgetText, amount === value && styles.quickBudgetTextActive]}>
                      Rs. {Number(value).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassInput>
          </Animated.View>

          {/* ── Schedule (conditional) ── */}
          {!isInstant && (
            <Animated.View entering={SlideInRight.duration(400)} style={styles.section}>
              <SectionLabel icon={Calendar} label="VISIT SCHEDULE" color={P.orange} badge="Required" />
              <View style={styles.scheduleRow}>
                <TouchableOpacity
                  style={[styles.scheduleCard, { borderColor: P.orange + '35', backgroundColor: P.orangeMuted }]}
                  activeOpacity={0.7}
                  onPress={openSchedulePicker}
                >
                  <Calendar size={15} color={P.orange} strokeWidth={1.5} />
                  <Text style={[styles.scheduleValue, { color: P.orange }]}>
                    {scheduledDate.toLocaleDateString('en-GB')}
                  </Text>
                  <ChevronDown size={13} color={P.orange + '80'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scheduleCard, { borderColor: P.orange + '35', backgroundColor: P.orangeMuted }]}
                  activeOpacity={0.7}
                  onPress={openSchedulePicker}
                >
                  <Clock size={15} color={P.orange} strokeWidth={1.5} />
                  <Text style={[styles.scheduleValue, { color: P.orange }]}>{scheduledTime}</Text>
                  <ChevronDown size={13} color={P.orange + '80'} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ── Location ── */}
          <Animated.View entering={FadeInDown.delay(320).duration(600)} style={styles.section}>
            <SectionLabel icon={MapPin} label="SERVICE LOCATION" badge="Required" />

            <GlassInput glowColor={P.cyan}>
              <View style={styles.coordRow}>
                <View style={styles.coordDot}>
                  <View style={styles.coordDotInner} />
                </View>
                <Text style={styles.coordText}>
                  {latitude.toFixed(4)}°N · {longitude.toFixed(4)}°E
                </Text>
                {isGettingLocation && (
                  <ActivityIndicator size="small" color={P.cyan} style={{ marginLeft: 'auto' }} />
                )}
              </View>

              <View style={styles.locationRow}>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter the address where service is needed"
                  placeholderTextColor={P.textMuted}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
              </View>
              <TouchableOpacity
                style={styles.locationAction}
                onPress={() => handleGetLiveLocation(false)}
                disabled={isGettingLocation}
                activeOpacity={0.75}
              >
                <Target size={13} color={P.cyanDim} />
                <Text style={styles.locationActionText}>
                  {isGettingLocation ? 'Updating current location...' : 'Use my current location'}
                </Text>
              </TouchableOpacity>
            </GlassInput>
          </Animated.View>

          {/* ── Visual Evidence ── */}
          <Animated.View entering={FadeInDown.delay(380).duration(600)} style={styles.section}>
            <SectionLabel icon={Camera} label="PHOTOS OR VIDEO" color={P.purple} badge="Optional" />

            {selectedMedia.length === 0 ? (
              <TouchableOpacity activeOpacity={0.75} onPress={pickMedia} style={styles.dropzone}>
                {/* Glow scan line */}
                <View style={styles.scanLine} />
                <View style={styles.dropzoneContent}>
                  <View style={[styles.cameraIconWrap, { borderColor: P.purple + '40', backgroundColor: P.purpleMuted }]}>
                    <Camera size={26} color={P.purple} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.dropzoneTitle}>Add photos or a short video</Text>
                  <Text style={styles.dropzoneSubtitle}>Help the Ustad understand the work before accepting</Text>
                </View>
                {/* Corner brackets */}
                <View style={[styles.bracket, styles.bracketTL, { borderColor: P.purple + '50' }]} />
                <View style={[styles.bracket, styles.bracketTR, { borderColor: P.purple + '50' }]} />
                <View style={[styles.bracket, styles.bracketBL, { borderColor: P.purple + '30' }]} />
                <View style={[styles.bracket, styles.bracketBR, { borderColor: P.purple + '30' }]} />
              </TouchableOpacity>
            ) : (
              <View style={styles.imageGrid}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.imageScroll}
                >
                  {selectedMedia.map((asset, i) => (
                    <View key={`${asset.type}-${asset.uri}-${i}`} style={styles.imageThumb}>
                      {asset.type === 'image' ? (
                        <Image source={{ uri: asset.uri }} style={styles.thumbImg} />
                      ) : (
                        <View style={styles.videoThumb}>
                          <PlayCircle size={28} color={P.purple} strokeWidth={1.7} />
                          <Text style={styles.videoThumbText}>Video</Text>
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.65)']}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={styles.thumbBadge}>
                        <Text style={styles.thumbIndex}>{i + 1}</Text>
                      </View>
                      <View style={styles.thumbTypeBadge}>
                        <Text style={styles.thumbTypeText}>{asset.type === 'video' ? 'VID' : 'IMG'}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => removeMedia(i)}
                        activeOpacity={0.75}
                      >
                        <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {selectedMedia.length < 5 && (
                    <TouchableOpacity onPress={pickMedia} style={styles.addMoreBtn} activeOpacity={0.7}>
                      <Plus size={20} color={P.textSecondary} />
                      <Text style={styles.addMoreText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
                <View style={styles.mediaSummaryRow}>
                  <Text style={styles.mediaSummaryText}>{selectedImageCount} photos</Text>
                  <Text style={styles.mediaSummaryDot}>•</Text>
                  <Text style={styles.mediaSummaryText}>{selectedVideoCount} videos</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMedia([])} style={styles.clearImages} activeOpacity={0.7}>
                  <Text style={styles.clearImagesText}>Clear all media</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* ── Voice Brief ── */}
          <Animated.View entering={FadeInDown.delay(420).duration(600)} style={styles.section}>
            <SectionLabel icon={Mic} label="VOICE BRIEF" color={P.orange} badge="Optional · Max 60s" />
            <GlassInput glowColor={recorderState.isRecording || voiceNoteUri ? P.orange : undefined}>
              <View style={styles.voiceNoteRow}>
                <View style={[styles.voiceNoteIcon, recorderState.isRecording && styles.voiceNoteIconRecording]}>
                  <Mic size={19} color={P.orange} strokeWidth={2.2} />
                </View>
                <View style={styles.voiceNoteCopy}>
                  <Text style={styles.voiceNoteTitle}>
                    {recorderState.isRecording ? 'Recording job explanation' : voiceNoteUri ? 'Voice brief attached' : 'Explain the work in your own words'}
                  </Text>
                  <Text style={styles.voiceNoteSubtitle}>
                    {recorderState.isRecording
                      ? `${formatVoiceDuration(recorderState.durationMillis)} / 1:00`
                      : voiceNoteUri
                        ? 'Workers can listen before they respond'
                        : 'Useful when the issue is easier to explain than type'}
                  </Text>
                </View>
                {recorderState.isRecording ? (
                  <TouchableOpacity style={styles.voiceNoteAction} onPress={stopVoiceNote}>
                    <Square size={15} color="#001014" fill="#001014" />
                  </TouchableOpacity>
                ) : voiceNoteUri ? (
                  <TouchableOpacity style={styles.voiceNoteRemove} onPress={() => setVoiceNoteUri(null)}>
                    <Trash2 size={16} color="#FF6B63" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.voiceNoteAction} onPress={startVoiceNote}>
                    <Mic size={16} color="#001014" strokeWidth={2.7} />
                  </TouchableOpacity>
                )}
              </View>
            </GlassInput>
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
          title="Post Service Request"
          message={`Your ${isInstant ? 'instant' : 'scheduled'} ${title ?? 'service'} request is ready to post.`}
          confirmText="Post Request"
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
        <Modal visible={showPickerModal} transparent animationType="fade" onRequestClose={() => setShowPickerModal(false)}>
          <View style={pickerModalStyles.backdrop}>
            <BlurView intensity={35} style={StyleSheet.absoluteFill} tint="dark" />
            <View style={pickerModalStyles.container}>
              <Text style={pickerModalStyles.title}>Schedule Visit</Text>
              <Text style={pickerModalStyles.subtitle}>Choose a date and time for the service</Text>

              {/* Date Horizontal Picker */}
              <Text style={pickerModalStyles.sectionTitle}>Select Date</Text>
              <View style={pickerModalStyles.dateScrollWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pickerModalStyles.dateScroll}>
                  {getNext14Days().map((day, idx) => {
                    const isSelected = day.toDateString() === tempDate.toDateString();
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          pickerModalStyles.dateCard,
                          isSelected && { borderColor: P.orange, backgroundColor: 'rgba(255, 107, 0, 0.15)' },
                        ]}
                        onPress={() => {
                          setTempDate(day);
                          Haptics.selectionAsync();
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[pickerModalStyles.dateDayText, isSelected && { color: P.orange }]}>
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </Text>
                        <Text style={[pickerModalStyles.dateNumText, isSelected && { color: P.orange }]}>
                          {day.getDate()}
                        </Text>
                        <Text style={pickerModalStyles.dateMonthText}>
                          {day.toLocaleDateString('en-US', { month: 'short' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Time Picker Block */}
              <Text style={pickerModalStyles.sectionTitle}>Adjust Time (24h)</Text>
              <View style={pickerModalStyles.timeRow}>
                {/* Hours Column */}
                <View style={pickerModalStyles.timeCol}>
                  <TouchableOpacity
                    style={pickerModalStyles.timeBtn}
                    onPress={() => {
                      const [h, m] = tempTime.split(':').map(Number);
                      const nextH = (h + 1) % 24;
                      setTempTime(`${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <ChevronUp size={22} color={P.textSecondary} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={pickerModalStyles.timeVal}>{tempTime.split(':')[0]}</Text>
                  <TouchableOpacity
                    style={pickerModalStyles.timeBtn}
                    onPress={() => {
                      const [h, m] = tempTime.split(':').map(Number);
                      const nextH = (h - 1 + 24) % 24;
                      setTempTime(`${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <ChevronDown size={22} color={P.textSecondary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                <Text style={pickerModalStyles.timeColon}>:</Text>

                {/* Minutes Column */}
                <View style={pickerModalStyles.timeCol}>
                  <TouchableOpacity
                    style={pickerModalStyles.timeBtn}
                    onPress={() => {
                      const [h, m] = tempTime.split(':').map(Number);
                      const nextM = (m + 5) % 60;
                      setTempTime(`${String(h).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <ChevronUp size={22} color={P.textSecondary} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={pickerModalStyles.timeVal}>{tempTime.split(':')[1]}</Text>
                  <TouchableOpacity
                    style={pickerModalStyles.timeBtn}
                    onPress={() => {
                      const [h, m] = tempTime.split(':').map(Number);
                      const nextM = (m - 5 + 60) % 60;
                      setTempTime(`${String(h).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <ChevronDown size={22} color={P.textSecondary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Validation Status Indicator */}
              <View style={pickerModalStyles.statusContainer}>
                {validateSchedule(tempDate, tempTime) ? (
                  <View style={[pickerModalStyles.statusPill, { backgroundColor: 'rgba(0, 230, 118, 0.08)', borderColor: 'rgba(0, 230, 118, 0.2)' }]}>
                    <CheckCircle2 size={13} color={P.success} />
                    <Text style={[pickerModalStyles.statusText, { color: P.success }]}>SCHEDULE IS AVAILABLE</Text>
                  </View>
                ) : (
                  <View style={[pickerModalStyles.statusPill, { backgroundColor: 'rgba(255, 107, 0, 0.08)', borderColor: 'rgba(255, 107, 0, 0.2)' }]}>
                    <AlertCircle size={13} color={P.orange} />
                    <Text style={[pickerModalStyles.statusText, { color: P.orange }]}>CHOOSE AT LEAST 1 HOUR FROM NOW</Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={pickerModalStyles.actionRow}>
                <TouchableOpacity
                  style={[pickerModalStyles.btn, pickerModalStyles.btnCancel]}
                  onPress={() => setShowPickerModal(false)}
                  activeOpacity={0.75}
                >
                  <Text style={pickerModalStyles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    pickerModalStyles.btn,
                    pickerModalStyles.btnSave,
                    !validateSchedule(tempDate, tempTime) && { opacity: 0.4 },
                  ]}
                  disabled={!validateSchedule(tempDate, tempTime)}
                  onPress={() => {
                    setScheduledDate(tempDate);
                    setScheduledTime(tempTime);
                    setShowPickerModal(false);
                    success('Schedule Saved', `Visit scheduled for ${tempDate.toLocaleDateString('en-GB')} at ${tempTime}`);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={pickerModalStyles.btnSaveText}>Lock Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

  // Toggle
  toggleContainer: { paddingHorizontal: 20, marginBottom: 18 },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: P.surfaceRaised,
    borderRadius: 14, borderWidth: 1, borderColor: P.border,
    padding: 4, position: 'relative', height: 46,
  },
  toggleHighlight: {
    position: 'absolute', top: 4, bottom: 4,
    width: '50%', borderRadius: 11, borderWidth: 1,
  },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, zIndex: 1,
  },
  toggleText: {
    fontSize: 13, fontWeight: '700', color: P.textMuted, letterSpacing: 0.3,
  },

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

  // Budget
  budgetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  currencyBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: P.surface, borderRadius: 7,
    borderWidth: 1, borderColor: P.border,
  },
  currencySymbol: {
    fontSize: 11, fontWeight: '800', color: P.textSecondary, letterSpacing: 1,
  },
  budgetInput: {
    flex: 1, fontSize: 22, fontWeight: '700',
    color: P.textPrimary, paddingVertical: 0,
  },
  quickBudgetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 13,
  },
  quickBudgetChip: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  quickBudgetChipActive: {
    borderColor: addAlpha(P.success, '55'),
    backgroundColor: addAlpha(P.success, '12'),
  },
  quickBudgetText: {
    fontSize: 10,
    color: P.textSecondary,
    fontWeight: '800',
  },
  quickBudgetTextActive: {
    color: P.success,
  },

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

  // Location
  coordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: P.border,
  },
  coordDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: P.cyanMuted, borderWidth: 1.5, borderColor: P.cyan,
    alignItems: 'center', justifyContent: 'center',
  },
  coordDotInner: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: P.cyan },
  coordText: { fontSize: 11, color: P.cyanDim, fontWeight: '700', letterSpacing: 0.5 },
  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  locationInput: {
    flex: 1, fontSize: 14, color: P.textPrimary,
    fontWeight: '500', paddingVertical: 2, lineHeight: 20,
  },
  locationAction: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: P.border,
    backgroundColor: 'rgba(0,245,255,0.025)',
  },
  locationActionText: { color: P.cyanDim, fontSize: 12, fontWeight: '700' },

  // Dropzone
  dropzone: {
    height: 145, borderRadius: 18,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: P.textMuted + '50',
    backgroundColor: P.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  scanLine: {
    position: 'absolute', top: '50%', width: '65%',
    height: 1, backgroundColor: P.purple,
    opacity: 0.18, shadowColor: P.purple,
    shadowOpacity: 1, shadowRadius: 8, elevation: 4,
  },
  dropzoneContent: { alignItems: 'center', gap: 8 },
  cameraIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  dropzoneTitle: {
    fontSize: 13, fontWeight: '700', color: P.textSecondary, letterSpacing: 0.5,
  },
  dropzoneSubtitle: {
    maxWidth: 260,
    fontSize: 11,
    color: P.textMuted,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  bracket: {
    position: 'absolute', width: 14, height: 14,
  },
  bracketTL: { top: 10, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 4 },
  bracketTR: { top: 10, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 4 },
  bracketBL: { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 4 },
  bracketBR: { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 4 },

  // Image Grid
  imageGrid: {
    backgroundColor: P.surfaceRaised,
    borderRadius: 18, borderWidth: 1, borderColor: P.border, overflow: 'hidden',
  },
  imageScroll: { padding: 12, gap: 10 },
  imageThumb: {
    width: 95, height: 95, borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  videoThumb: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: P.purpleMuted,
  },
  videoThumbText: {
    color: P.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.6,
  },
  thumbBadge: {
    position: 'absolute', bottom: 6, left: 6,
    width: 18, height: 18, borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbIndex: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.8)' },
  thumbTypeBadge: {
    position: 'absolute', top: 6, right: 6,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: P.purple + '55',
  },
  thumbTypeText: { fontSize: 8, color: P.purple, fontWeight: '900', letterSpacing: 0.8 },
  removeMediaBtn: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreBtn: {
    width: 95, height: 95, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.border,
    alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  addMoreText: { fontSize: 9, color: P.textMuted, fontWeight: '700' },
  mediaSummaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingBottom: 8,
  },
  mediaSummaryText: {
    fontSize: 11, color: P.textSecondary, fontWeight: '800', letterSpacing: 0.3,
  },
  mediaSummaryDot: {
    color: P.textMuted, fontSize: 12, fontWeight: '900',
  },
  clearImages: {
    paddingVertical: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: P.border,
  },
  clearImagesText: { fontSize: 12, color: P.textSecondary, fontWeight: '600' },

  // Voice note
  voiceNoteRow: {
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceNoteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.30)',
  },
  voiceNoteIconRecording: {
    backgroundColor: 'rgba(255,59,48,0.16)',
    borderColor: 'rgba(255,59,48,0.42)',
  },
  voiceNoteCopy: {
    flex: 1,
    gap: 4,
  },
  voiceNoteTitle: {
    color: P.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  voiceNoteSubtitle: {
    color: P.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  voiceNoteAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.orange,
  },
  voiceNoteRemove: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.24)',
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

const pickerModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0C0F1A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  title: {
    color: '#E8EAED',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8892A4',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    color: '#FF6B00',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 10,
  },
  dateScrollWrapper: {
    height: 94,
    width: '100%',
    marginBottom: 16,
  },
  dateScroll: {
    gap: 8,
    paddingRight: 10,
  },
  dateCard: {
    width: 62,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#111527',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateDayText: {
    color: '#8892A4',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dateNumText: {
    color: '#E8EAED',
    fontSize: 19,
    fontWeight: '900',
  },
  dateMonthText: {
    color: '#3D4455',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 10,
  },
  timeCol: {
    alignItems: 'center',
    gap: 4,
  },
  timeBtn: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  timeVal: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timeColon: {
    color: '#8892A4',
    fontSize: 32,
    fontWeight: '900',
    paddingBottom: 4,
  },
  statusContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnCancelText: {
    color: '#E8EAED',
    fontSize: 13,
    fontWeight: '800',
  },
  btnSave: {
    backgroundColor: '#FF6B00',
  },
  btnSaveText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
});

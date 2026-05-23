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
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Camera,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Banknote,
  Plus,
  ChevronDown,
  Zap,
  Send,
  CheckCircle2,
  Navigation,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { addAlpha } from '../utils/colorUtils';
import { useCreateJobMutation, useUploadJobImagesMutation, useToast, useConfirmModal } from '../hooks';
import { ConfirmModal, AlertModal } from '../components/ui';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Urgency = 'instant' | 'scheduled';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Sub-components ────────────────────────────────────────────────────────────
interface SectionLabelProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  color?: string;
}
const SectionLabel = ({ icon: Icon, label, color = P.cyan }: SectionLabelProps) => (
  <View style={sectionStyles.row}>
    <View style={[sectionStyles.iconWrap, { backgroundColor: addAlpha(color, '18') }]}>
      <Icon size={11} color={color} strokeWidth={2.5} />
    </View>
    <Text style={[sectionStyles.label, { color }]}>{label}</Text>
    <View style={[sectionStyles.line, { backgroundColor: addAlpha(color, '22') }]} />
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
  <View style={[badgeStyles.wrap, { borderColor: addAlpha(color, '25'), backgroundColor: addAlpha(color, '0C') }]}>
    <Text style={[badgeStyles.value, { color }]}>{value}</Text>
    <Text style={badgeStyles.label}>{label}</Text>
  </View>
);
const badgeStyles = StyleSheet.create({
  wrap: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', gap: 2,
  },
  value: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
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
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [address, setAddress] = useState<string>('Detecting location...');
  const [latitude, setLatitude] = useState<number>(33.6927);
  const [longitude, setLongitude] = useState<number>(73.0743);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 86_400_000));
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const { mutate: createJob, isPending: isSubmittingJob } = useCreateJobMutation();
  const { mutateAsync: uploadImages } = useUploadJobImagesMutation();
  const isSubmitting = isSubmittingJob || isConfirming;

  const accentColor: string = color ?? P.cyan;
  const isInstant = urgency === 'instant';

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

  // ─── Image Picker ──────────────────────────────────────────────────────────
  /**
   * WHY `launchImageLibraryAsync`:
   * Opens the native photo library. `allowsMultipleSelection` + `selectionLimit`
   * controls how many photos the user can pick at once.
   * `quality: 0.5` reduces file size before upload.
   */
  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Access to your photo library is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        aspect: [16, 9],
        quality: 0.5,
      });
      if (!result.canceled && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedImages(result.assets.map((a) => a.uri));
      }
    } catch {
      Alert.alert('Error', 'Could not access the image library.');
    }
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
    showConfirm(
      'Confirm Deployment',
      `You're about to ${isInstant ? 'instantly dispatch' : 'schedule'} this mission. Ready?`,
      handleConfirmSubmit,
      closeConfirm,
      'Deploy Now',
      'Review Again',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, address, isInstant]);

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

      if (selectedImages.length > 0) {
        const formData = new FormData();
        selectedImages.forEach((uri, i) => {
          const filename = uri.split('/').pop() ?? `image_${i}.jpg`;
          const ext = /\.(\w+)$/.exec(filename);
          const type = ext ? `image/${ext[1]}` : 'image/jpeg';
          // WHY cast `as any`: React Native's FormData accepts a special
          // object shape for file uploads that TypeScript doesn't know about.
          formData.append('images', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: filename,
            type,
          } as unknown as Blob);
        });
        const response = await uploadImages(formData);
        uploadedImageUrls = response.imageUrls ?? [];
      }

      const payload = {
        category: title ?? 'General',
        description,
        urgency,
        address,
        amount: amount ? parseFloat(amount) : 0,
        imageUrls: uploadedImageUrls,
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
      showError('Upload Failed', err instanceof Error ? err.message : 'Failed to upload images.');
    }
  }, [
    selectedImages, uploadImages, title, description, urgency,
    address, amount, longitude, latitude, targetWorkerId,
    isInstant, scheduledDate, scheduledTime,
    createJob, closeConfirm, showError, setConfirmLoading,
  ]);

  const handleSuccessModalDismiss = useCallback(() => {
    setShowSuccessModal(false);
    if (isInstant) {
      router.push({ pathname: '/finding-worker', params: { jobId: createdJobId } });
    } else {
      router.push('/(tabs)/bookings');
    }
  }, [isInstant, createdJobId, router]);

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
            <Text style={styles.headerEyebrow}>MISSION CONTROL</Text>
            <Text style={styles.headerTitle}>Deploy Mission</Text>
          </View>

          {/* Live status indicator */}
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: isInstant ? P.cyan : P.orange }]} />
            <Text style={[styles.liveText, { color: isInstant ? P.cyan : P.orange }]}>
              {isInstant ? 'LIVE' : 'SCHED'}
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

        {/* ── Scrollable Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Mission Header Card ── */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)} style={[styles.missionCard, { borderColor: addAlpha(accentColor, '20') }]}>
            <LinearGradient
              colors={[addAlpha(accentColor, '15'), addAlpha(P.surface, 'AA')]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1.2, y: 1.2 }}
              style={styles.missionCardGradient}
            >
              {/* Decorative corner accents */}
              <View style={[styles.cornerTL, { borderColor: accentColor + '50' }]} />
              <View style={[styles.cornerBR, { borderColor: accentColor + '25' }]} />

              <View style={styles.missionCardInner}>
                {/* Icon orb */}
                <View style={[styles.orbWrap, { borderColor: addAlpha(accentColor, '50') }]}>
                  <LinearGradient
                    colors={[addAlpha(accentColor, '25'), addAlpha(accentColor, '05')]}
                    style={StyleSheet.absoluteFill}
                  />
                  {targetWorkerName
                    ? <Target color={accentColor} size={24} strokeWidth={1.5} />
                    : <Sparkles color={accentColor} size={24} strokeWidth={1.5} />}
                </View>

                <View style={styles.missionMeta}>
                  <Text style={[styles.missionEyebrow, { color: accentColor }]}>
                    {targetWorkerName ? 'TARGET SPECIALIST' : 'MISSION OBJECTIVE'}
                  </Text>
                  <Text style={styles.missionName} numberOfLines={1}>
                    {targetWorkerName ?? title}
                  </Text>
                  {targetWorkerName && (
                    <Text style={styles.missionSub}>Protocol: {title}</Text>
                  )}
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <StatBadge
                  label="URGENCY"
                  value={isInstant ? 'NOW' : 'LATER'}
                  color={isInstant ? P.cyan : P.orange}
                />
                <StatBadge
                  label="IMAGES"
                  value={`${selectedImages.length}/5`}
                  color={P.purple}
                />
                <StatBadge
                  label="BUDGET"
                  value={amount ? `₨${amount}` : 'OPEN'}
                  color={P.success}
                />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Mission Briefing ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
            <SectionLabel icon={Terminal} label="MISSION BRIEFING" />
            <GlassInput glowColor={description.length > 20 ? P.cyan : undefined}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the anomaly… (e.g., Pipe burst, leaking valve)"
                placeholderTextColor={P.textMuted}
                multiline
                numberOfLines={5}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
              <View style={styles.inputFooter}>
                <View style={[styles.charBar, { width: `${Math.min(description.length / 3, 100)}%`, backgroundColor: P.cyan + '40' }]} />
                <Text style={styles.charCount}>{description.length} chars</Text>
              </View>
            </GlassInput>
          </Animated.View>

          {/* ── Budget ── */}
          <Animated.View entering={FadeInDown.delay(260).duration(600)} style={styles.section}>
            <SectionLabel icon={Banknote} label="BUDGET ALLOCATION" color={P.success} />
            <GlassInput glowColor={amount ? P.success : undefined}>
              <View style={styles.budgetRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencySymbol}>PKR</Text>
                </View>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Enter amount"
                  placeholderTextColor={P.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
                <View style={styles.optionalBadge}>
                  <Text style={styles.budgetOptional}>Optional</Text>
                </View>
              </View>
            </GlassInput>
          </Animated.View>

          {/* ── Schedule (conditional) ── */}
          {!isInstant && (
            <Animated.View entering={SlideInRight.duration(400)} style={styles.section}>
              <SectionLabel icon={Calendar} label="SCHEDULE PROTOCOL" color={P.orange} />
              <View style={styles.scheduleRow}>
                <TouchableOpacity
                  style={[styles.scheduleCard, { borderColor: P.orange + '35', backgroundColor: P.orangeMuted }]}
                  activeOpacity={0.7}
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
            <SectionLabel icon={MapPin} label="DEPLOYMENT ZONE" />

            <GlassInput glowColor={P.cyan}>
              {/* Animated coordinate indicator */}
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

              {/* Address input row */}
              <View style={styles.locationRow}>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter or detect deployment address"
                  placeholderTextColor={P.textMuted}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.locBtn, isGettingLocation && { opacity: 0.5 }]}
                  onPress={() => handleGetLiveLocation(false)}
                  disabled={isGettingLocation}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={[P.cyan + '30', P.cyan + '10']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Navigation size={15} color={P.cyan} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </GlassInput>

            {/* Live location shortcut */}
            <TouchableOpacity
              style={styles.liveLocBtn}
              onPress={() => handleGetLiveLocation(false)}
              disabled={isGettingLocation}
              activeOpacity={0.7}
            >
              <Target size={13} color={P.cyanDim} />
              <Text style={styles.liveLocText}>
                {isGettingLocation ? 'Acquiring GPS signal…' : 'Use Current Live Location'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Visual Evidence ── */}
          <Animated.View entering={FadeInDown.delay(380).duration(600)} style={styles.section}>
            <SectionLabel icon={Camera} label="VISUAL EVIDENCE" color={P.purple} />

            {selectedImages.length === 0 ? (
              <TouchableOpacity activeOpacity={0.75} onPress={pickImage} style={styles.dropzone}>
                {/* Glow scan line */}
                <View style={styles.scanLine} />
                <View style={styles.dropzoneContent}>
                  <View style={[styles.cameraIconWrap, { borderColor: P.purple + '40', backgroundColor: P.purpleMuted }]}>
                    <Camera size={26} color={P.purple} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.dropzoneTitle}>Attach Evidence</Text>
                  <Text style={styles.dropzoneSubtitle}>Tap to upload photos · Max 5 files</Text>
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
                  {selectedImages.map((uri, i) => (
                    <View key={`img-${i}`} style={styles.imageThumb}>
                      <Image source={{ uri }} style={styles.thumbImg} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.65)']}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={styles.thumbBadge}>
                        <Text style={styles.thumbIndex}>{i + 1}</Text>
                      </View>
                    </View>
                  ))}
                  {selectedImages.length < 5 && (
                    <TouchableOpacity onPress={pickImage} style={styles.addMoreBtn} activeOpacity={0.7}>
                      <Plus size={20} color={P.textSecondary} />
                      <Text style={styles.addMoreText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
                <TouchableOpacity onPress={() => setSelectedImages([])} style={styles.clearImages} activeOpacity={0.7}>
                  <Text style={styles.clearImagesText}>✕  Clear all images</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View entering={FadeInUp.delay(450).duration(600)} style={styles.footer}>
            {/* Security badge */}
            <View style={styles.securityNote}>
              <ShieldCheck size={12} color={P.cyanDim} strokeWidth={2} />
              <Text style={styles.securityText}>Secured via ApnaUstad Protocol v2.4</Text>
              <CheckCircle2 size={12} color={P.success} strokeWidth={2} />
            </View>

            {/* Deploy button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePostJob}
              disabled={isSubmitting}
              style={[styles.submitWrapper, isSubmitting && { opacity: 0.7 }]}
            >
              <LinearGradient
                colors={isInstant
                  ? [P.cyan, P.cyanDim]
                  : [P.orange, P.orangeDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View style={styles.submitInner}>
                    <Send size={17} color="#000" strokeWidth={2.5} />
                    <Text style={styles.submitText}>
                      {targetWorkerId
                        ? 'Initiate Direct Dispatch'
                        : isInstant
                          ? 'Initiate Instant Dispatch'
                          : 'Broadcast to Market'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 48 }} />
        </ScrollView>

        {/* ── Modals ── */}
        <ConfirmModal
          visible={confirmVisible}
          onConfirm={handleConfirmSubmit}
          onCancel={closeConfirm}
          title="Confirm Deployment"
          message={`You're about to ${isInstant ? 'instantly dispatch' : 'broadcast'} this mission. Are you ready?`}
          confirmText="Deploy Now"
          cancelText="Review Again"
          isLoading={isConfirming}
          confirmColor={isInstant ? P.cyan : P.orange}
        />
        <AlertModal
          visible={showSuccessModal}
          onDismiss={handleSuccessModalDismiss}
          title="MISSION DEPLOYED"
          type="success"
          buttonText="UNDERSTOOD"
          message={`Your mission has been successfully broadcasted. ${isInstant
              ? 'Our AI is now scouting for the nearest specialist.'
              : 'Specialists will review your briefing and submit bids shortly.'
            }\n\nTrack progress in your Mission Log.`}
        />
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

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

  // Mission Card
  missionCard: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, marginBottom: 26,
  },
  missionCardGradient: { padding: 18 },
  cornerTL: {
    position: 'absolute', top: 10, left: 10,
    width: 16, height: 16,
    borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 3,
  },
  cornerBR: {
    position: 'absolute', bottom: 10, right: 10,
    width: 11, height: 11,
    borderBottomWidth: 1, borderRightWidth: 1, borderRadius: 2,
  },
  missionCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16,
  },
  orbWrap: {
    width: 54, height: 54, borderRadius: 16,
    borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  missionMeta: { flex: 1 },
  missionEyebrow: {
    fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 3,
  },
  missionName: {
    fontSize: 19, fontWeight: '800', color: P.white, letterSpacing: -0.3,
  },
  missionSub: {
    fontSize: 11, color: P.textSecondary, fontWeight: '600',
    marginTop: 3, letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
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
  charBar: {
    height: 2, borderRadius: 1, maxWidth: '70%', minWidth: 4,
    // WHY: visual progress bar shows user how much they've typed
  },
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
  optionalBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: P.surface, borderRadius: 7,
    borderWidth: 1, borderColor: P.border,
  },
  budgetOptional: {
    fontSize: 9, color: P.textMuted, fontWeight: '700', letterSpacing: 0.5,
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
  locBtn: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: P.cyanGlow, overflow: 'hidden',
  },
  liveLocBtn: {
    paddingVertical: 8, flexDirection: 'row',
    justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 4,
  },
  liveLocText: { color: P.cyanDim, fontSize: 12, fontWeight: '700' },

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
  dropzoneSubtitle: { fontSize: 11, color: P.textMuted, fontWeight: '500' },
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
  thumbBadge: {
    position: 'absolute', bottom: 6, left: 6,
    width: 18, height: 18, borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbIndex: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.8)' },
  addMoreBtn: {
    width: 95, height: 95, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.border,
    alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  addMoreText: { fontSize: 9, color: P.textMuted, fontWeight: '700' },
  clearImages: {
    paddingVertical: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: P.border,
  },
  clearImagesText: { fontSize: 12, color: P.textSecondary, fontWeight: '600' },

  // Footer
  footer: { marginTop: 4, gap: 16 },
  securityNote: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  securityText: {
    fontSize: 11, color: P.textMuted, fontWeight: '600', letterSpacing: 0.3,
  },
  submitWrapper: { borderRadius: 17, overflow: 'hidden' },
  submitGradient: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: {
    fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.4,
  },
});
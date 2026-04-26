import React, { useState, useRef } from 'react';
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
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../constants/Theme';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { AnimatedButton } from '../components/AnimatedButton';
import { useCreateJobMutation, useUploadJobImagesMutation, useToast, useConfirmModal } from '../hooks';
import { ConfirmModal, AlertModal } from '../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Urgency = 'instant' | 'scheduled';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PALETTE = {
  bg: '#060810',
  surface: '#0C0F1A',
  surfaceRaised: '#111527',
  border: 'rgba(255,255,255,0.06)',
  borderGlow: 'rgba(0,245,255,0.25)',
  cyan: '#00F5FF',
  cyanDim: '#00B8C0',
  cyanMuted: 'rgba(0,245,255,0.12)',
  orange: '#FF6B00',
  orangeMuted: 'rgba(255,107,0,0.12)',
  white: '#FFFFFF',
  textPrimary: '#E8EAED',
  textSecondary: '#7A8394',
  textMuted: '#3D4455',
  success: '#00E676',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel = ({ icon: Icon, label, color = PALETTE.cyan }: any) => (
  <View style={sectionStyles.row}>
    <View style={[sectionStyles.iconWrap, { backgroundColor: color + '18' }]}>
      <Icon size={12} color={color} strokeWidth={2.5} />
    </View>
    <Text style={[sectionStyles.label, { color }]}>{label}</Text>
    <View style={[sectionStyles.line, { backgroundColor: color + '22' }]} />
  </View>
);

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  iconWrap: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 10, fontWeight: '800', letterSpacing: 2,
  },
  line: {
    flex: 1, height: 1,
  },
});

const GlassInput = ({ children, style }: any) => (
  <View style={[glassStyles.card, style]}>
    {children}
  </View>
);

const glassStyles = StyleSheet.create({
  card: {
    backgroundColor: PALETTE.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function JobCreationScreen() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const {
    visible: confirmVisible, showConfirm, closeConfirm,
    isLoading: isConfirming, setLoading: setConfirmLoading,
  } = useConfirmModal();

  const {
    title, color, initialDescription, targetWorkerId,
    targetWorkerName, urgency: urgencyParam,
  } = useLocalSearchParams<{
    title: string; color: string; initialDescription?: string;
    targetWorkerId?: string; targetWorkerName?: string; urgency?: Urgency;
  }>();

  const [urgency, setUrgency] = useState<Urgency>(urgencyParam || 'instant');
  const [description, setDescription] = useState(initialDescription || '');
  const [amount, setAmount] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [address, setAddress] = useState('123 Cyber St, Neo Lahore');
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 86400000));
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const { mutate: createJob, isPending: isSubmittingJob } = useCreateJobMutation();
  const { mutateAsync: uploadImages } = useUploadJobImagesMutation();
  const isSubmitting = isSubmittingJob || isConfirming;

  const accentColor = color || PALETTE.cyan;
  const isInstant = urgency === 'instant';

  // ─── Image Picker ────────────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Visual evidence requires access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        aspect: [16, 9],
        quality: 0.5,
      });
      if (!result.canceled && result.assets?.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedImages(result.assets.map(a => a.uri));
      }
    } catch {
      Alert.alert('Image Pick Error', 'Could not access the image library.');
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handlePostJob = async () => {
    if (!description.trim()) {
      showError('Missing Details', 'Please describe the job');
      return;
    }
    showConfirm(
      'Confirm Deployment',
      `You're about to ${isInstant ? 'instantly dispatch' : 'broadcast'} this mission. Ready?`,
      handleConfirmSubmit, closeConfirm,
      'Deploy Now', 'Review Again',
    );
  };

  const handleConfirmSubmit = async () => {
    setConfirmLoading(true);
    try {
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        const formData = new FormData();
        selectedImages.forEach((uri, i) => {
          const filename = uri.split('/').pop() || `image_${i}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append('images', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: filename, type,
          } as any);
        });
        const response = await uploadImages(formData);
        uploadedImageUrls = response.imageUrls || [];
      }

      const payload = {
        category: title || 'General', description,
        urgency, address,
        amount: amount ? parseFloat(amount) : 0,
        imageUrls: uploadedImageUrls,
        longitude: 74.3587, latitude: 31.5204,
        targetWorkerId,
        scheduledDate: !isInstant ? scheduledDate : undefined,
        scheduledTime: !isInstant ? scheduledTime : undefined,
      };

      createJob(payload, {
        onSuccess: (response) => {
          setConfirmLoading(false); closeConfirm();
          setCreatedJobId(response._id);
          setShowSuccessModal(true);
        },
        onError: (error) => {
          setConfirmLoading(false);
          showError('Deployment Failed', error.message || 'Failed to post job.');
        },
      });
    } catch (error: any) {
      setConfirmLoading(false);
      showError('Upload Failed', error.message || 'Failed to upload images.');
    }
  };

  const handleSuccessModalDismiss = () => {
    setShowSuccessModal(false);
    if (isInstant) router.push({ pathname: '/finding-worker', params: { jobId: createdJobId } });
    else router.push('/(tabs)/bookings');
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={PALETTE.textPrimary} size={20} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>MISSION CONTROL</Text>
            <Text style={styles.headerTitle}>Deploy Mission</Text>
          </View>

          <View style={[styles.statusDot, { backgroundColor: isInstant ? PALETTE.cyan : PALETTE.orange }]} />
        </Animated.View>

        {/* ── Urgency Toggle ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.toggleContainer}>
          <View style={styles.toggleTrack}>
            {/* sliding highlight */}
            <View style={[
              styles.toggleHighlight,
              {
                left: isInstant ? 4 : '50%',
                backgroundColor: isInstant ? PALETTE.cyan + '20' : PALETTE.orange + '20',
                borderColor: isInstant ? PALETTE.cyan + '50' : PALETTE.orange + '50',
              }
            ]} />
            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => { setUrgency('instant'); Haptics.selectionAsync(); }}
            >
              <Zap size={13} color={isInstant ? PALETTE.cyan : PALETTE.textMuted} strokeWidth={2.5} />
              <Text style={[styles.toggleText, isInstant && { color: PALETTE.cyan }]}>Instant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => { setUrgency('scheduled'); Haptics.selectionAsync(); }}
            >
              <Calendar size={13} color={!isInstant ? PALETTE.orange : PALETTE.textMuted} strokeWidth={2.5} />
              <Text style={[styles.toggleText, !isInstant && { color: PALETTE.orange }]}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Mission Header Card ── */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.missionCard}>
            <LinearGradient
              colors={[accentColor + '18', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.missionCardGradient}
            >
              {/* Corner accents */}
              <View style={[styles.cornerTL, { borderColor: accentColor + '60' }]} />
              <View style={[styles.cornerBR, { borderColor: accentColor + '30' }]} />

              <View style={styles.missionCardInner}>
                <View style={[styles.orbWrap, { borderColor: accentColor + '50', shadowColor: accentColor }]}>
                  <LinearGradient
                    colors={[accentColor + '30', accentColor + '08']}
                    style={StyleSheet.absoluteFill}
                  // borderRadius={28}
                  />
                  {targetWorkerName
                    ? <Target color={accentColor} size={26} strokeWidth={1.5} />
                    : <Sparkles color={accentColor} size={26} strokeWidth={1.5} />}
                </View>

                <View style={styles.missionMeta}>
                  <Text style={[styles.missionEyebrow, { color: accentColor }]}>
                    {targetWorkerName ? 'TARGET SPECIALIST' : 'MISSION OBJECTIVE'}
                  </Text>
                  <Text style={styles.missionName} numberOfLines={1}>
                    {targetWorkerName ? targetWorkerName : title}
                  </Text>
                  {targetWorkerName && (
                    <Text style={styles.missionSub}>Protocol: {title}</Text>
                  )}
                </View>

                <View style={[styles.urgencyBadge,
                {
                  backgroundColor: isInstant ? PALETTE.cyan + '18' : PALETTE.orange + '18',
                  borderColor: isInstant ? PALETTE.cyan + '40' : PALETTE.orange + '40'
                }]}>
                  <Text style={[styles.urgencyBadgeText,
                  { color: isInstant ? PALETTE.cyan : PALETTE.orange }]}>
                    {isInstant ? 'LIVE' : 'SCHED'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Mission Briefing ── */}
          <Animated.View entering={FadeInDown.delay(220).duration(600)} style={styles.section}>
            <SectionLabel icon={Terminal} label="MISSION BRIEFING" />
            <GlassInput>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the anomaly... (e.g., Pipe burst, leaking valve)"
                placeholderTextColor={PALETTE.textMuted}
                multiline
                numberOfLines={5}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
              <View style={styles.inputFooter}>
                <Text style={styles.charCount}>{description.length} chars</Text>
              </View>
            </GlassInput>
          </Animated.View>

          {/* ── Budget ── */}
          <Animated.View entering={FadeInDown.delay(290).duration(600)} style={styles.section}>
            <SectionLabel icon={Banknote} label="BUDGET ALLOCATION" />
            <GlassInput style={styles.budgetCard}>
              <View style={styles.budgetRow}>
                <Text style={styles.currencySymbol}>PKR</Text>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="0"
                  placeholderTextColor={PALETTE.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
                <Text style={styles.budgetOptional}>Optional</Text>
              </View>
            </GlassInput>
          </Animated.View>

          {/* ── Schedule (conditional) ── */}
          {!isInstant && (
            <Animated.View entering={SlideInRight.duration(400)} style={styles.section}>
              <SectionLabel icon={Calendar} label="SCHEDULE PROTOCOL" color={PALETTE.orange} />
              <View style={styles.scheduleRow}>
                <TouchableOpacity style={[styles.scheduleCard, { borderColor: PALETTE.orange + '30' }]}>
                  <Calendar size={16} color={PALETTE.orange} strokeWidth={1.5} />
                  <Text style={styles.scheduleValue}>{scheduledDate.toLocaleDateString('en-GB')}</Text>
                  <ChevronDown size={14} color={PALETTE.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.scheduleCard, { borderColor: PALETTE.orange + '30' }]}>
                  <Clock size={16} color={PALETTE.orange} strokeWidth={1.5} />
                  <Text style={styles.scheduleValue}>{scheduledTime}</Text>
                  <ChevronDown size={14} color={PALETTE.textSecondary} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ── Location ── */}
          <Animated.View entering={FadeInDown.delay(360).duration(600)} style={styles.section}>
            <SectionLabel icon={MapPin} label="DEPLOYMENT ZONE" />
            <GlassInput style={styles.locationCard}>
              <View style={styles.locationPinDot}>
                <View style={styles.locationPinInner} />
              </View>
              <TextInput
                style={styles.locationInput}
                placeholder="Enter deployment address"
                placeholderTextColor={PALETTE.textMuted}
                value={address}
                onChangeText={setAddress}
              />
              <TouchableOpacity style={styles.locationChevron}>
                <MapPin size={16} color={PALETTE.cyan} strokeWidth={2} />
              </TouchableOpacity>
            </GlassInput>
          </Animated.View>

          {/* ── Visual Evidence ── */}
          <Animated.View entering={FadeInDown.delay(430).duration(600)} style={styles.section}>
            <SectionLabel icon={Camera} label="VISUAL EVIDENCE" />

            {selectedImages.length === 0 ? (
              <TouchableOpacity activeOpacity={0.8} onPress={pickImage} style={styles.dropzone}>
                {/* scanning line */}
                <View style={styles.scanLine} />
                <View style={styles.dropzoneContent}>
                  <View style={styles.cameraIconWrap}>
                    <Camera size={28} color={PALETTE.textSecondary} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.dropzoneTitle}>Initialize Scan</Text>
                  <Text style={styles.dropzoneSubtitle}>Tap to attach photos · Max 5 files</Text>
                </View>
                {/* corner brackets */}
                <View style={[styles.bracket, styles.bracketTL]} />
                <View style={[styles.bracket, styles.bracketTR]} />
                <View style={[styles.bracket, styles.bracketBL]} />
                <View style={[styles.bracket, styles.bracketBR]} />
              </TouchableOpacity>
            ) : (
              <View style={styles.imageGrid}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.imageScroll}>
                  {selectedImages.map((uri, i) => (
                    <View key={i} style={styles.imageThumb}>
                      <Image source={{ uri }} style={styles.thumbImg} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.thumbOverlay}
                      />
                      <Text style={styles.thumbIndex}>{i + 1}</Text>
                    </View>
                  ))}
                  <TouchableOpacity onPress={pickImage} style={styles.addMoreBtn}>
                    <Plus size={22} color={PALETTE.textSecondary} />
                    <Text style={styles.addMoreText}>Add more</Text>
                  </TouchableOpacity>
                </ScrollView>
                <TouchableOpacity onPress={() => setSelectedImages([])} style={styles.clearImages}>
                  <Text style={styles.clearImagesText}>Clear all</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.footer}>
            {/* Security note */}
            <View style={styles.securityNote}>
              <ShieldCheck size={13} color={PALETTE.cyanDim} strokeWidth={2} />
              <Text style={styles.securityText}>Secured via ApnaUstad Protocol v2.4</Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePostJob}
              disabled={isSubmitting}
              style={styles.submitWrapper}
            >
              <LinearGradient
                colors={isInstant
                  ? [PALETTE.cyan, '#00B8C0']
                  : [PALETTE.orange, '#CC5500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View style={styles.submitInner}>
                    <Send size={18} color="#000" strokeWidth={2.5} />
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

          <View style={{ height: 40 }} />
        </ScrollView>

        <ConfirmModal
          visible={confirmVisible}
          onConfirm={handleConfirmSubmit}
          onCancel={closeConfirm}
          title="Confirm Deployment"
          message={`You're about to ${isInstant ? 'instantly dispatch' : 'broadcast'} this mission. Are you ready?`}
          confirmText="Deploy Now"
          cancelText="Review Again"
          isLoading={isConfirming}
          confirmColor={isInstant ? PALETTE.cyan : PALETTE.orange}
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
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerEyebrow: {
    fontSize: 9, fontWeight: '800', letterSpacing: 3,
    color: PALETTE.textMuted, marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17, fontWeight: '800', color: PALETTE.textPrimary, letterSpacing: 0.3,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
    elevation: 6,
  },

  // Toggle
  toggleContainer: { paddingHorizontal: 20, marginBottom: 20 },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1, borderColor: PALETTE.border,
    padding: 4, position: 'relative', height: 48,
  },
  toggleHighlight: {
    position: 'absolute', top: 4, bottom: 4,
    width: '50%', borderRadius: 11,
    borderWidth: 1,
  },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7, zIndex: 1,
  },
  toggleText: {
    fontSize: 13, fontWeight: '700', color: PALETTE.textMuted, letterSpacing: 0.3,
  },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  // Mission Card
  missionCard: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: PALETTE.border, marginBottom: 28,
  },
  missionCardGradient: { padding: 20 },
  cornerTL: {
    position: 'absolute', top: 10, left: 10,
    width: 16, height: 16,
    borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 3,
  },
  cornerBR: {
    position: 'absolute', bottom: 10, right: 10,
    width: 12, height: 12,
    borderBottomWidth: 1, borderRightWidth: 1, borderRadius: 2,
  },
  missionCardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  orbWrap: {
    width: 58, height: 58, borderRadius: 18,
    borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12,
    elevation: 12, flexShrink: 0,
  },
  missionMeta: { flex: 1 },
  missionEyebrow: {
    fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 3,
  },
  missionName: {
    fontSize: 20, fontWeight: '800', color: PALETTE.white, letterSpacing: -0.3,
  },
  missionSub: {
    fontSize: 11, color: PALETTE.textSecondary, fontWeight: '600',
    marginTop: 3, letterSpacing: 0.3,
  },
  urgencyBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start',
  },
  urgencyBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Section
  section: { marginBottom: 26 },

  // Text Area
  textArea: {
    fontSize: 15, color: PALETTE.textPrimary,
    minHeight: 110, padding: 16,
    fontWeight: '500', lineHeight: 22,
  },
  inputFooter: {
    paddingHorizontal: 16, paddingBottom: 10,
    flexDirection: 'row', justifyContent: 'flex-end',
  },
  charCount: { fontSize: 11, color: PALETTE.textMuted, fontWeight: '600' },

  // Budget
  budgetCard: { flexDirection: 'row' },
  budgetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10, flex: 1,
  },
  currencySymbol: {
    fontSize: 13, fontWeight: '800', color: PALETTE.textSecondary, letterSpacing: 1,
  },
  budgetInput: {
    flex: 1, fontSize: 24, fontWeight: '700',
    color: PALETTE.textPrimary, paddingVertical: 0,
  },
  budgetOptional: {
    fontSize: 10, color: PALETTE.textMuted, fontWeight: '600', letterSpacing: 0.5,
  },

  // Schedule
  scheduleRow: { flexDirection: 'row', gap: 12 },
  scheduleCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PALETTE.surfaceRaised,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  scheduleValue: {
    flex: 1, fontSize: 13, color: PALETTE.textPrimary, fontWeight: '700',
  },

  // Location
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  locationPinDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: PALETTE.cyan + '30',
    borderWidth: 1.5, borderColor: PALETTE.cyan,
    alignItems: 'center', justifyContent: 'center',
  },
  locationPinInner: {
    width: 3, height: 3, borderRadius: 1.5, backgroundColor: PALETTE.cyan,
  },
  locationInput: {
    flex: 1, fontSize: 14, color: PALETTE.textPrimary,
    fontWeight: '600', paddingVertical: 0,
  },
  locationChevron: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: PALETTE.cyanMuted,
    alignItems: 'center', justifyContent: 'center',
  },

  // Drop Zone
  dropzone: {
    height: 150, borderRadius: 18,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PALETTE.textMuted + '60',
    backgroundColor: PALETTE.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  scanLine: {
    position: 'absolute', top: '50%', width: '70%',
    height: 1, backgroundColor: PALETTE.cyan,
    opacity: 0.15, shadowColor: PALETTE.cyan,
    shadowOpacity: 1, shadowRadius: 8, elevation: 4,
  },
  dropzoneContent: { alignItems: 'center', gap: 8 },
  cameraIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  dropzoneTitle: {
    fontSize: 13, fontWeight: '700', color: PALETTE.textSecondary, letterSpacing: 0.5,
  },
  dropzoneSubtitle: { fontSize: 11, color: PALETTE.textMuted, fontWeight: '500' },
  bracket: {
    position: 'absolute', width: 14, height: 14,
    borderColor: PALETTE.textMuted + '50',
  },
  bracketTL: { top: 10, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 4 },
  bracketTR: { top: 10, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 4 },
  bracketBL: { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 4 },
  bracketBR: { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 4 },

  // Image Grid
  imageGrid: {
    backgroundColor: PALETTE.surfaceRaised,
    borderRadius: 18, borderWidth: 1, borderColor: PALETTE.border, overflow: 'hidden',
  },
  imageScroll: { padding: 12, gap: 10 },
  imageThumb: {
    width: 100, height: 100, borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbOverlay: { ...StyleSheet.absoluteFillObject },
  thumbIndex: {
    position: 'absolute', bottom: 6, left: 8,
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1,
  },
  addMoreBtn: {
    width: 100, height: 100, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PALETTE.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  addMoreText: { fontSize: 10, color: PALETTE.textMuted, fontWeight: '600' },
  clearImages: {
    paddingVertical: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: PALETTE.border,
  },
  clearImagesText: { fontSize: 12, color: PALETTE.textSecondary, fontWeight: '600' },

  // Footer
  footer: { marginTop: 8, gap: 20 },
  securityNote: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  securityText: {
    fontSize: 11, color: PALETTE.textMuted, fontWeight: '600', letterSpacing: 0.3,
  },
  submitWrapper: { borderRadius: 18, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: {
    fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.5,
  },
});
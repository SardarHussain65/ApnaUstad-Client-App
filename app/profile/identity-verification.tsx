import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import {
  ChevronLeft,
  Camera,
  Check,
  FileText,
  AlertTriangle,
  X,
  Image as ImageIcon,
  BadgeCheck,
  Hourglass,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { alpha, BorderRadius, Spacing, useTheme, useThemeShadows, useThemeTypography } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { BASE_URL, getOptimizedImageUrl } from '../../constants/Config';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

interface VerificationDetails {
  _id: string;
  cnicNumber: string;
  cnicFrontImage: string;
  cnicBackImage: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
}

export default function IdentityVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const { user, role, updateUser } = useAuth();
  const isWorker = role === 'worker';
  const theme = useTheme();
  const typography = useThemeTypography();
  const shadows = useThemeShadows();

  const [cnicNumber, setCnicNumber] = useState('');
  const [frontLocalImage, setFrontLocalImage] = useState<string | null>(null);
  const [backLocalImage, setBackLocalImage] = useState<string | null>(null);
  const [frontOnlineUrl, setFrontOnlineUrl] = useState('');
  const [backOnlineUrl, setBackOnlineUrl] = useState('');

  const [status, setStatus] = useState<VerificationStatus>('not_submitted');
  const [requestDetails, setRequestDetails] = useState<VerificationDetails | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  // Fetch status on mount
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/workers/verification/status');
      const details = response.data?.data as VerificationDetails | null;

      if (details) {
        setRequestDetails(details);
        setStatus(details.status);
        setCnicNumber(details.cnicNumber);
        setFrontOnlineUrl(details.cnicFrontImage);
        setBackOnlineUrl(details.cnicBackImage);
      } else if ((user as any)?.isVerified) {
        setStatus('approved');
      } else {
        setStatus('not_submitted');
      }
    } catch (err: any) {
      console.error('Failed to fetch verification status:', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const formatCNIC = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    }
    if (cleaned.length > 12) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;
    }
    return formatted.slice(0, 15);
  };

  const handleCnicChange = (text: string) => {
    setCnicNumber(formatCNIC(text));
  };

  const pickImage = async (side: 'front' | 'back') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(t('wallet.permissionRequired'), t('wallet.photoPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [8, 5],
        quality: 0.85,
      });

      if (!result.canceled) {
        if (side === 'front') {
          setFrontLocalImage(result.assets[0].uri);
        } else {
          setBackLocalImage(result.assets[0].uri);
        }
        await Haptics.selectionAsync();
      }
    } catch (err: any) {
      showError(t('common.error'), t('identityVerification.selectError', { defaultValue: 'Could not select photo.' }));
    }
  };

  const captureImage = async (side: 'front' | 'back') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showError(t('wallet.permissionRequired'), t('identityVerification.cameraPermission', { defaultValue: 'Camera access is required to snap photos.' }));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [8, 5],
        quality: 0.85,
      });

      if (!result.canceled) {
        if (side === 'front') {
          setFrontLocalImage(result.assets[0].uri);
        } else {
          setBackLocalImage(result.assets[0].uri);
        }
        await Haptics.selectionAsync();
      }
    } catch (err: any) {
      showError(t('common.error'), t('identityVerification.cameraError', { defaultValue: 'Could not access device camera.' }));
    }
  };

  const uploadCnicImage = async (uri: string, side: 'front' | 'back') => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || `cnic-${side}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append(side === 'front' ? 'cnicFrontImage' : 'cnicBackImage', { uri, name: filename, type } as any);
    const endpoint = side === 'front' ? '/workers/upload-cnic-front' : '/workers/upload-cnic-back';

    const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || t('registerDetails.uploadError'));
    }
    const data = await response.json();
    return data.data?.imageUrl || '';
  };

  const handleSubmit = async () => {
    // Validation
    const rawDigits = cnicNumber.replace(/\D/g, '');
    if (rawDigits.length !== 13) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showError(t('identityVerification.invalidCnic'), t('identityVerification.cnicLengthError'));
      return;
    }

    if (status === 'not_submitted' || status === 'rejected') {
      const needsFrontUpload = !frontOnlineUrl && !frontLocalImage;
      const needsBackUpload = !backOnlineUrl && !backLocalImage;

      if (needsFrontUpload || needsBackUpload) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showError(t('identityVerification.missingDocs'), t('identityVerification.docsRequired'));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await Haptics.selectionAsync();

      let uploadedFront = frontOnlineUrl;
      let uploadedBack = backOnlineUrl;

      // Upload front if new local image chosen
      if (frontLocalImage) {
        uploadedFront = await uploadCnicImage(frontLocalImage, 'front');
      }

      // Upload back if new local image chosen
      if (backLocalImage) {
        uploadedBack = await uploadCnicImage(backLocalImage, 'back');
      }

      // Call verification request endpoint
      const response = await api.post('/workers/verification/request', {
        cnicNumber,
        cnicFrontImage: uploadedFront,
        cnicBackImage: uploadedBack,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      success(t('identityVerification.successTitle'), t('identityVerification.successDesc'));

      // Update UI state
      fetchStatus();
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(t('identityVerification.failedTitle'), err?.response?.data?.message || err?.message || t('registerDetails.uploadError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    await Haptics.selectionAsync();
    setStatus('not_submitted');
    setFrontLocalImage(null);
    setBackLocalImage(null);
    setFrontOnlineUrl('');
    setBackOnlineUrl('');
  };

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.brand.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>{t('identityVerification.fetching')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(0)} style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.default }]} onPress={() => router.back()}>
              <ChevronLeft size={22} color={theme.colors.text.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{t('identityVerification.title')}</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Verification Lifecycle Layout */}

          {status === 'approved' && (
            <Animated.View entering={FadeInUp} style={[styles.statusPanel, shadows.depth, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]}>
              <View style={[styles.glowRing, { borderColor: theme.colors.status.success }, shadows.glow]}>
                <BadgeCheck size={50} color={theme.colors.status.success} strokeWidth={2.2} />
              </View>
              <Text style={[styles.statusTitle, { color: theme.colors.text.primary }]}>{t('identityVerification.verifiedUstad')}</Text>
              <Text style={[styles.statusDesc, { color: theme.colors.text.muted }]}>{t('identityVerification.verifiedDesc')}</Text>
              <View style={[styles.cardInfo, { borderColor: theme.colors.border.subtle }]}>
                <LinearGradient colors={[alpha(theme.colors.status.success, 0.08), 'rgba(0,0,0,0)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} />
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLbl, { color: theme.colors.text.muted }]}>{t('identityVerification.verifiedCnic')}</Text>
                  <Text style={[styles.infoVal, { color: theme.colors.text.primary }]}>{cnicNumber}</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {status === 'pending' && (
            <Animated.View entering={FadeInUp} style={[styles.statusPanel, shadows.depth, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]}>
              <View style={[styles.glowRing, { borderColor: theme.colors.status.warning }, shadows.glow]}>
                <Hourglass size={42} color={theme.colors.status.warning} strokeWidth={2.2} style={styles.pulseAnim} />
              </View>
              <Text style={[styles.statusTitle, { color: theme.colors.text.primary }]}>{t('identityVerification.underReview')}</Text>
              <Text style={[styles.statusDesc, { color: theme.colors.text.muted }]}>{t('identityVerification.reviewDesc')}</Text>
              <View style={[styles.cardInfo, { borderColor: theme.colors.border.subtle }]}>
                <LinearGradient colors={[alpha(theme.colors.status.warning, 0.08), 'rgba(0,0,0,0)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} />
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLbl, { color: theme.colors.text.muted }]}>{t('identityVerification.pendingCnic')}</Text>
                  <Text style={[styles.infoVal, { color: theme.colors.text.primary }]}>{cnicNumber}</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {status === 'rejected' && (
            <Animated.View entering={FadeInUp} style={[styles.statusPanel, shadows.depth, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]}>
              <View style={[styles.glowRing, { borderColor: theme.colors.status.error }, shadows.glow]}>
                <ShieldAlert size={46} color={theme.colors.status.error} strokeWidth={2.2} />
              </View>
              <Text style={[styles.statusTitle, { color: theme.colors.status.error }]}>{t('identityVerification.rejected')}</Text>
              <Text style={[styles.statusDesc, { color: theme.colors.text.muted }]}>{t('identityVerification.rejectedDesc')}</Text>
              <View style={[styles.rejectionCard, { borderColor: alpha(theme.colors.status.error, 0.2) }]}>
                <LinearGradient colors={[alpha(theme.colors.status.error, 0.12), 'rgba(0,0,0,0)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} />
                <AlertTriangle size={16} color={theme.colors.status.error} strokeWidth={2.5} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rejectionTitle, { color: theme.colors.status.error }]}>{t('identityVerification.reasonTitle')}</Text>
                  <Text style={[styles.rejectionText, { color: theme.colors.text.muted }]}>
                    {requestDetails?.rejectionReason || t('identityVerification.defaultReason')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.resubmitBtn, shadows.glow]} onPress={handleReset}>
                <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resubmitGradient}>
                  <Text style={[styles.resubmitText, { color: theme.colors.text.inverse }]}>{t('identityVerification.correctResubmit')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {status === 'not_submitted' && (
            <Animated.View entering={FadeInUp.delay(100)} style={{ width: '100%' }}>
              <Text style={[styles.formIntro, { color: theme.colors.text.muted }]}>
                {t('identityVerification.uploadIntro')}
              </Text>

              {/* Form Fields */}
              <View style={styles.fieldWrap}>
                <View style={styles.fieldLabelRow}>
                  <FileText size={13} color={focused ? theme.colors.brand.primary : theme.colors.text.muted} strokeWidth={2.5} />
                  <Text style={[styles.fieldLabel, { color: theme.colors.text.muted }, focused && { color: theme.colors.brand.primary }]}>{t('identityVerification.cnicDigits')}</Text>
                </View>
                <View style={[styles.inputCard, { borderColor: theme.colors.input.border, backgroundColor: theme.colors.input.background }, focused && { borderColor: theme.colors.input.focusedBorder }]}>
                  <LinearGradient
                    colors={focused ? [alpha(theme.colors.brand.primary, 0.06), 'rgba(0,0,0,0)'] : [theme.colors.surface.subtle, 'rgba(0,0,0,0)']}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.input.text }]}
                    value={cnicNumber}
                    onChangeText={handleCnicChange}
                    placeholder="e.g. 35201-1234567-1"
                    placeholderTextColor={theme.colors.input.placeholder}
                    keyboardType="numeric"
                    selectionColor={theme.colors.brand.primary}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    maxLength={15}
                  />
                </View>
              </View>

              {/* Photo Upload Containers */}
              <DocumentUploadWidget
                title={t('identityVerification.cnicFrontSide')}
                localUri={frontLocalImage}
                onlineUrl={frontOnlineUrl}
                onSelectGallery={() => pickImage('front')}
                onSelectCamera={() => captureImage('front')}
                onClear={() => { Haptics.selectionAsync(); setFrontLocalImage(null); setFrontOnlineUrl(''); }}
              />

              <DocumentUploadWidget
                title={t('identityVerification.cnicBackSide')}
                localUri={backLocalImage}
                onlineUrl={backOnlineUrl}
                onSelectGallery={() => pickImage('back')}
                onSelectCamera={() => captureImage('back')}
                onClear={() => { Haptics.selectionAsync(); setBackLocalImage(null); setBackOnlineUrl(''); }}
              />

              {/* Save Button */}
              <View style={styles.footer}>
                <TouchableOpacity style={[styles.saveBtn, shadows.glow]} onPress={handleSubmit} disabled={isSubmitting}>
                  <LinearGradient
                    colors={isSubmitting ? [alpha(theme.colors.brand.primary, 0.4), alpha(theme.colors.brand.secondary, 0.4)] : [theme.colors.brand.primary, theme.colors.brand.secondary]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.saveGradient}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={theme.colors.text.inverse} />
                    ) : (
                      <>
                        <Check size={20} color={theme.colors.text.inverse} strokeWidth={3} />
                        <Text style={[styles.saveText, { color: theme.colors.text.inverse }]}>{t('identityVerification.submitBtn')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Secure details nudge */}
          <View style={[styles.secureNotice, { borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.surface.subtle }]}>
            <LinearGradient colors={[alpha(theme.colors.text.primary, 0.02), 'transparent']} style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]} />
            <Text style={[styles.secureText, { color: theme.colors.text.muted }]}>
              🔒 {t('identityVerification.privacySecured')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}

// ─── Sub-Component: Document Upload Widget ──────────────────────────────────────
interface DocumentUploadProps {
  title: string;
  localUri: string | null;
  onlineUrl: string;
  onSelectGallery: () => void;
  onSelectCamera: () => void;
  onClear: () => void;
}

function DocumentUploadWidget({ title, localUri, onlineUrl, onSelectGallery, onSelectCamera, onClear }: DocumentUploadProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shadows = useThemeShadows();
  const displayUri = localUri || getOptimizedImageUrl(onlineUrl, 500, 300);

  return (
    <View style={styles.uploadWidgetWrap}>
      <Text style={[styles.uploadWidgetTitle, { color: theme.colors.text.muted }]}>{title}</Text>

      {displayUri ? (
          <View style={[styles.imagePreviewWrap, shadows.depth]}>
          <Image source={{ uri: displayUri }} style={styles.previewImage} resizeMode="cover" />
          <TouchableOpacity style={[styles.imageClearBtn, { backgroundColor: alpha(theme.colors.text.primary, 0.6), borderColor: theme.colors.border.subtle }]} onPress={onClear}>
            <X size={14} color={theme.colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pickerBox}>
          <LinearGradient colors={[theme.colors.surface.subtle, 'rgba(0,0,0,0)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]} />

          <View style={[styles.pickerIcon, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
            <ImageIcon size={28} color={theme.colors.text.muted} strokeWidth={1.5} />
          </View>

          <Text style={[styles.pickerNudge, { color: theme.colors.text.muted }]}>{t('identityVerification.noDocument')}</Text>

          <View style={styles.pickerBtnRow}>
            <TouchableOpacity style={[styles.pickerBtn, { borderColor: theme.colors.border.subtle }]} onPress={onSelectCamera}>
              <LinearGradient colors={[alpha(theme.colors.text.primary, 0.06), alpha(theme.colors.text.primary, 0.02)]} style={StyleSheet.absoluteFill} />
              <Camera size={14} color={theme.colors.brand.primary} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={[styles.pickerBtnTxt, { color: theme.colors.text.primary }]}>{t('identityVerification.camera')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pickerBtn, { borderColor: theme.colors.border.subtle }]} onPress={onSelectGallery}>
              <LinearGradient colors={[alpha(theme.colors.text.primary, 0.06), alpha(theme.colors.text.primary, 0.02)]} style={StyleSheet.absoluteFill} />
              <ImageIcon size={14} color={theme.colors.brand.secondary} strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={[styles.pickerBtnTxt, { color: theme.colors.text.primary }]}>{t('identityVerification.gallery')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.l, paddingBottom: 60 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 300 },
  loadingText: { fontSize: 13, fontWeight: '600', marginTop: 12 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  // Intro
  formIntro: { fontSize: 13, fontWeight: '500', lineHeight: 20, marginBottom: 24, paddingHorizontal: 2 },

  // Form
  fieldWrap: { marginBottom: 20 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7, marginLeft: 2 },
  fieldLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  inputCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  input: { fontSize: 16, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },

  // Upload Widget
  uploadWidgetWrap: { marginBottom: 22 },
  uploadWidgetTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
  pickerBox: {
    borderRadius: 16, borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 16,
  },
  pickerIcon: { width: 50, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pickerNudge: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  pickerBtnRow: { flexDirection: 'row', gap: 12 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, overflow: 'hidden', minWidth: 100,
  },
  pickerBtnTxt: { fontSize: 12, fontWeight: '700' },

  // Image Preview
  imagePreviewWrap: { position: 'relative', width: '100%', aspectRatio: 8 / 5, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  previewImage: { width: '100%', height: '100%' },
  imageClearBtn: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Status Panels
  statusPanel: {
    alignItems: 'center', borderRadius: 24, overflow: 'hidden',
    paddingVertical: 32, paddingHorizontal: 20, marginBottom: 24,
  },
  glowRing: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  pulseAnim: { transform: [{ scale: 1 }] },
  statusTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
  statusDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  cardInfo: { width: '100%', padding: 14, borderRadius: 14, borderWidth: 1, position: 'relative' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLbl: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  infoVal: { fontSize: 15, fontWeight: '700', letterSpacing: 0.8 },

  // Rejection details
  rejectionCard: {
    flexDirection: 'row', gap: 12, width: '100%', padding: 14,
    borderRadius: 14, borderWidth: 1,
    marginBottom: 24, position: 'relative',
  },
  rejectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  rejectionText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  resubmitBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  resubmitGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  resubmitText: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },

  // Secure Nudge
  secureNotice: { padding: 12, borderRadius: 12, borderWidth: 1, position: 'relative' },
  secureText: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16 },

  // Save / Footer
  footer: { marginTop: 12 },
  saveBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  saveText: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
});
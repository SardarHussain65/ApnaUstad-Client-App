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
  KeyboardAvoidingView,
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Check,
  Building2,
  ChevronLeft,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { alpha, BorderRadius, Spacing, useTheme, useThemeShadows, useThemeTypography } from '../../constants/Theme';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useProfile, useUpdateProfileMutation, useToast } from '../../hooks';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../../constants/Config';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { success, error: showError } = useToast();
  const { user, role, updateUser } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const shadows = useThemeShadows();
  const userId = user?._id;
  const isWorker = role === 'worker';

  const { data: profileData, isLoading: isProfileLoading } = useProfile(userId, role);
  const { mutateAsync: updateProfile, isPending: isSaving } = useUpdateProfileMutation();

  // ── Shared fields ──────────────────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ── Worker-only fields ─────────────────────────────────────────
  const [city, setCity] = useState('');

  useEffect(() => {
    const source = profileData || (user as any);
    if (!source) return;
    setName(source.fullName || '');
    setEmail(source.email || '');
    setPhone(source.phone || '');
    setAddress(source.address || '');
    setProfileImage(source.profileImage || null);
    if (isWorker) {
      setCity(source.city || '');
    }
  }, [profileData, user, isWorker]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setLocalImage(result.assets[0].uri);
  };

  const uploadProfileImage = async (uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('profileImage', { uri, name: filename, type } as any);
    const endpoint = isWorker ? '/workers/upload-profile-image' : '/users/upload-image';
    const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || t('personalInfo.failedToUpload'));
    }
    const data = await response.json();
    return data.data?.imageUrl || '';
  };

  const handleSave = async () => {
    if (!userId || !role) return;
    if (!name.trim() || !phone.trim()) {
      showError(t('personalInfo.missingFields'), t('personalInfo.missingFieldsDesc'));
      return;
    }
    try {
      let nextProfileImage = profileImage || '';
      if (localImage) {
        setIsUploading(true);
        nextProfileImage = await uploadProfileImage(localImage);
        setProfileImage(nextProfileImage);
        setLocalImage(null);
      }

      const payload: any = {
        fullName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        profileImage: nextProfileImage,
      };
      if (email.trim()) payload.email = email.trim();

      if (isWorker) {
        payload.city = city.trim();
      }

      const updated = await updateProfile({ role, id: userId, data: payload });
      await updateUser(updated);
      success(t('personalInfo.profileUpdated'), t('personalInfo.profileUpdatedDesc'));
      router.back();
    } catch (err: any) {
      showError(t('personalInfo.updateFailed'), err?.message || t('personalInfo.updateFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isSaving || isUploading || isProfileLoading;

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(0)} style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.border.subtle, borderColor: theme.colors.border.default }]} onPress={() => router.back()}>
              <ChevronLeft size={22} color={theme.colors.text.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{t('personalInfo.title')}</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Avatar */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.secondary]} style={styles.avatarGlow} />
              {profileImage || localImage ? (
                <Image source={{ uri: localImage || profileImage || '' }} style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.default }]} resizeMode="cover" />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.default }]}>
                  <User size={54} color={theme.colors.text.muted} strokeWidth={1.5} />
                </View>
              )}
              <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: theme.colors.brand.secondary, borderColor: theme.colors.background.app }, shadows.glow]} onPress={pickImage}>
                {isUploading
                  ? <ActivityIndicator color={theme.colors.text.inverse} size="small" />
                  : <Camera size={17} color={theme.colors.text.inverse} />
                }
              </TouchableOpacity>
            </View>
            <Text style={[styles.avatarTip, { color: theme.colors.text.muted }]}>{t('personalInfo.tapToChange')}</Text>
            {!profileImage && !localImage && (
              <View style={[styles.photoNudge, { backgroundColor: alpha(theme.colors.brand.primary, 0.08), borderColor: alpha(theme.colors.brand.primary, 0.28) }]}>
                <Text style={[styles.photoNudgeText, { color: theme.colors.brand.primary }]}>{t('personalInfo.photoNudge')}</Text>
              </View>
            )}
          </Animated.View>

          {/* ── Section: Basic Info ── */}
          <SectionHeading label={t('personalInfo.basicInfo')} delay={160} />

          <FormField label={t('personalInfo.fullName')} value={name} onChangeText={setName} icon={User} delay={200} placeholder={t('personalInfo.fullNamePlaceholder')} />
          <FormField label={t('personalInfo.emailAddress')} value={email} onChangeText={setEmail} icon={Mail} delay={240} keyboardType="email-address" placeholder={t('personalInfo.emailPlaceholder')} autoCapitalize="none" />
          <FormField label={t('personalInfo.phoneNumber')} value={phone} onChangeText={setPhone} icon={Phone} delay={280} keyboardType="phone-pad" placeholder="+92 300 0000000" />
          <FormField label={t('personalInfo.homeAddress')} value={address} onChangeText={setAddress} icon={MapPin} delay={320} placeholder={t('personalInfo.addressPlaceholder')} multiline />

          {/* ── Section: Worker Service Location ── */}
          {isWorker && (
            <>
              <SectionHeading label={t('personalInfo.serviceLocation')} delay={380} />

              <FormField label={t('personalInfo.city')} value={city} onChangeText={setCity} icon={Building2} delay={400} placeholder={t('personalInfo.cityPlaceholder')} />
            </>
          )}

          {/* Save Button */}
          <Animated.View entering={FadeInDown.delay(isWorker ? 460 : 420)} style={styles.footer}>
            <TouchableOpacity style={[styles.saveBtn, shadows.glow]} onPress={handleSave} disabled={isLoading}>
              <LinearGradient
                colors={isLoading ? [alpha(theme.colors.brand.primary, 0.45), alpha(theme.colors.brand.secondary, 0.45)] : [theme.colors.brand.primary, theme.colors.brand.secondary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.saveGradient}
              >
                {isLoading
                  ? <ActivityIndicator color={theme.colors.button.primaryText} />
                  : <>
                    <Check size={20} color={theme.colors.button.primaryText} strokeWidth={3} />
                    <Text style={[styles.saveText, { color: theme.colors.button.primaryText }]}>{t('personalInfo.saveChanges')}</Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────
function SectionHeading({ label, delay }: { label: string; delay: number }) {
  const theme = useTheme();
  const typography = useThemeTypography();
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={styles.sectionHeading}>
      <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.secondary]} style={styles.sectionHeadingLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      <Text style={[styles.sectionHeadingText, { color: theme.colors.text.muted }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: any;
  delay: number;
  [key: string]: any;
}

function FormField({ label, value, onChangeText, icon: Icon, delay, ...props }: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const theme = useTheme();
  const typography = useThemeTypography();

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Icon size={13} color={focused ? theme.colors.brand.primary : theme.colors.text.muted} strokeWidth={2.5} />
        <Text style={[styles.fieldLabel, { color: focused ? theme.colors.brand.primary : theme.colors.text.muted }]}>{label}</Text>
      </View>
      <View style={[styles.inputCard, { borderColor: focused ? theme.colors.input.focusedBorder : theme.colors.input.border, backgroundColor: theme.colors.input.background }]}>
        <LinearGradient
          colors={focused ? [alpha(theme.colors.brand.primary, 0.06), 'rgba(0,0,0,0)'] : [alpha(theme.colors.text.primary, 0.05), 'rgba(0,0,0,0)']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
        />
        <TextInput
          style={[styles.input, { color: theme.colors.input.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={theme.colors.input.placeholder}
          selectionColor={theme.colors.brand.primary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
    </Animated.View>
  );
 }

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.l, paddingBottom: 60 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: { width: 110, height: 110, position: 'relative', marginBottom: 10 },
  avatarGlow: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 60, opacity: 0.45 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cameraBtn: { position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  avatarTip: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  photoNudge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
  photoNudgeText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Section heading
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
  sectionHeadingLine: { height: 2, width: 16, borderRadius: 1 },
  sectionHeadingText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },

  // Field
  fieldWrap: { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7, marginLeft: 2 },
  fieldLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  // Input card
  inputCard: {
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden',
  },
  input: { fontSize: 15, fontWeight: '600', paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },

  // Footer / Save
  footer: { marginTop: 32 },
  saveBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  saveText: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
});

import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Check,
  Tag,
  X,
  FileText,
  CircleDollarSign,
  Clock3,
  Building2,
  ChevronLeft,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/Theme';
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
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

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
      setBio(source.bio || '');
      setHourlyRate(source.hourlyRate ? String(source.hourlyRate) : '');
      setExperience(source.experience ? String(source.experience) : '');
      setSkills(Array.isArray(source.skills) ? source.skills : []);
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
      throw new Error(err?.message || 'Failed to upload profile image');
    }
    const data = await response.json();
    return data.data?.imageUrl || '';
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= 10) return;
    setSkills(prev => [...prev, trimmed]);
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setSkills(prev => prev.filter(s => s !== skill));

  const handleSave = async () => {
    if (!userId || !role) return;
    if (!name.trim() || !phone.trim()) {
      showError('Missing fields', 'Full name and phone number are required.');
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
        payload.bio = bio.trim();
        if (hourlyRate) payload.hourlyRate = parseFloat(hourlyRate) || 0;
        if (experience) payload.experience = parseInt(experience, 10) || 0;
        payload.skills = skills;
      }

      const updated = await updateProfile({ role, id: userId, data: payload });
      await updateUser(updated);
      success('Profile updated', 'Your information has been saved.');
      router.back();
    } catch (err: any) {
      showError('Update failed', err?.message || 'Could not update your profile.');
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
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Personal Information</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Avatar */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.avatarGlow} />
              {profileImage || localImage ? (
                <Image source={{ uri: localImage || profileImage || '' }} style={styles.avatarPlaceholder} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={54} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                </View>
              )}
              <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                {isUploading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Camera size={17} color="#fff" />
                }
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarTip}>Tap to change photo</Text>
            {!profileImage && !localImage && (
              <View style={styles.photoNudge}>
                <Text style={styles.photoNudgeText}>📸 Adding a photo increases bookings by 40%</Text>
              </View>
            )}
          </Animated.View>

          {/* ── Section: Basic Info ── */}
          <SectionHeading label="Basic Information" delay={160} />

          <FormField label="Full Name" value={name} onChangeText={setName} icon={User} delay={200} placeholder="Your full name" />
          <FormField label="Email Address" value={email} onChangeText={setEmail} icon={Mail} delay={240} keyboardType="email-address" placeholder="your@email.com" autoCapitalize="none" />
          <FormField label="Phone Number" value={phone} onChangeText={setPhone} icon={Phone} delay={280} keyboardType="phone-pad" placeholder="+92 300 0000000" />
          <FormField label="Home Address" value={address} onChangeText={setAddress} icon={MapPin} delay={320} placeholder="Street, area, city" multiline />

          {/* ── Section: Worker Professional Info ── */}
          {isWorker && (
            <>
              <SectionHeading label="Professional Details" delay={380} />

              <FormField label="City" value={city} onChangeText={setCity} icon={Building2} delay={400} placeholder="e.g. Lahore, Karachi, Islamabad" />
              <FormField label="Hourly Rate (Rs.)" value={hourlyRate} onChangeText={setHourlyRate} icon={CircleDollarSign} delay={440} keyboardType="numeric" placeholder="e.g. 500" />
              <FormField label="Experience (Years)" value={experience} onChangeText={setExperience} icon={Clock3} delay={480} keyboardType="numeric" placeholder="e.g. 3" />

              {/* Bio */}
              <Animated.View entering={FadeInDown.delay(520).springify()} style={styles.fieldWrap}>
                <View style={styles.fieldLabelRow}>
                  <FileText size={13} color={Colors.primary} strokeWidth={2.5} />
                  <Text style={styles.fieldLabel}>Professional Bio</Text>
                </View>
                <View style={styles.bioInputCard}>
                  <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(0,0,0,0)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} />
                  <TextInput
                    style={styles.bioInput}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Describe your expertise, work quality, and what makes you stand out..."
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    multiline
                    numberOfLines={4}
                    selectionColor={Colors.primary}
                    maxLength={400}
                    textAlignVertical="top"
                  />
                  <Text style={styles.bioCharCount}>{bio.length}/400</Text>
                </View>
              </Animated.View>

              {/* Skills */}
              <Animated.View entering={FadeInDown.delay(580).springify()} style={styles.fieldWrap}>
                <View style={styles.fieldLabelRow}>
                  <Tag size={13} color={Colors.primary} strokeWidth={2.5} />
                  <Text style={styles.fieldLabel}>Skills & Expertise</Text>
                </View>
                <View style={styles.skillInputRow}>
                  <View style={styles.skillInputCard}>
                    <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(0,0,0,0)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} />
                    <TextInput
                      style={styles.skillInput}
                      value={skillInput}
                      onChangeText={setSkillInput}
                      placeholder="e.g. Electrical Wiring"
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      selectionColor={Colors.primary}
                      onSubmitEditing={addSkill}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity style={styles.skillAddBtn} onPress={addSkill} disabled={!skillInput.trim()}>
                    <LinearGradient
                      colors={skillInput.trim() ? [Colors.primary, Colors.secondary] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                      style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                    />
                    <Text style={[styles.skillAddBtnText, { color: skillInput.trim() ? '#000' : 'rgba(255,255,255,0.3)' }]}>Add</Text>
                  </TouchableOpacity>
                </View>

                {skills.length > 0 && (
                  <View style={styles.skillsChips}>
                    {skills.map((skill, i) => (
                      <Animated.View key={skill} entering={FadeInDown.delay(i * 40)} style={styles.skillChip}>
                        <LinearGradient colors={['rgba(0,245,255,0.18)', 'rgba(191,90,242,0.12)']} style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]} />
                        <Text style={styles.skillChipText}>{skill}</Text>
                        <TouchableOpacity style={styles.skillChipRemove} onPress={() => removeSkill(skill)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <X size={11} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                )}
                {skills.length === 0 && (
                  <Text style={styles.skillsHint}>Add up to 10 skills. Press "Add" or hit Return after each.</Text>
                )}
              </Animated.View>
            </>
          )}

          {/* Save Button */}
          <Animated.View entering={FadeInDown.delay(isWorker ? 660 : 420)} style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isLoading}>
              <LinearGradient
                colors={isLoading ? ['rgba(0,245,255,0.4)', 'rgba(191,90,242,0.4)'] : [Colors.primary, Colors.secondary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.saveGradient}
              >
                {isLoading
                  ? <ActivityIndicator color="#000" />
                  : <>
                    <Check size={20} color="#000" strokeWidth={3} />
                    <Text style={styles.saveText}>Save Changes</Text>
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
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={styles.sectionHeading}>
      <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.sectionHeadingLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      <Text style={styles.sectionHeadingText}>{label}</Text>
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

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Icon size={13} color={focused ? Colors.primary : 'rgba(255,255,255,0.5)'} strokeWidth={2.5} />
        <Text style={[styles.fieldLabel, focused && { color: Colors.primary }]}>{label}</Text>
      </View>
      <View style={[styles.inputCard, focused && { borderColor: `${Colors.primary}60` }]}>
        <LinearGradient
          colors={focused ? ['rgba(0,245,255,0.06)', 'rgba(0,0,0,0)'] : ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0)']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="rgba(255,255,255,0.25)"
          selectionColor={Colors.primary}
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
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: { width: 110, height: 110, position: 'relative', marginBottom: 10 },
  avatarGlow: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 60, opacity: 0.45 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cameraBtn: { position: 'absolute', right: 0, bottom: 0, backgroundColor: Colors.secondary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.background, ...Shadows.glow },
  avatarTip: { color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  photoNudge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(0,245,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,245,255,0.2)' },
  photoNudgeText: { color: 'rgba(0,245,255,0.9)', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Section heading
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
  sectionHeadingLine: { height: 2, width: 16, borderRadius: 1 },
  sectionHeadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },

  // Field
  fieldWrap: { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7, marginLeft: 2 },
  fieldLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  // Input card
  inputCard: {
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', backgroundColor: 'rgba(8,10,30,0.7)',
  },
  input: { color: '#fff', fontSize: 15, fontWeight: '600', paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },

  // Bio
  bioInputCard: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', backgroundColor: 'rgba(8,10,30,0.7)', padding: 14 },
  bioInput: { color: '#fff', fontSize: 14, fontWeight: '500', lineHeight: 21, minHeight: 90 },
  bioCharCount: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700', textAlign: 'right', marginTop: 8 },

  // Skills
  skillInputRow: { flexDirection: 'row', gap: 10 },
  skillInputCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', backgroundColor: 'rgba(8,10,30,0.7)' },
  skillInput: { color: '#fff', fontSize: 14, fontWeight: '600', paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 11 },
  skillAddBtn: { width: 70, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  skillAddBtnText: { fontSize: 13, fontWeight: '900' },
  skillsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,245,255,0.25)', paddingHorizontal: 11, paddingVertical: 6, overflow: 'hidden' },
  skillChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  skillChipRemove: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  skillsHint: { color: 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: '600', marginTop: 10 },

  // Footer / Save
  footer: { marginTop: 32 },
  saveBtn: { borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.glow },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  saveText: { color: '#000', fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
});

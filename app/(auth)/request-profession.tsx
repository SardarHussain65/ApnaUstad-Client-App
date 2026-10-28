import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  I18nManager
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import {
  Wrench, Briefcase, Award, PenTool,
  BadgeDollarSign, FileText, CheckCircle, Plus, Trash2,
  Camera, ShieldCheck, Clock, ArrowRight, Building
} from 'lucide-react-native';
import { BorderRadius, Shadows, useTheme, useThemeColors, alpha } from '../../constants/Theme';
import { BASE_URL } from '../../constants/Config';
import * as Haptics from 'expo-haptics';
import { useToast } from '../../hooks';

import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { GlassCard } from '../../components/home/GlassCard';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AuthHero } from '../../components/auth/AuthHero';
import { AuthProgress } from '../../components/auth/AuthProgress';
import { SecurityNote } from '../../components/auth/SecurityNote';

interface CertificateItem {
  id: string;
  title: string;
  issuingOrg: string;
  imageUri: string | null;
}

export default function RequestProfessionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const params = useLocalSearchParams<{
    fullName: string;
    email: string;
    phone: string;
    role: string;
    address: string;
    city: string;
    latitude: string;
    longitude: string;
    password: string;
    image: string;
    cnicNumber: string;
    cnicFront: string;
    cnicBack: string;
  }>();

  const theme = useTheme();
  const colors = useThemeColors();
  const styles = createStyles(theme, colors);
  const accentColor = colors.worker;

  const [professionName, setProfessionName] = useState('');
  const [categoryDomain, setCategoryDomain] = useState('');
  const [requirements, setRequirements] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Cache uploaded ImageKit URLs by local URI so retries never re-upload the same file
  const uploadedUrlsRef = useRef<Record<string, string>>({});

  const pickCertificateImage = async (certId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
    });

    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCertificates((prev) =>
        prev.map((c) => (c.id === certId ? { ...c, imageUri: result.assets[0].uri } : c))
      );
    }
  };

  const addCertificateSlot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCertificates((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: '',
        issuingOrg: '',
        imageUri: null,
      },
    ]);
  };

  const removeCertificateSlot = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCertificates((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCertificate = (id: string, field: 'title' | 'issuingOrg', value: string) => {
    setCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const uploadImageMutation = useMutation({
    mutationFn: async ({ uri, fieldName, endpoint }: { uri: string; fieldName: string; endpoint: string }) => {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;

      formData.append(fieldName, { uri, name: filename, type } as any);

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let serverMessage = '';
        try {
          const errJson = await response.json();
          serverMessage = errJson?.message || errJson?.error || '';
        } catch {
          // ignore JSON parse error
        }
        throw new Error(serverMessage || `Failed to upload ${fieldName}`);
      }
      const data = await response.json();
      return data.data.imageUrl as string;
    },
  });

  const uploadImageOnce = async (uri: string, fieldName: string, endpoint: string): Promise<string> => {
    if (/^https?:\/\//i.test(uri)) {
      return uri;
    }
    const cacheKey = `${endpoint}::${uri}`;
    if (uploadedUrlsRef.current[cacheKey]) {
      return uploadedUrlsRef.current[cacheKey];
    }
    const uploadedUrl = await uploadImageMutation.mutateAsync({ uri, fieldName, endpoint });
    if (uploadedUrl) {
      uploadedUrlsRef.current[cacheKey] = uploadedUrl;
    }
    return uploadedUrl;
  };

  const handleSubmit = async () => {
    if (!professionName.trim() || professionName.trim().length < 3) {
      showError(t('registerDetails.missingFields'), 'Please enter a valid profession or trade name (at least 3 characters).');
      return;
    }
    if (!hourlyRate || !experience || !skills.trim() || !bio.trim()) {
      showError(t('registerDetails.missingFields'), 'Please fill in your hourly rate, experience, skills, and trade description.');
      return;
    }
    const parsedRate = Number(hourlyRate);
    if (Number.isNaN(parsedRate) || parsedRate < 100) {
      showError(t('registerDetails.missingFields'), 'Hourly rate must be at least Rs. 100.');
      return;
    }
    const parsedExp = Number(experience);
    if (Number.isNaN(parsedExp) || parsedExp < 0) {
      showError(t('registerDetails.missingFields'), 'Please enter a valid years of experience (0 or more).');
      return;
    }
    if (bio.trim().length < 3) {
      showError(t('registerDetails.missingFields'), 'Please provide a description of your trade (at least 3 characters).');
      return;
    }

    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      const hasTitle = cert.title.trim().length > 0;
      const hasImage = Boolean(cert.imageUri);
      if (hasTitle || hasImage || cert.issuingOrg.trim().length > 0) {
        if (cert.title.trim().length < 2) {
          showError(
            t('registerDetails.missingFields'),
            `Please enter a title (at least 2 characters) for Certificate #${i + 1}, or remove it.`
          );
          return;
        }
        if (!hasImage) {
          showError(
            t('registerDetails.missingFields'),
            `Please upload an image for Certificate #${i + 1}, or remove it.`
          );
          return;
        }
      }
    }

    try {
      setIsUploading(true);
      let profileImageUrl = '';
      let cnicFrontUrl = '';
      let cnicBackUrl = '';

      if (params.image) {
        setUploadProgress(t('registerDetails.uploadingProfile'));
        profileImageUrl = await uploadImageOnce(
          params.image,
          'profileImage',
          '/api/v1/workers/upload-profile-image'
        );
      }

      if (params.cnicFront) {
        setUploadProgress(t('registerDetails.uploadingFront'));
        cnicFrontUrl = await uploadImageOnce(
          params.cnicFront,
          'cnicFrontImage',
          '/api/v1/workers/upload-cnic-front'
        );
      }

      if (params.cnicBack) {
        setUploadProgress(t('registerDetails.uploadingBack'));
        cnicBackUrl = await uploadImageOnce(
          params.cnicBack,
          'cnicBackImage',
          '/api/v1/workers/upload-cnic-back'
        );
      }

      const uploadedCertificates: any[] = [];
      if (certificates.length > 0) {
        for (let i = 0; i < certificates.length; i++) {
          const cert = certificates[i];
          if (cert.title.trim() && cert.imageUri) {
            setUploadProgress(`Uploading certificate ${i + 1}/${certificates.length}...`);
            const certUrl = await uploadImageOnce(
              cert.imageUri,
              'certificateImage',
              '/api/v1/workers/upload-certificate'
            );
            uploadedCertificates.push({
              title: cert.title.trim(),
              issuingOrg: cert.issuingOrg.trim(),
              certificateUrl: certUrl,
            });
          }
        }
      }

      setUploadProgress(t('registerDetails.finalizing'));

      const payload: any = {
        fullName: params.fullName,
        email: params.email || undefined,
        phone: params.phone,
        password: params.password,
        address: params.address,
        city: params.city,
        ...(profileImageUrl ? { profileImage: profileImageUrl } : {}),
        ...(params.latitude && params.longitude
          ? { latitude: Number(params.latitude), longitude: Number(params.longitude) }
          : {}),
        fcmToken: '',
        cnicNumber: params.cnicNumber || undefined,
        ...(cnicFrontUrl ? { cnicFrontImage: cnicFrontUrl } : {}),
        ...(cnicBackUrl ? { cnicBackImage: cnicBackUrl } : {}),
        category: professionName.trim(),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        hourlyRate: Number(hourlyRate),
        experience: Number(experience),
        bio: bio.trim(),
        isCustomProfessionRequested: true,
        customProfessionName: professionName.trim(),
        professionRequirements: requirements.trim(),
        certificates: uploadedCertificates,
      };

      const response = await fetch(`${BASE_URL}/api/v1/workers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && Array.isArray(result.errors)) {
          const detail = result.errors.map((e: any) => `${e.field}: ${e.message}`).join('\n');
          throw new Error(detail || 'Registration failed');
        }
        throw new Error(result.message || 'Registration failed');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } catch (error: any) {
      showError(t('registerDetails.errorTitle'), error.message || 'Something went wrong during submission.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleFinish = () => {
    setShowSuccessModal(false);
    router.replace({
      pathname: '/(auth)/login' as any,
      params: { role: 'worker' },
    });
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <AuthHeader
              title={t('requestProfession.title', 'Request profession')}
              onBack={() => router.back()}
              accentColor={accentColor}
            />

            <AuthProgress
              currentStep={4}
              labels={[
                t('auth.stepAccount', 'Account'),
                t('auth.stepVerify', 'Verify'),
                t('auth.stepProfile', 'Profile'),
                t('auth.stepProfession', 'Profession'),
              ]}
              accentColor={accentColor}
            />

            <AuthHero
              accentColor={accentColor}
              eyebrow={t('requestProfession.heroEyebrow', 'Custom Trade Request')}
              title={t('requestProfession.heroTitle', 'Request a new')}
              highlight={t('requestProfession.heroHighlight', 'profession')}
              description={t(
                'requestProfession.heroDesc',
                'Tell us about your trade. Your account will be registered and our admin team will review and verify your request to activate your category.'
              )}
            />

            <View style={styles.form}>
              <GlassCard intensity={25} style={styles.formSection} borderColor={theme.colors.border.subtle}>
                <View style={styles.sectionHeader}>
                  <Wrench size={18} color={accentColor} />
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>
                    {t('requestProfession.tradeSpecs', 'TRADE SPECIFICATIONS')}
                  </Text>
                </View>

                {/* Profession Name */}
                <Text style={styles.label}>
                  {t('requestProfession.professionName', 'PROFESSION / TRADE NAME')} *
                </Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><Briefcase size={18} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder={t('requestProfession.professionPlaceholder', 'e.g., Solar Inverter Specialist, CCTV Tech')}
                    placeholderTextColor={theme.colors.input.placeholder}
                    value={professionName}
                    onChangeText={setProfessionName}
                  />
                </View>

                {/* Category Domain */}
                <Text style={[styles.label, { marginTop: 14 }]}>
                  {t('requestProfession.categoryDomain', 'INDUSTRY / DOMAIN (OPTIONAL)')}
                </Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><Building size={18} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder={t('requestProfession.categoryDomainPlaceholder', 'e.g., Electrical & Power, Mechanics, IT')}
                    placeholderTextColor={theme.colors.input.placeholder}
                    value={categoryDomain}
                    onChangeText={setCategoryDomain}
                  />
                </View>

                {/* Requirements & Tools */}
                <Text style={[styles.label, { marginTop: 14 }]}>
                  {t('requestProfession.requirements', 'TOOLS & EQUIPMENT REQUIRED')}
                </Text>
                <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 10, minHeight: 75 }]}>
                  <View style={[styles.iconContainer, { marginTop: 4 }]}><Wrench size={18} color={accentColor} /></View>
                  <TextInput
                    style={[styles.input, { height: 55, textAlignVertical: 'top' }]}
                    placeholder={t('requestProfession.requirementsPlaceholder', 'e.g., Multimeter, soldering tools, diagnostic kit...')}
                    placeholderTextColor={theme.colors.input.placeholder}
                    multiline
                    value={requirements}
                    onChangeText={setRequirements}
                  />
                </View>

                {/* Rate & Experience */}
                <View style={styles.rowInputs}>
                  <View style={styles.rowInputHalf}>
                    <Text style={styles.label}>{t('requestProfession.ratePerHour', 'RATE / HOUR')} *</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><BadgeDollarSign size={18} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="600"
                        placeholderTextColor={theme.colors.input.placeholder}
                        keyboardType="numeric"
                        value={hourlyRate}
                        onChangeText={setHourlyRate}
                      />
                    </View>
                  </View>
                  <View style={styles.rowInputHalf}>
                    <Text style={styles.label}>{t('requestProfession.experience', 'EXPERIENCE (YRS)')} *</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><Award size={18} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="5"
                        placeholderTextColor={theme.colors.input.placeholder}
                        keyboardType="numeric"
                        value={experience}
                        onChangeText={setExperience}
                      />
                    </View>
                  </View>
                </View>

                {/* Skills */}
                <Text style={[styles.label, { marginTop: 14 }]}>{t('requestProfession.skills', 'SKILLS (COMMA-SEPARATED)')} *</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}><PenTool size={18} color={accentColor} /></View>
                  <TextInput
                    style={styles.input}
                    placeholder={t('requestProfession.skillsPlaceholder', 'e.g., Inverter testing, Wiring, PCB diagnosis')}
                    placeholderTextColor={theme.colors.input.placeholder}
                    value={skills}
                    onChangeText={setSkills}
                  />
                </View>

                {/* About & Expertise */}
                <Text style={[styles.label, { marginTop: 14 }]}>
                  {t('requestProfession.aboutWork', 'ABOUT YOUR TRADE & EXPERIENCE')} *
                </Text>
                <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 10, minHeight: 85 }]}>
                  <View style={[styles.iconContainer, { marginTop: 4 }]}><FileText size={18} color={accentColor} /></View>
                  <TextInput
                    style={[styles.input, { height: 65, textAlignVertical: 'top' }]}
                    placeholder={t('requestProfession.aboutPlaceholder', 'Describe the services you offer and why this trade should be added...')}
                    placeholderTextColor={theme.colors.input.placeholder}
                    multiline
                    value={bio}
                    onChangeText={setBio}
                  />
                </View>
              </GlassCard>

              {/* Optional Certificates / Degrees */}
              <GlassCard intensity={25} style={[styles.formSection, { marginTop: 16 }]} borderColor={theme.colors.border.subtle}>
                <View style={styles.sectionHeader}>
                  <Award size={18} color={accentColor} />
                  <Text style={[styles.sectionTitle, { color: accentColor }]}>
                    {t('registerDetails.certificatesSection', 'TRADE CERTIFICATES / DIPLOMAS (OPTIONAL)')}
                  </Text>
                </View>

                <View style={styles.certTrustBanner}>
                  <ShieldCheck size={18} color={colors.success} style={{ marginTop: 2 }} />
                  <Text style={styles.certTrustText}>
                    {t('registerDetails.certificatesDesc', 'Adding your diploma, trade course certificate, or degree speeds up Admin approval and verifies your profile!')}
                  </Text>
                </View>

                {certificates.map((cert, index) => (
                  <View key={cert.id} style={styles.certCard}>
                    <View style={styles.certCardHeader}>
                      <Text style={styles.certCardIndex}>
                        {t('registerDetails.certificateNumber', { number: index + 1, defaultValue: `Certificate #${index + 1}` })}
                      </Text>
                      <TouchableOpacity onPress={() => removeCertificateSlot(cert.id)} hitSlop={8}>
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>{t('registerDetails.certificateTitle', 'CERTIFICATE / DIPLOMA TITLE')}</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder={t('registerDetails.certificateTitlePlaceholder', 'e.g., Solar Installation Certificate')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={cert.title}
                        onChangeText={(val) => updateCertificate(cert.id, 'title', val)}
                      />
                    </View>

                    <Text style={[styles.label, { marginTop: 8 }]}>{t('registerDetails.issuingOrg', 'ISSUING INSTITUTE / ACADEMY')}</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder={t('registerDetails.issuingOrgPlaceholder', 'e.g., Technical Training Center')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={cert.issuingOrg}
                        onChangeText={(val) => updateCertificate(cert.id, 'issuingOrg', val)}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.certImagePicker, cert.imageUri && { borderColor: accentColor }]}
                      onPress={() => pickCertificateImage(cert.id)}
                    >
                      {cert.imageUri ? (
                        <Image source={{ uri: cert.imageUri }} style={styles.certPreview} />
                      ) : (
                        <View style={styles.certPlaceholder}>
                          <Camera size={18} color={accentColor} />
                          <Text style={[styles.certPlaceholderText, { color: accentColor }]}>
                            {t('registerDetails.uploadCertImage', 'UPLOAD CERTIFICATE IMAGE')}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={[styles.addCertBtn, { borderColor: accentColor + '60' }]} onPress={addCertificateSlot}>
                  <Plus size={16} color={accentColor} />
                  <Text style={[styles.addCertBtnText, { color: accentColor }]}>
                    {t('registerDetails.addCertificate', '+ ADD CERTIFICATE / TRADE PROOF')}
                  </Text>
                </TouchableOpacity>
              </GlassCard>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: accentColor },
                  isUploading && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={isUploading}
              >
                {isUploading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color={theme.colors.button.primaryText} style={{ marginRight: 10 }} />
                    <Text style={styles.submitBtnText}>{uploadProgress || 'SUBMITTING...'}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      {t('requestProfession.submitBtn', 'SUBMIT REGISTRATION & REQUEST')}
                    </Text>
                    <CheckCircle size={20} color={theme.colors.button.primaryText} />
                  </>
                )}
              </TouchableOpacity>

              <SecurityNote accentColor={accentColor} text={t('registerDetails.privacySecured')} />
            </View>

            {/* Success / Verification Confirmation Modal */}
            <Modal
              visible={showSuccessModal}
              transparent
              animationType="fade"
              onRequestClose={handleFinish}
            >
              <View style={styles.successOverlay}>
                <View style={[styles.successCard, { backgroundColor: theme.colors.surface.card || '#121826' }]}>
                  <View style={[styles.successIconCircle, { backgroundColor: accentColor + '25', borderColor: accentColor }]}>
                    <ShieldCheck size={48} color={accentColor} />
                  </View>

                  <Text style={styles.successTitle}>
                    {t('requestProfession.requestSuccess', 'Registration & Request Submitted!')}
                  </Text>

                  <Text style={styles.successDesc}>
                    {t(
                      'requestProfession.requestSuccessDesc',
                      'Your account has been registered and your profession request has been submitted to the Admin team. Once verified and approved, your trade profile will be activated.'
                    )}
                  </Text>

                  <View style={styles.successNoticeBox}>
                    <Clock size={16} color={accentColor} />
                    <Text style={styles.successNoticeText}>
                      Admin verification takes up to 24-48 hours. You will be notified once your trade is approved.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.successBtn, { backgroundColor: accentColor }]}
                    onPress={handleFinish}
                  >
                    <Text style={styles.successBtnText}>
                      {t('requestProfession.goToLogin', 'GO TO LOGIN')}
                    </Text>
                    <ArrowRight size={18} color={theme.colors.button.primaryText} />
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const createStyles = (theme: any, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    form: {
      flex: 1,
      marginTop: 8,
    },
    formSection: {
      padding: 16,
      borderRadius: BorderRadius.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: theme.colors.text.muted,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.input.background,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      paddingHorizontal: 12,
      minHeight: 48,
    },
    iconContainer: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: theme.colors.input.text,
      fontSize: 14,
    },
    rowInputs: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 14,
    },
    rowInputHalf: {
      flex: 1,
    },
    certTrustBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: alpha(colors.success, 0.08),
      borderColor: alpha(colors.success, 0.25),
      borderWidth: 1,
      borderRadius: BorderRadius.m,
      padding: 10,
      gap: 8,
      marginBottom: 14,
    },
    certTrustText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: theme.colors.text.secondary,
    },
    certCard: {
      backgroundColor: theme.colors.surface.card,
      borderColor: theme.colors.border.subtle,
      borderWidth: 1,
      borderRadius: BorderRadius.lg,
      padding: 12,
      marginBottom: 12,
    },
    certCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    certCardIndex: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    certImagePicker: {
      height: 80,
      backgroundColor: theme.colors.surface.subtle,
      borderRadius: BorderRadius.m,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
      overflow: 'hidden',
    },
    certPlaceholder: {
      alignItems: 'center',
      gap: 4,
    },
    certPlaceholderText: {
      fontSize: 10,
      fontWeight: '700',
    },
    certPreview: {
      width: '100%',
      height: '100%',
    },
    addCertBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: BorderRadius.lg,
      gap: 8,
      marginTop: 4,
    },
    addCertBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: BorderRadius.xl,
      marginTop: 24,
      gap: 10,
      ...Shadows.card,
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.colors.button.primaryText,
    },
    successOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    successCard: {
      width: '100%',
      borderRadius: BorderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      padding: 24,
      alignItems: 'center',
    },
    successIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 10,
    },
    successDesc: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.text.muted,
      textAlign: 'center',
      marginBottom: 16,
    },
    successNoticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surface.subtle,
      padding: 12,
      borderRadius: BorderRadius.lg,
      marginBottom: 20,
    },
    successNoticeText: {
      flex: 1,
      fontSize: 11,
      color: theme.colors.text.muted,
      lineHeight: 16,
    },
    successBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: 14,
      borderRadius: BorderRadius.xl,
      gap: 8,
    },
    successBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.button.primaryText,
    },
  });

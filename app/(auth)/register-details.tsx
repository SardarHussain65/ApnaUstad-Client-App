import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  FlatList,
  I18nManager
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import {
  Camera, MapPin, Building,
  Lock, CreditCard, Briefcase, Award, PenTool,
  BadgeDollarSign, FileText, CheckCircle, Eye, EyeOff,
  ChevronDown, Search, X, Plus, Trash2, ArrowRight, ArrowLeft, ShieldCheck, HelpCircle
} from 'lucide-react-native';
import { AppTheme, BorderRadius, Shadows, Spacing, useTheme, useThemeColors, alpha } from '../../constants/Theme';
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

export default function RegisterDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const params = useLocalSearchParams<{
    fullName: string;
    email: string;
    phone: string;
    role: string;
    idToken: string;
  }>();
  const theme = useTheme();
  const colors = useThemeColors();
  const styles = createStyles(theme, colors);
  const isWorker = params.role === 'worker';
  const accentColor = isWorker ? colors.worker : colors.cyan;

  // Step state for worker registration (1: Profile & Credentials, 2: Profession & Trust)
  const [step, setStep] = useState<1 | 2>(1);

  // Profile & Credentials
  const [image, setImage] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Worker Identity & Verification
  const [cnicNumber, setCnicNumber] = useState('');
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);

  // Worker Profession & Details
  const [category, setCategory] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Worker Optional Certificates / Degrees
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  // Cache uploaded ImageKit URLs by local URI so retries never re-upload the same file
  const uploadedUrlsRef = useRef<Record<string, string>>({});

  const captureCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLatitude = currentLocation.coords.latitude;
      const nextLongitude = currentLocation.coords.longitude;
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);

      const results = await Location.reverseGeocodeAsync({
        latitude: nextLatitude,
        longitude: nextLongitude,
      });

      if (results.length > 0) {
        const geo = results[0];
        if (geo.city) setCity((currentCity) => currentCity || geo.city || '');
        const detectedAddress = [geo.name, geo.street, geo.district, geo.city]
          .filter(Boolean)
          .join(', ');
        if (detectedAddress) setAddress((currentAddress) => currentAddress || detectedAddress);
      }
    } catch (error) {
      console.warn('Could not capture registration location:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setIsFetchingCategories(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/users/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsFetchingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (isWorker) {
      void fetchCategories();
    }
    void captureCurrentLocation();
  }, [captureCurrentLocation, fetchCategories, isWorker]);

  const pickImage = async (type: 'profile' | 'cnicFront' | 'cnicBack' | string) => {
    const isProfile = type === 'profile';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isProfile ? [1, 1] : [16, 9],
      quality: 0.6,
    });

    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = result.assets[0].uri;
      if (type === 'profile') setImage(uri);
      else if (type === 'cnicFront') setCnicFront(uri);
      else if (type === 'cnicBack') setCnicBack(uri);
      else if (type.startsWith('cert-')) {
        const certId = type.replace('cert-', '');
        setCertificates((prev) =>
          prev.map((c) => (c.id === certId ? { ...c, imageUri: uri } : c))
        );
      }
    }
  };

  const pickBothCnicImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 2,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (result.assets.length >= 2) {
          setCnicFront(result.assets[0].uri);
          setCnicBack(result.assets[1].uri);
        } else if (result.assets.length === 1) {
          if (!cnicFront) {
            setCnicFront(result.assets[0].uri);
          } else {
            setCnicBack(result.assets[0].uri);
          }
        }
      }
    } catch (err) {
      console.warn('Could not launch multi image picker:', err);
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

  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const endpoint = isWorker ? '/api/v1/workers/register' : '/api/v1/users/register';
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const detail = errorData.errors.map((e: any) => `${e.field}: ${e.message}`).join('\n');
          throw new Error(detail || 'Validation failed');
        }
        throw new Error(errorData.message || 'Registration failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const responseData = data.data || data;
      const user = responseData.user || responseData.worker || responseData;

      if (!user) {
        showError(t('registerDetails.errorTitle'), 'Invalid server response. Please try again.');
        return;
      }

      success(t('registerDetails.profileCreated'), t('registerDetails.profileCreatedDesc'));
      router.replace({
        pathname: '/(auth)/login' as any,
        params: { role: params.role },
      });
    },
    onError: (error: any) => {
      showError(t('registerDetails.errorTitle'), error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const validateStep1 = () => {
    if (isWorker && !image) {
      showError(
        t('registerDetails.missingFields'),
        t('registerDetails.missingProfilePhoto', 'Please add a profile photo before continuing.')
      );
      return false;
    }
    if (isWorker && (!cnicFront || !cnicBack)) {
      showError(t('registerDetails.missingFields'), t('registerDetails.missingCnicPhotos'));
      return false;
    }
    if (!city.trim() || city.trim().length < 2 || !password) {
      showError(t('registerDetails.missingFields'), t('registerDetails.fillRequired'));
      return false;
    }
    if (password.length < 6) {
      showError(t('registerDetails.weakPassword'), t('registerDetails.useMinCharacters'));
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep(2);
    }
  };

  const navigateToRequestProfession = () => {
    setIsDropdownOpen(false);
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cachedProfile = image ? uploadedUrlsRef.current[`/api/v1/workers/upload-profile-image::${image}`] || image : '';
    const cachedFront = cnicFront ? uploadedUrlsRef.current[`/api/v1/workers/upload-cnic-front::${cnicFront}`] || cnicFront : '';
    const cachedBack = cnicBack ? uploadedUrlsRef.current[`/api/v1/workers/upload-cnic-back::${cnicBack}`] || cnicBack : '';

    router.push({
      pathname: '/(auth)/request-profession' as any,
      params: {
        fullName: params.fullName,
        email: params.email || '',
        phone: params.phone,
        role: params.role,
        address: address || city,
        city,
        latitude: latitude !== null ? String(latitude) : '',
        longitude: longitude !== null ? String(longitude) : '',
        password,
        image: cachedProfile,
        cnicNumber: '',
        cnicFront: cachedFront,
        cnicBack: cachedBack,
      },
    });
  };

  const handleCompleteRegistration = async () => {
    // 1. Always validate Step 1 fields first before uploading any images
    if (!validateStep1()) {
      if (isWorker && step !== 1) {
        setStep(1);
      }
      return;
    }

    // 2. Validate all Step 2 fields & certificates before uploading any images
    if (isWorker) {
      if (!category || category.trim().length < 3) {
        showError(t('registerDetails.missingFields'), 'Please select your profession from the dropdown.');
        return;
      }
      if (!hourlyRate || !experience || !bio.trim()) {
        showError(t('registerDetails.missingFields'), 'Please fill in your hourly rate, experience, and bio.');
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
        showError(t('registerDetails.missingFields'), 'Please provide a short description of your work (at least 3 characters).');
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
    }

    try {
      setIsUploading(true);
      let profileImageUrl = '';
      let cnicFrontUrl = '';
      let cnicBackUrl = '';

      if (image) {
        setUploadProgress(t('registerDetails.uploadingProfile'));
        profileImageUrl = await uploadImageOnce(
          image,
          'profileImage',
          isWorker ? '/api/v1/workers/upload-profile-image' : '/api/v1/users/upload-image'
        );
      }

      if (isWorker) {
        if (cnicFront) {
          setUploadProgress(t('registerDetails.uploadingFront'));
          cnicFrontUrl = await uploadImageOnce(
            cnicFront,
            'cnicFrontImage',
            '/api/v1/workers/upload-cnic-front'
          );
        }
        if (cnicBack) {
          setUploadProgress(t('registerDetails.uploadingBack'));
          cnicBackUrl = await uploadImageOnce(
            cnicBack,
            'cnicBackImage',
            '/api/v1/workers/upload-cnic-back'
          );
        }
      }

      // Upload optional certificates (reusing cached URLs if already uploaded)
      const uploadedCertificates: any[] = [];
      if (isWorker && certificates.length > 0) {
        for (let i = 0; i < certificates.length; i++) {
          const cert = certificates[i];
          if (cert.title.trim() && cert.imageUri) {
            setUploadProgress(
              t('registerDetails.uploadingCertProgress', {
                current: i + 1,
                total: certificates.length,
                defaultValue: `Uploading certificate ${i + 1}/${certificates.length}...`,
              })
            );
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
        password,
        address: (address || city).trim(),
        city: city.trim(),
        ...(profileImageUrl ? { profileImage: profileImageUrl } : {}),
        ...(latitude !== null && longitude !== null ? { latitude, longitude } : {}),
        fcmToken: '',
      };

      if (isWorker) {
        if (cnicFrontUrl) payload.cnicFrontImage = cnicFrontUrl;
        if (cnicBackUrl) payload.cnicBackImage = cnicBackUrl;
        payload.category = category;
        payload.skills = [category].filter(Boolean);
        payload.hourlyRate = Number(hourlyRate);
        payload.experience = Number(experience);
        payload.bio = bio.trim();
        payload.certificates = uploadedCertificates;
      }

      registerMutation.mutate(payload);
    } catch (error: any) {
      showError(t('registerDetails.errorTitle'), error.message || t('registerDetails.uploadError'));
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 36, 60) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AuthHeader
              title={t('registerDetails.title')}
              onBack={() => {
                if (isWorker && step === 2) {
                  setStep(1);
                } else {
                  router.back();
                }
              }}
              accentColor={accentColor}
            />

            {isWorker ? (
              <AuthProgress
                currentStep={step === 1 ? 3 : 4}
                labels={[
                  t('auth.stepAccount', 'Account'),
                  t('auth.stepVerify', 'Verify'),
                  t('auth.stepProfile', 'Profile'),
                  t('auth.stepProfession', 'Profession'),
                ]}
                accentColor={accentColor}
              />
            ) : (
              <AuthProgress
                currentStep={3}
                labels={[
                  t('auth.stepAccount', 'Account'),
                  t('auth.stepVerify', 'Verify'),
                  t('auth.stepProfile', 'Profile'),
                ]}
                accentColor={accentColor}
              />
            )}

            <AuthHero
              compact
              accentColor={accentColor}
              eyebrow={
                isWorker
                  ? step === 1
                    ? t('registerDetails.step1Eyebrow', 'Step 1 of 2: Profile & Identity')
                    : t('registerDetails.step2Eyebrow', 'Step 2 of 2: Profession & Trust')
                  : t('registerDetails.almostThere')
              }
              title={
                isWorker
                  ? step === 1
                    ? t('registerDetails.step1Title', 'Profile & Identity')
                    : t('registerDetails.step2Title', 'Profession Setup')
                  : t('registerDetails.completeYour')
              }
              highlight={
                isWorker
                  ? step === 1
                    ? t('registerDetails.step1Highlight', 'Setup')
                    : t('registerDetails.step2Highlight', 'Details')
                  : t('registerDetails.profile')
              }
              description={
                isWorker
                  ? step === 1
                    ? t('registerDetails.step1Desc', 'Add your photo, identity verification, address, and login password.')
                    : t('registerDetails.step2Desc', 'Choose your profession, specify your rates, and optionally add certificates.')
                  : t('registerDetails.clientDesc')
              }
            />

            {/* STEP 1: Profile, CNIC Photos, City, and Password */}
            {(!isWorker || step === 1) && (
              <View style={styles.form}>
                {/* Profile Image Picker */}
                <View style={styles.avatarWrap}>
                  <TouchableOpacity
                    style={[styles.imagePicker, { borderColor: image ? accentColor : 'rgba(255,255,255,0.15)' }]}
                    onPress={() => pickImage('profile')}
                    activeOpacity={0.8}
                  >
                    {image ? (
                      <Image source={{ uri: image }} style={styles.profileImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Camera size={34} color={accentColor} />
                        <Text style={[styles.pickerText, { color: accentColor }]}>{t('registerDetails.addPhoto')}</Text>
                      </View>
                    )}
                    {image && <View style={[styles.imageGlow, { backgroundColor: accentColor }]} />}
                  </TouchableOpacity>
                  <Text style={styles.photoHint}>{t('registerDetails.photoHint')}</Text>
                </View>

                {/* Single Unified Form Card */}
                <GlassCard intensity={25} style={styles.unifiedCard}>
                  {/* Worker CNIC Photos (Dual Image Selection) */}
                  {isWorker && (
                    <View style={styles.cnicBlock}>
                      <View style={styles.cnicHeaderRow}>
                        <View style={styles.cnicHeaderLeft}>
                          <CreditCard size={18} color={accentColor} />
                          <Text style={[styles.sectionTitle, { color: accentColor }]}>
                            {t('registerDetails.cnicImagesSection', 'CNIC Photos (Front & Back)')}
                          </Text>
                        </View>
                        {Boolean(cnicFront && cnicBack) && (
                          <View style={[styles.cnicReadyBadge, { backgroundColor: alpha(colors.success, 0.15) }]}>
                            <CheckCircle size={12} color={colors.success} />
                            <Text style={[styles.cnicReadyText, { color: colors.success }]}>2/2</Text>
                          </View>
                        )}
                      </View>

                      {/* Select Both at Once Button */}
                      <TouchableOpacity
                        style={[
                          styles.pickBothCnicBtn,
                          {
                            borderColor: alpha(accentColor, 0.45),
                            backgroundColor: alpha(accentColor, 0.08),
                          },
                        ]}
                        onPress={pickBothCnicImages}
                        activeOpacity={0.75}
                      >
                        <Camera size={18} color={accentColor} />
                        <Text style={[styles.pickBothCnicBtnText, { color: accentColor }]}>
                          {t('registerDetails.selectBothCnic', 'SELECT BOTH PHOTOS AT ONCE')}
                        </Text>
                      </TouchableOpacity>

                      {/* Side-by-Side Front and Back Cards */}
                      <View style={styles.cnicDualGrid}>
                        {/* Front Side */}
                        <TouchableOpacity
                          style={[
                            styles.cnicSideCard,
                            cnicFront && { borderColor: accentColor, backgroundColor: alpha(accentColor, 0.06) },
                          ]}
                          onPress={() => pickImage('cnicFront')}
                          activeOpacity={0.8}
                        >
                          {cnicFront ? (
                            <View style={styles.cnicPreviewWrap}>
                              <Image source={{ uri: cnicFront }} style={styles.cnicPreviewImg} />
                              <View style={styles.cnicSideBadge}>
                                <Text style={styles.cnicSideBadgeText}>{t('registerDetails.cnicFront')}</Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.cnicEmptyContent}>
                              <Camera size={22} color={accentColor} />
                              <Text style={styles.cnicSideTitle}>{t('registerDetails.cnicFront')}</Text>
                              <Text style={styles.cnicSideSub}>{t('common.tapToSelect', 'Tap to upload')}</Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Back Side */}
                        <TouchableOpacity
                          style={[
                            styles.cnicSideCard,
                            cnicBack && { borderColor: accentColor, backgroundColor: alpha(accentColor, 0.06) },
                          ]}
                          onPress={() => pickImage('cnicBack')}
                          activeOpacity={0.8}
                        >
                          {cnicBack ? (
                            <View style={styles.cnicPreviewWrap}>
                              <Image source={{ uri: cnicBack }} style={styles.cnicPreviewImg} />
                              <View style={styles.cnicSideBadge}>
                                <Text style={styles.cnicSideBadgeText}>{t('registerDetails.cnicBack')}</Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.cnicEmptyContent}>
                              <Camera size={22} color={accentColor} />
                              <Text style={styles.cnicSideTitle}>{t('registerDetails.cnicBack')}</Text>
                              <Text style={styles.cnicSideSub}>{t('common.tapToSelect', 'Tap to upload')}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* City */}
                  <View style={[styles.fieldBlock, isWorker && { marginTop: 18 }]}>
                    <Text style={styles.label}>{t('registerDetails.city')}</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><Building size={18} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder={t('registerDetails.cityPlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>
                  </View>

                  {/* Password (Single with eye toggle) */}
                  <View style={[styles.fieldBlock, { marginTop: 16 }]}>
                    <Text style={styles.label}>{t('registerDetails.password')}</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.iconContainer}><Lock size={18} color={accentColor} /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••••••"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        hitSlop={8}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        {showPassword
                          ? <EyeOff size={18} color={theme.colors.text.muted} />
                          : <Eye size={18} color={theme.colors.text.muted} />}
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>

                {/* Step 1 Actions */}
                {isWorker ? (
                  <TouchableOpacity
                    style={[styles.completeBtn, { backgroundColor: accentColor }]}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.completeBtnText}>
                      {t('registerDetails.continueToProfession', 'CONTINUE TO PROFESSION')}
                    </Text>
                    {I18nManager.isRTL ? (
                      <ArrowLeft size={18} color="#000" />
                    ) : (
                      <ArrowRight size={18} color="#000" />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.completeBtn,
                      { backgroundColor: accentColor },
                      (isUploading || registerMutation.isPending) && { opacity: 0.7 },
                    ]}
                    onPress={handleCompleteRegistration}
                    disabled={isUploading || registerMutation.isPending}
                  >
                    {isUploading || registerMutation.isPending ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#000" style={{ marginRight: 10 }} />
                        <Text style={styles.completeBtnText}>{uploadProgress || t('registerDetails.uploading')}</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.completeBtnText}>{t('registerDetails.createProfile')}</Text>
                        <CheckCircle size={20} color="#000" />
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <SecurityNote accentColor={accentColor} text={t('registerDetails.privacySecured')} />
              </View>
            )}

            {/* STEP 2: Worker Profession, Rates, Experience, Bio, and Certificates */}
            {isWorker && step === 2 && (
              <View style={styles.form}>
                {/* Profession Selection */}
                <GlassCard intensity={25} style={styles.formSection}>
                  <View style={styles.sectionHeader}>
                    <Briefcase size={18} color={accentColor} />
                    <Text style={[styles.sectionTitle, { color: accentColor }]}>
                      {t('registerDetails.professionalDetails')}
                    </Text>
                  </View>

                  <Text style={styles.label}>{t('registerDetails.serviceCategory')}</Text>

                  {/* Dropdown Selector Trigger */}
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, category && { borderColor: accentColor }]}
                    onPress={() => setIsDropdownOpen(true)}
                  >
                    <View style={styles.dropdownTriggerContent}>
                      <Briefcase size={18} color={category ? accentColor : 'rgba(255,255,255,0.4)'} />
                      <Text style={[styles.dropdownTriggerText, category && { color: '#fff', fontWeight: '600' }]}>
                        {category || t('registerDetails.selectProfession', 'Select your profession')}
                      </Text>
                    </View>
                    <ChevronDown size={20} color={category ? accentColor : 'rgba(255,255,255,0.5)'} />
                  </TouchableOpacity>

                  {/* Experience & Rate per hour */}
                  <View style={styles.rowInputs}>
                    <View style={styles.rowInputHalf}>
                      <Text style={styles.label}>{t('registerDetails.ratePerHour')}</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.iconContainer}><BadgeDollarSign size={18} color={accentColor} /></View>
                        <TextInput
                          style={styles.input}
                          placeholder="500"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="numeric"
                          value={hourlyRate}
                          onChangeText={setHourlyRate}
                        />
                      </View>
                    </View>
                    <View style={styles.rowInputHalf}>
                      <Text style={styles.label}>{t('registerDetails.experience')}</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.iconContainer}><Award size={18} color={accentColor} /></View>
                        <TextInput
                          style={styles.input}
                          placeholder="5"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="numeric"
                          value={experience}
                          onChangeText={setExperience}
                        />
                      </View>
                    </View>
                  </View>

                  {/* About / Bio */}
                  <Text style={[styles.label, { marginTop: 14 }]}>{t('registerDetails.aboutWork')}</Text>
                  <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 10, minHeight: 80 }]}>
                    <View style={[styles.iconContainer, { marginTop: 4 }]}><FileText size={18} color={accentColor} /></View>
                    <TextInput
                      style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                      placeholder={t('registerDetails.aboutPlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline
                      value={bio}
                      onChangeText={setBio}
                    />
                  </View>
                </GlassCard>

                {/* Optional Certificates & Technical Degrees (Trust Booster) */}
                <GlassCard intensity={25} style={[styles.formSection, { marginTop: 16 }]}>
                  <View style={styles.sectionHeader}>
                    <Award size={18} color={accentColor} />
                    <Text style={[styles.sectionTitle, { color: accentColor }]}>
                      {t('registerDetails.certificatesSection', 'CERTIFICATES & DEGREES (OPTIONAL)')}
                    </Text>
                  </View>

                  <View style={styles.certTrustBanner}>
                    <ShieldCheck size={18} color={colors.success} style={{ marginTop: 2 }} />
                    <Text style={styles.certTrustText}>
                      {t(
                        'registerDetails.certificatesDesc',
                        'Upload vocational diplomas, trade licenses, or technical degrees to earn a "Verified Specialist" badge and get more bookings.'
                      )}
                    </Text>
                  </View>

                  {/* List of Added Certificates */}
                  {certificates.map((cert, index) => (
                    <View key={cert.id} style={styles.certCard}>
                      <View style={styles.certCardHeader}>
                        <Text style={styles.certCardIndex}>
                          {t('registerDetails.certificateNumber', { number: index + 1, defaultValue: `Certificate #${index + 1}` })}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeCertificateSlot(cert.id)}
                          hitSlop={8}
                          style={styles.removeCertBtn}
                        >
                          <Trash2 size={16} color={colors.error} />
                          <Text style={[styles.removeCertText, { color: colors.error }]}>
                            {t('registerDetails.removeCertificate', 'Remove')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.label}>{t('registerDetails.certificateTitle', 'CERTIFICATE / DEGREE TITLE')}</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.iconContainer}><Award size={16} color={accentColor} /></View>
                        <TextInput
                          style={styles.input}
                          placeholder={t('registerDetails.certificateTitlePlaceholder', 'e.g., DAE Electrical, HVAC Diploma')}
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={cert.title}
                          onChangeText={(val) => updateCertificate(cert.id, 'title', val)}
                        />
                      </View>

                      <Text style={[styles.label, { marginTop: 10 }]}>{t('registerDetails.issuingOrg', 'INSTITUTE / ISSUING BOARD')}</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.iconContainer}><Building size={16} color={accentColor} /></View>
                        <TextInput
                          style={styles.input}
                          placeholder={t('registerDetails.issuingOrgPlaceholder', 'e.g., TEVTA, Technical Board')}
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={cert.issuingOrg}
                          onChangeText={(val) => updateCertificate(cert.id, 'issuingOrg', val)}
                        />
                      </View>

                      <TouchableOpacity
                        style={[styles.certImagePicker, cert.imageUri && { borderColor: accentColor }]}
                        onPress={() => pickImage(`cert-${cert.id}`)}
                      >
                        {cert.imageUri ? (
                          <Image source={{ uri: cert.imageUri }} style={styles.certPreview} />
                        ) : (
                          <View style={styles.certPlaceholder}>
                            <Camera size={20} color={accentColor} />
                            <Text style={[styles.certPlaceholderText, { color: accentColor }]}>
                              {t('registerDetails.uploadCertImage', 'TAP TO UPLOAD CERTIFICATE')}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add Certificate Button */}
                  <TouchableOpacity style={[styles.addCertBtn, { borderColor: accentColor + '60' }]} onPress={addCertificateSlot}>
                    <Plus size={16} color={accentColor} />
                    <Text style={[styles.addCertBtnText, { color: accentColor }]}>
                      {t('registerDetails.addCertificate', '+ ADD CERTIFICATE / DEGREE')}
                    </Text>
                  </TouchableOpacity>
                </GlassCard>

                {/* Step 2 Action Buttons */}
                <View style={styles.step2Actions}>
                  <TouchableOpacity
                    style={[
                      styles.completeBtn,
                      { backgroundColor: accentColor },
                      (isUploading || registerMutation.isPending) && { opacity: 0.7 },
                    ]}
                    onPress={handleCompleteRegistration}
                    disabled={isUploading || registerMutation.isPending}
                    activeOpacity={0.8}
                  >
                    {isUploading || registerMutation.isPending ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.completeBtnText}>{uploadProgress || t('registerDetails.uploading')}</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.completeBtnText}>{t('registerDetails.createProfile')}</Text>
                        <CheckCircle size={20} color="#000" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stepBackCompactBtn}
                    onPress={() => setStep(1)}
                    activeOpacity={0.7}
                  >
                    {I18nManager.isRTL ? (
                      <ArrowRight size={15} color={theme.colors.text.muted} />
                    ) : (
                      <ArrowLeft size={15} color={theme.colors.text.muted} />
                    )}
                    <Text style={styles.stepBackCompactBtnText}>
                      {t('registerDetails.backToProfile', 'Back to Profile')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <SecurityNote accentColor={accentColor} text={t('registerDetails.privacySecured')} />
              </View>
            )}

            {/* Profession Dropdown Modal */}
            <Modal
              visible={isDropdownOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setIsDropdownOpen(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface.card || '#121826' }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {t('registerDetails.selectProfession', 'Select your profession')}
                    </Text>
                    <TouchableOpacity onPress={() => setIsDropdownOpen(false)} hitSlop={12}>
                      <X size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>

                  {/* Search Bar */}
                  <View style={styles.searchWrapper}>
                    <Search size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('registerDetails.searchProfession', 'Search profession or trade...')}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={categorySearchQuery}
                      onChangeText={setCategorySearchQuery}
                      autoCapitalize="none"
                    />
                    {categorySearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                        <X size={16} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Categories List */}
                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((item: any) => {
                        const isSelected = category === item.name;
                        return (
                          <TouchableOpacity
                            key={item._id || item.name}
                            style={[styles.categoryItem, isSelected && { backgroundColor: accentColor + '20' }]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setCategory(item.name);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <View style={styles.categoryItemLeft}>
                              <View style={[styles.categoryIconCircle, { backgroundColor: (item.color || accentColor) + '25' }]}>
                                <Briefcase size={16} color={item.color || accentColor} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryItemName, isSelected && { color: accentColor, fontWeight: '700' }]}>
                                  {item.name}
                                </Text>
                                {item.description ? (
                                  <Text style={styles.categoryItemDesc} numberOfLines={1}>
                                    {item.description}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                            {isSelected && <CheckCircle size={18} color={accentColor} />}
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyList}>
                        <Text style={styles.emptyListText}>
                          {t('registerDetails.noProfessionFound', 'No matching profession found')}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Request Profession Option inside Dropdown */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalRequestBtn, { borderColor: accentColor }]}
                      onPress={navigateToRequestProfession}
                    >
                      <Plus size={16} color={accentColor} />
                      <Text style={[styles.modalRequestBtnText, { color: accentColor }]}>
                        {t('registerDetails.cantFindProfession', "Can't find your profession? Request it here")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const createStyles = (theme: AppTheme, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    form: {
      flex: 1,
    },
    imagePicker: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignSelf: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
      backgroundColor: theme.id === 'light' ? theme.colors.surface.card : 'rgba(255,255,255,0.03)',
      overflow: 'hidden',
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerText: {
      fontSize: 10,
      fontWeight: '700',
      marginTop: 4,
      color: theme.colors.text.muted,
    },
    imageGlow: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.15,
    },
    photoHint: {
      fontSize: 11,
      color: theme.colors.text.muted,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 10,
    },
    avatarWrap: {
      alignItems: 'center',
      marginBottom: 4,
    },
    unifiedCard: {
      padding: 14,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.card,
    },
    cnicBlock: {
      marginBottom: 4,
    },
    cnicHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    cnicHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      marginRight: 6,
    },
    cnicReadyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
    },
    cnicReadyText: {
      fontSize: 11,
      fontWeight: '800',
    },
    pickBothCnicBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      gap: 8,
      marginBottom: 10,
    },
    pickBothCnicBtnText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    cnicDualGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    cnicSideCard: {
      flex: 1,
      height: 86,
      backgroundColor: theme.id === 'light' ? theme.colors.surface.subtle : 'rgba(255,255,255,0.03)',
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    cnicPreviewWrap: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    cnicPreviewImg: {
      width: '100%',
      height: '100%',
    },
    cnicSideBadge: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingVertical: 3,
      alignItems: 'center',
    },
    cnicSideBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
    cnicEmptyContent: {
      alignItems: 'center',
      padding: 6,
      gap: 2,
    },
    cnicSideTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginTop: 2,
      textAlign: 'center',
    },
    cnicSideSub: {
      fontSize: 9,
      color: theme.colors.text.muted,
      textAlign: 'center',
    },
    fieldBlock: {
      width: '100%',
    },
    formSection: {
      padding: 14,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.card,
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
      color: theme.colors.text.primary,
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
      borderColor: theme.colors.input.border,
      paddingHorizontal: 12,
      minHeight: 48,
    },
    iconContainer: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: theme.colors.text.primary,
      fontSize: 14,
    },
    cnicImagesRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 14,
    },
    cnicPicker: {
      flex: 1,
      height: 90,
      backgroundColor: theme.id === 'light' ? theme.colors.surface.subtle : 'rgba(255,255,255,0.03)',
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    cnicPickerText: {
      fontSize: 10,
      color: theme.colors.text.muted,
      fontWeight: '700',
      marginTop: 4,
    },
    cnicPreview: {
      width: '100%',
      height: '100%',
    },
    locationStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
    },
    locationStatusText: {
      fontSize: 12,
      color: theme.colors.text.muted,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.input.background,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.input.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 12,
    },
    dropdownTriggerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dropdownTriggerText: {
      fontSize: 14,
      color: theme.colors.text.dim,
    },
    cantFindBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.subtle,
      gap: 10,
      marginBottom: 16,
    },
    cantFindIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: alpha(colors.cyan, 0.12),
      justifyContent: 'center',
      alignItems: 'center',
    },
    cantFindTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    cantFindSub: {
      fontSize: 11,
      color: theme.colors.text.muted,
      marginTop: 2,
    },
    rowInputs: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    rowInputHalf: {
      flex: 1,
    },
    certTrustBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: alpha(theme.colors.status.success, 0.08),
      borderColor: alpha(theme.colors.status.success, 0.25),
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
      color: theme.colors.text.primary,
    },
    certCard: {
      backgroundColor: theme.colors.surface.subtle,
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
      marginBottom: 10,
    },
    certCardIndex: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    removeCertBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    removeCertText: {
      fontSize: 11,
      fontWeight: '600',
    },
    certImagePicker: {
      height: 80,
      backgroundColor: theme.id === 'light' ? theme.colors.surface.card : 'rgba(255,255,255,0.03)',
      borderRadius: BorderRadius.m,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
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
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.surface.subtle,
      gap: 8,
      marginTop: 4,
    },
    addCertBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    completeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: BorderRadius.xl,
      marginTop: 16,
      gap: 8,
      ...Shadows.card,
    },
    completeBtnText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: theme.colors.button.primaryText,
    },
    step2Actions: {
      marginTop: 18,
      gap: 8,
    },
    stepBackCompactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: BorderRadius.full,
      gap: 6,
      marginTop: 4,
    },
    stepBackCompactBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text.muted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.modal.backdrop,
      justifyContent: 'flex-end',
    },
    modalSheet: {
      maxHeight: '75%',
      backgroundColor: theme.colors.modal.card,
      borderTopLeftRadius: BorderRadius.xxl,
      borderTopRightRadius: BorderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.colors.modal.border,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 30,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.text.primary,
    },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.input.background,
      borderWidth: 1,
      borderColor: theme.colors.input.border,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 14,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.input.text,
      fontSize: 14,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: BorderRadius.lg,
      marginBottom: 4,
    },
    categoryItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    categoryIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryItemName: {
      fontSize: 14,
      color: theme.colors.text.primary,
      fontWeight: '500',
    },
    categoryItemDesc: {
      fontSize: 11,
      color: theme.colors.text.muted,
      marginTop: 2,
    },
    emptyList: {
      paddingVertical: 30,
      alignItems: 'center',
    },
    emptyListText: {
      fontSize: 13,
      color: theme.colors.text.muted,
    },
    modalFooter: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.subtle,
      paddingTop: 12,
    },
    modalRequestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.surface.subtle,
      gap: 8,
    },
    modalRequestBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });

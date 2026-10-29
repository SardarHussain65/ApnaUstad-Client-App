import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Award,
  Briefcase,
  Building,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock3,
  Layers3,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../../context/LanguageContext';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { AlertModal, BeautifulModal, ConfirmModal } from '../../components/ui';
import { useAlertModal, useConfirmModal, useToast } from '../../hooks';
import { BASE_URL } from '../../constants/Config';
import { alpha, BorderRadius, Spacing, useTheme, useThemeColors, useThemeShadows } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

type Category = {
  _id: string;
  name: string;
  color?: string;
  description?: string;
  additionalCategoryMonthlyFee?: number;
  additionalCategoryGraceDays?: number;
};

type CertificateDraft = {
  id: string;
  title: string;
  issuingOrg: string;
  imageUri: string | null;
};

type SpecialtyCertificate = {
  title: string;
  issuingOrg?: string;
  certificateUrl: string;
  categoryName?: string;
  verificationStatus?: string;
};

type Specialty = {
  _id: string;
  categoryId: Category;
  priority: number;
  tier: 'primary' | 'additional';
  skills: string[];
  hourlyRate: number;
  experience: number;
  bio?: string;
  certificates?: SpecialtyCertificate[];
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionStatus: 'free' | 'pending_activation' | 'active' | 'payment_due' | 'expired';
  monthlyFeeSnapshot: number;
  autoRenew: boolean;
  requestedAt?: string;
  approvedAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  nextBillingAt?: string | null;
  graceEndsAt?: string | null;
  lastChargedAt?: string | null;
};

type CustomProfessionRequest = {
  _id: string;
  professionName: string;
  categoryDomain?: string;
  description: string;
  hourlyRate: number;
  experience: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  certificates?: SpecialtyCertificate[];
  createdAt: string;
};

type SpecialtyResponse = {
  specialties: Specialty[];
  pendingCustomRequests?: CustomProfessionRequest[];
  maxSpecialties: number;
  freeSpecialtyLimit: number;
  additionalCategoryMonthlyFee: number;
};

type WalletSnapshot = {
  balance?: number;
  availableBalance?: number;
  additionalCategoryMonthlyFee?: number;
};

const statusColor = (specialty: Specialty, colors: any) => {
  if (specialty.approvalStatus === 'pending') return colors.yellow;
  if (specialty.approvalStatus === 'rejected' || specialty.subscriptionStatus === 'expired') return colors.error;
  if (specialty.subscriptionStatus === 'payment_due') return colors.worker;
  return colors.success;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getErrorMessage = (error: any) => error?.response?.data?.message || error?.message || 'Please try again.';
const formatPKR = (value: number) => `Rs. ${Math.max(0, Number(value || 0)).toLocaleString('en-PK')}`;
const isWalletBalanceError = (error: any) => error?.response?.status === 402 || error?.response?.data?.requiredBalance !== undefined;

export default function SpecialtiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const [data, setData] = useState<SpecialtyResponse>({ specialties: [], maxSpecialties: 5, freeSpecialtyLimit: 1, additionalCategoryMonthlyFee: 500 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [walletAvailableBalance, setWalletAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingKey, setWorkingKey] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [rechargePromptVisible, setRechargePromptVisible] = useState(false);
  const [rechargeActionLabel, setRechargeActionLabel] = useState('request another category');
  const { user } = useAuth();
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchCategoryText, setSearchCategoryText] = useState('');
  const [draftCategoryId, setDraftCategoryId] = useState('');
  const [draftRate, setDraftRate] = useState('');
  const [draftExperience, setDraftExperience] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftCertificates, setDraftCertificates] = useState<CertificateDraft[]>([]);
  const [workerCertificates, setWorkerCertificates] = useState<SpecialtyCertificate[]>([]);
  const [previewCert, setPreviewCert] = useState<SpecialtyCertificate | null>(null);
  const uploadedCertUrlsRef = useRef<Record<string, string>>({});
  const theme = useTheme();
  const colors = useThemeColors();
  const shadows = useThemeShadows();
  const toast = useToast();
  const alertModal = useAlertModal();
  const confirmModal = useConfirmModal();

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [specialtyResponse, categoryResponse, walletResponse, workerProfileResponse] = await Promise.all([
        api.get('/workers/specialties'),
        api.get('/users/categories'),
        api.get('/wallet/my-wallet'),
        user?._id ? api.get(`/workers/${user._id}`).catch(() => null) : Promise.resolve(null),
      ]);
      const specialtyData = specialtyResponse.data.data || {};
      const walletData: WalletSnapshot = walletResponse.data.data || {};
      const workerData = workerProfileResponse?.data?.data || user || {};
      setWorkerCertificates(Array.isArray(workerData?.certificates) ? workerData.certificates : []);
      setData({
        specialties: specialtyData.specialties || [],
        pendingCustomRequests: specialtyData.pendingCustomRequests || [],
        maxSpecialties: specialtyData.maxSpecialties || 5,
        freeSpecialtyLimit: specialtyData.freeSpecialtyLimit || 1,
        additionalCategoryMonthlyFee: Number(specialtyData.additionalCategoryMonthlyFee ?? walletData.additionalCategoryMonthlyFee ?? 500),
      });
      setCategories(categoryResponse.data.data || []);
      setWalletAvailableBalance(Math.max(0, Number(walletData.availableBalance ?? walletData.balance ?? 0)));
    } catch (error) {
      toast.error(t('specialties.loadError'), getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, user]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const specialties = useMemo(
    () => [...data.specialties].sort((left, right) => left.priority - right.priority),
    [data.specialties]
  );
  const selectedIds = useMemo(() => new Set(specialties.map(item => item.categoryId._id)), [specialties]);
  const availableCategories = categories.filter(category => !selectedIds.has(category._id));
  const filteredAvailableCategories = useMemo(() => {
    if (!searchCategoryText.trim()) return availableCategories;
    const query = searchCategoryText.toLowerCase().trim();
    return availableCategories.filter(cat => cat.name.toLowerCase().includes(query));
  }, [availableCategories, searchCategoryText]);
  const draftCategory = availableCategories.find(category => category._id === draftCategoryId);
  const additionalCategoryMonthlyFee = Math.max(0, Number(data.additionalCategoryMonthlyFee ?? 500));
  const walletShortfall = Math.max(0, additionalCategoryMonthlyFee - walletAvailableBalance);

  const showRechargePrompt = (actionLabel = 'request another category') => {
    setRechargeActionLabel(actionLabel);
    setRechargePromptVisible(true);
  };

  const runAction = async (key: string, action: () => Promise<any>, successMessage: string) => {
    setWorkingKey(key);
    try {
      await action();
      await load(true);
      alertModal.showAlert(
        t('specialties.done'),
        successMessage,
        undefined,
        'success',
        t('common.ok', { defaultValue: 'OK' })
      );
      return true;
    } catch (error) {
      const actionError: any = error;
      if (isWalletBalanceError(actionError)) {
        const requiredBalance = Number(actionError?.response?.data?.requiredBalance);
        const currentBalance = Number(actionError?.response?.data?.currentBalance);
        if (Number.isFinite(requiredBalance) && requiredBalance >= 0) {
          setData(current => ({ ...current, additionalCategoryMonthlyFee: requiredBalance }));
        }
        if (Number.isFinite(currentBalance) && currentBalance >= 0) {
          setWalletAvailableBalance(currentBalance);
        }
        showRechargePrompt(key.startsWith('activate-') ? t('specialties.activatePay').toLowerCase() : t('specialties.requestNew').toLowerCase());
        return false;
      }
      alertModal.showAlert(
        t('specialties.unableContinue'),
        getErrorMessage(actionError),
        undefined,
        'error',
        t('common.ok', { defaultValue: 'OK' })
      );
      return false;
    } finally {
      setWorkingKey('');
    }
  };

  const resetDraft = () => {
    setDraftCategoryId('');
    setIsCustomMode(false);
    setCustomCategoryName('');
    setSearchCategoryText('');
    setIsDropdownOpen(false);
    setDraftRate('');
    setDraftExperience('');
    setDraftBio('');
    setDraftCertificates([]);
  };

  const addCertificateSlot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftCertificates((prev) => [
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
    setDraftCertificates((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCertificateField = (id: string, field: 'title' | 'issuingOrg', value: string) => {
    setDraftCertificates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const pickCertificateImage = async (id: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.65,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = result.assets[0].uri;
      setDraftCertificates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, imageUri: uri } : c))
      );
    }
  };

  const uploadCertificateOnce = async (uri: string): Promise<string> => {
    if (/^https?:\/\//i.test(uri)) return uri;
    if (uploadedCertUrlsRef.current[uri]) {
      return uploadedCertUrlsRef.current[uri];
    }
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'certificate.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpg';
    formData.append('certificateImage', { uri, name: filename, type } as any);

    const response = await fetch(`${BASE_URL}/api/v1/workers/upload-certificate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let serverMsg = '';
      try {
        const errJson = await response.json();
        serverMsg = errJson?.message || errJson?.error || '';
      } catch {
        // ignore parse error
      }
      throw new Error(serverMsg || 'Failed to upload certificate image');
    }

    const resData = await response.json();
    const imageUrl = resData?.data?.imageUrl;
    if (imageUrl) {
      uploadedCertUrlsRef.current[uri] = imageUrl;
    }
    return imageUrl;
  };

  const validateAndUploadDraftCertificates = async (): Promise<SpecialtyCertificate[] | null> => {
    for (let i = 0; i < draftCertificates.length; i++) {
      const cert = draftCertificates[i];
      const hasTitle = cert.title.trim().length > 0;
      const hasImage = Boolean(cert.imageUri);
      if ((hasTitle || cert.issuingOrg.trim().length > 0) && !hasImage) {
        toast.warning(
          t('specialties.completeDetails', { defaultValue: 'Complete Details' }),
          `Please upload an image for Certificate #${i + 1}, or remove it.`
        );
        return null;
      }
    }

    const uploaded: SpecialtyCertificate[] = [];
    for (let i = 0; i < draftCertificates.length; i++) {
      const cert = draftCertificates[i];
      if (cert.imageUri) {
        const certificateUrl = await uploadCertificateOnce(cert.imageUri);
        uploaded.push({
          title: cert.title.trim() || `Certificate #${i + 1}`,
          issuingOrg: cert.issuingOrg.trim(),
          certificateUrl,
        });
      }
    }
    return uploaded;
  };

  const isWalletReadyForAdditionalCategory = () => additionalCategoryMonthlyFee <= 0 || walletAvailableBalance >= additionalCategoryMonthlyFee;

  const openAddCategory = () => {
    if (showPicker) {
      setShowPicker(false);
      return;
    }
    if (!isWalletReadyForAdditionalCategory()) {
      showRechargePrompt();
      return;
    }
    setShowPicker(true);
  };

  const requestCustomCategory = async () => {
    const hourlyRate = Number(draftRate);
    const experience = Number(draftExperience);
    if (!customCategoryName.trim() || !draftBio.trim() || !Number.isFinite(hourlyRate) || hourlyRate < 100 || !Number.isFinite(experience) || experience < 0) {
      toast.warning(
        t('specialties.completeDetails', { defaultValue: 'Complete Details' }),
        t('specialties.completeCustomDetailsDesc', { defaultValue: 'Please enter category name, hourly rate (min 100), experience, and description.' })
      );
      return;
    }

    setWorkingKey('request-custom-category');
    let uploadedCertificates: SpecialtyCertificate[] | null = null;
    try {
      uploadedCertificates = await validateAndUploadDraftCertificates();
      if (uploadedCertificates === null) {
        setWorkingKey('');
        return;
      }
    } catch (uploadErr: any) {
      setWorkingKey('');
      toast.error(t('specialties.unableContinue'), uploadErr?.message || 'Certificate upload failed.');
      return;
    }

    runAction(
      'request-custom-category',
      () => api.post('/workers/profession-request', {
        professionName: customCategoryName.trim(),
        categoryDomain: 'Additional Specialty',
        hourlyRate,
        experience,
        description: draftBio.trim(),
        requesterName: user?.fullName || 'Worker',
        requesterPhone: user?.phone || '',
        workerId: user?._id || undefined,
        certificates: uploadedCertificates,
      }),
      t('specialties.customCategorySuccessDesc', {
        defaultValue: 'Your request for a new category has been sent to admin for review and addition.'
      })
    ).then((success) => {
      if (success) {
        resetDraft();
        setShowPicker(false);
      }
    });
  };

  const requestCategory = async () => {
    if (isCustomMode) {
      await requestCustomCategory();
      return;
    }

    const selectedCat = categories.find(c => c._id === draftCategoryId);
    const hourlyRate = Number(draftRate);
    const experience = Number(draftExperience);
    if (!draftCategoryId || !draftBio.trim() || !Number.isFinite(hourlyRate) || hourlyRate < 100 || !Number.isFinite(experience) || experience < 0) {
      toast.warning(t('specialties.completeDetails'), t('specialties.completeDetailsDesc'));
      return;
    }
    if (!isWalletReadyForAdditionalCategory()) {
      showRechargePrompt();
      return;
    }

    setWorkingKey('request-category');
    let uploadedCertificates: SpecialtyCertificate[] | null = null;
    try {
      uploadedCertificates = await validateAndUploadDraftCertificates();
      if (uploadedCertificates === null) {
        setWorkingKey('');
        return;
      }
    } catch (uploadErr: any) {
      setWorkingKey('');
      toast.error(t('specialties.unableContinue'), uploadErr?.message || 'Certificate upload failed.');
      return;
    }

    runAction(
      'request-category',
      () => api.post('/workers/specialties/requests', {
        categoryId: draftCategoryId,
        skills: [selectedCat?.name || 'General Service'],
        hourlyRate,
        experience,
        bio: draftBio.trim(),
        certificates: uploadedCertificates,
      }),
      t('specialties.requestSentDesc')
    ).then((success) => {
      if (success) {
        resetDraft();
        setShowPicker(false);
      }
    });
  };

  const activate = (specialty: Specialty) => {
    const fee = specialty.priority > data.freeSpecialtyLimit ? additionalCategoryMonthlyFee : 0;
    if (fee > 0 && walletAvailableBalance < fee) {
      showRechargePrompt(t('specialties.activatePay').toLowerCase());
      return;
    }
    const targetCategoryId = typeof specialty.categoryId === 'object' ? (specialty.categoryId as any)?._id : specialty.categoryId;
    confirmModal.showConfirm(
      t('specialties.activateConfirmTitle'),
      t('specialties.activateConfirmDesc', { fee: formatPKR(fee) }),
      () => {
        confirmModal.closeConfirm();
        void runAction(
          `activate-${specialty._id}`,
          () => api.patch(`/workers/specialties/${targetCategoryId}/activate`),
          t('specialties.activatedDesc', { defaultValue: 'Your specialty is active and can receive matching jobs.' })
        );
      },
      undefined,
      t('specialties.activatePayBtn', { defaultValue: 'Activate & Pay' }),
      t('common.cancel'),
      theme.colors.brand.primary
    );
  };

  const move = (index: number, offset: number) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= specialties.length) return;
    const next = [...specialties];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    runAction(
      'reorder',
      () => api.patch('/workers/specialties/priorities', { categoryIds: next.map(item => typeof item.categoryId === 'object' ? (item.categoryId as any)._id : item.categoryId) }),
      t('specialties.priorityUpdatedDesc')
    );
  };

  const remove = (specialty: Specialty) => {
    const targetCategoryId = typeof specialty.categoryId === 'object' ? (specialty.categoryId as any)?._id : specialty.categoryId;
    const catName = typeof specialty.categoryId === 'object' ? (specialty.categoryId as any)?.name : 'this category';
    confirmModal.showConfirm(
      t('specialties.removeConfirmTitle'),
      t('specialties.removeConfirmDesc', { category: catName }),
      () => {
        confirmModal.closeConfirm();
        void runAction(
          `remove-${specialty._id}`,
          () => api.delete(`/workers/specialties/${targetCategoryId}`),
          t('specialties.removedDesc')
        );
      },
      undefined,
      t('common.remove', { defaultValue: 'Remove' }),
      t('common.cancel'),
      colors.error
    );
  };

  const removeCustomRequest = (req: CustomProfessionRequest) => {
    confirmModal.showConfirm(
      t('specialties.removeConfirmTitle', { defaultValue: 'Remove Request' }),
      `Are you sure you want to cancel your request for "${req.professionName}"?`,
      () => {
        confirmModal.closeConfirm();
        void runAction(
          `remove-req-${req._id}`,
          () => api.delete(`/workers/profession-request/${req._id}`),
          'Profession request removed.'
        );
      },
      undefined,
      t('common.remove', { defaultValue: 'Remove' }),
      t('common.cancel'),
      colors.error
    );
  };

  return (
    <BackgroundWrapper>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: Spacing.l, paddingTop: 6 }]}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]} onPress={() => router.back()}>
            {isRTL ? (
              <ChevronRight size={22} color={theme.colors.text.primary} />
            ) : (
              <ChevronLeft size={22} color={theme.colors.text.primary} />
            )}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{t('specialties.title')}</Text>
          <View style={[styles.headerCounter, { backgroundColor: alpha(theme.colors.brand.primary, 0.1), borderColor: alpha(theme.colors.brand.primary, 0.25) }]}>
            <Text style={[styles.headerCounterText, { color: theme.colors.brand.primary }]}>{specialties.length}/{data.maxSpecialties}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: 4, paddingBottom: Math.max(insets.bottom + 40, 60) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.cyan} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(80)} style={[styles.hero, shadows.card, { backgroundColor: theme.colors.surface.card, borderColor: alpha(theme.colors.brand.primary, 0.24) }]}>
            <LinearGradient colors={[alpha(theme.colors.brand.primary, 0.18), alpha(theme.colors.brand.secondary, 0.1)]} style={StyleSheet.absoluteFillObject} />
            <View style={[styles.heroIcon, { backgroundColor: alpha(theme.colors.brand.primary, 0.12) }]}><Layers3 size={23} color={theme.colors.brand.primary} /></View>
            <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>{t('specialties.heroTitle')}</Text>
            <Text style={[styles.heroText, { color: theme.colors.text.muted }]}>{t('specialties.heroText', { fee: formatPKR(additionalCategoryMonthlyFee) })}</Text>
          </Animated.View>

          {loading ? (
            <View style={styles.loading}><ActivityIndicator color={colors.cyan} /><Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>{t('specialties.loadingText')}</Text></View>
          ) : (
            <>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t('specialties.mySpecialties')}</Text>
                {specialties.length < data.maxSpecialties && (
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.brand.primary }]} onPress={openAddCategory}>
                    <Plus size={15} color={theme.colors.button.primaryText} strokeWidth={3} />
                    <Text style={[styles.addButtonText, { color: theme.colors.button.primaryText }]}>{t('specialties.addCategory')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showPicker && (
                <Animated.View entering={FadeInDown.duration(220)} style={[styles.picker, { backgroundColor: theme.colors.surface.card, borderColor: alpha(theme.colors.brand.secondary, 0.35) }]}>
                  <View style={styles.pickerHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerTitle, { color: theme.colors.text.primary }]}>
                        {isCustomMode ? t('specialties.customCategoryTitle', 'Request New / Other Category') : t('specialties.requestNew')}
                      </Text>
                      <Text style={[styles.pickerText, { color: theme.colors.text.muted }]}>
                        {isCustomMode
                          ? t('specialties.customCategoryDesc', 'If your desired category or profession is not listed, enter details below so admin can review and add it.')
                          : t('specialties.pickerText')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        resetDraft();
                        setShowPicker(false);
                      }}
                      hitSlop={10}
                      style={styles.pickerCloseBtn}
                    >
                      <X size={18} color={theme.colors.text.muted} />
                    </TouchableOpacity>
                  </View>

                  {/* Standard Category Selection via Dropdown Trigger */}
                  {!isCustomMode ? (
                    <View style={{ marginTop: 4 }}>
                      <Text style={[styles.formLabel, { color: theme.colors.text.muted, marginTop: 4 }]}>
                        {t('specialties.selectCategoryLabel', 'SERVICE CATEGORY')}
                      </Text>

                      {/* Dropdown Selector Trigger */}
                      <TouchableOpacity
                        style={[
                          styles.dropdownTrigger,
                          {
                            borderColor: draftCategoryId ? theme.colors.brand.primary : theme.colors.border.subtle,
                            backgroundColor: theme.colors.input.background,
                          },
                        ]}
                        onPress={() => setIsDropdownOpen(true)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.dropdownTriggerContent}>
                          <Briefcase size={18} color={draftCategoryId ? theme.colors.brand.primary : theme.colors.text.muted} />
                          <Text
                            style={[
                              styles.dropdownTriggerText,
                              { color: draftCategory ? theme.colors.text.primary : theme.colors.input.placeholder },
                              draftCategory && { fontWeight: '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {draftCategory?.name || t('specialties.selectCategoryPlaceholder', 'Select category from list...')}
                          </Text>
                        </View>
                        <ChevronDown size={20} color={draftCategoryId ? theme.colors.brand.primary : theme.colors.text.muted} />
                      </TouchableOpacity>

                      {/* Suggest Other Category button */}
                      <TouchableOpacity
                        style={styles.switchModeBtn}
                        onPress={() => {
                          setIsCustomMode(true);
                          setDraftCategoryId('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Sparkles size={14} color={theme.colors.brand.primary} />
                        <Text style={[styles.switchModeText, { color: theme.colors.brand.primary }]}>
                          {t('specialties.cantFindCategory', "Can't find your category? Request other here")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Custom Category Mode */
                    <View style={styles.customCategorySection}>
                      <Text style={[styles.formLabel, { color: theme.colors.text.muted, marginTop: 4 }]}>
                        {t('specialties.customCategoryNameLabel', 'REQUESTED CATEGORY / PROFESSION')}
                      </Text>
                      <TextInput
                        style={[styles.input, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                        placeholder={t('specialties.customCategoryNamePlaceholder', 'e.g., Solar Technician, Welder, etc.')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        value={customCategoryName}
                        onChangeText={setCustomCategoryName}
                      />
                      <TouchableOpacity
                        style={styles.switchModeBtn}
                        onPress={() => {
                          setIsCustomMode(false);
                          setCustomCategoryName('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.switchBackText, { color: theme.colors.brand.primary }]}>
                          {t('specialties.chooseFromList', '← Choose from available list')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Shared Form Fields: Rate, Experience, Description, Certificates */}
                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
                      <Text style={[styles.formLabel, { color: theme.colors.text.muted }]}>{t('specialties.rateLabel')}</Text>
                      <TextInput
                        style={[styles.input, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                        placeholder={t('specialties.ratePlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        keyboardType="numeric"
                        value={draftRate}
                        onChangeText={setDraftRate}
                      />
                    </View>
                    <View style={styles.formHalf}>
                      <Text style={[styles.formLabel, { color: theme.colors.text.muted }]}>{t('specialties.experienceLabel')}</Text>
                      <TextInput
                        style={[styles.input, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                        placeholder={t('specialties.experiencePlaceholder')}
                        placeholderTextColor={theme.colors.input.placeholder}
                        keyboardType="numeric"
                        value={draftExperience}
                        onChangeText={setDraftExperience}
                      />
                    </View>
                  </View>

                  <Text style={[styles.formLabel, { color: theme.colors.text.muted }]}>{t('specialties.descriptionLabel')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                    placeholder={t('specialties.descriptionPlaceholder')}
                    placeholderTextColor={theme.colors.input.placeholder}
                    value={draftBio}
                    onChangeText={setDraftBio}
                    multiline
                  />

                  {/* Optional Certificates / Diplomas Section */}
                  <View style={[styles.certSection, { borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.surface.subtle }]}>
                    <View style={styles.certSectionHeader}>
                      <Award size={15} color={theme.colors.brand.primary} />
                      <Text style={[styles.certSectionTitle, { color: theme.colors.text.primary }]}>
                        {t('registerDetails.certificatesSection', 'CERTIFICATES / DIPLOMAS (OPTIONAL)')}
                      </Text>
                    </View>
                    <Text style={[styles.certSectionDesc, { color: theme.colors.text.muted }]}>
                      {t('specialties.certHint', 'Attach relevant trade certificates or diplomas so admin can review them with this specialty request.')}
                    </Text>

                    {draftCertificates.map((cert, idx) => (
                      <View
                        key={cert.id}
                        style={[styles.certItemCard, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]}
                      >
                        <View style={styles.certItemHeader}>
                          <Text style={[styles.certItemTitle, { color: theme.colors.text.primary }]}>
                            Certificate #{idx + 1}
                          </Text>
                          <TouchableOpacity onPress={() => removeCertificateSlot(cert.id)} hitSlop={8} style={styles.removeCertRow}>
                            <Trash2 size={14} color={colors.error} />
                            <Text style={[styles.removeCertLabel, { color: colors.error }]}>Remove</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={[styles.formLabel, { color: theme.colors.text.muted, marginTop: 6 }]}>
                          {t('registerDetails.certificateTitle', 'CERTIFICATE / DEGREE TITLE')}
                        </Text>
                        <TextInput
                          style={[styles.input, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                          placeholder={t('registerDetails.certificateTitlePlaceholder', 'e.g., DAE Electrical, HVAC Diploma')}
                          placeholderTextColor={theme.colors.input.placeholder}
                          value={cert.title}
                          onChangeText={(val) => updateCertificateField(cert.id, 'title', val)}
                        />

                        <Text style={[styles.formLabel, { color: theme.colors.text.muted, marginTop: 10 }]}>
                          {t('registerDetails.issuingOrg', 'INSTITUTE / ISSUING BOARD')}
                        </Text>
                        <TextInput
                          style={[styles.input, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                          placeholder={t('registerDetails.issuingOrgPlaceholder', 'e.g., TEVTA, Technical Board')}
                          placeholderTextColor={theme.colors.input.placeholder}
                          value={cert.issuingOrg}
                          onChangeText={(val) => updateCertificateField(cert.id, 'issuingOrg', val)}
                        />

                        <TouchableOpacity
                          style={[
                            styles.certImagePicker,
                            {
                              borderColor: cert.imageUri ? theme.colors.brand.primary : theme.colors.border.subtle,
                              backgroundColor: theme.colors.input.background,
                            },
                          ]}
                          onPress={() => pickCertificateImage(cert.id)}
                          activeOpacity={0.8}
                        >
                          {cert.imageUri ? (
                            <Image source={{ uri: cert.imageUri }} style={styles.certImagePreview} />
                          ) : (
                            <View style={styles.certImagePlaceholder}>
                              <Camera size={18} color={theme.colors.brand.primary} />
                              <Text style={[styles.certImagePlaceholderText, { color: theme.colors.brand.primary }]}>
                                {t('registerDetails.uploadCertImage', 'TAP TO UPLOAD CERTIFICATE')}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[styles.addCertBtn, { borderColor: alpha(theme.colors.brand.primary, 0.45), backgroundColor: alpha(theme.colors.brand.primary, 0.06) }]}
                      onPress={addCertificateSlot}
                      activeOpacity={0.75}
                    >
                      <Plus size={15} color={theme.colors.brand.primary} />
                      <Text style={[styles.addCertBtnText, { color: theme.colors.brand.primary }]}>
                        {t('registerDetails.addCertificate', '+ ADD CERTIFICATE / DIPLOMA')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!isCustomMode && (
                    <View style={[styles.feeBox, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
                      <Wallet size={14} color={colors.worker} />
                      <Text style={[styles.feeText, { color: theme.colors.text.muted }]}>
                        {t('specialties.monthlyFeeInfo', { fee: formatPKR(additionalCategoryMonthlyFee), balance: formatPKR(walletAvailableBalance) })}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    disabled={!!workingKey}
                    style={[styles.submitButton, { backgroundColor: theme.colors.brand.primary }]}
                    onPress={requestCategory}
                  >
                    {workingKey ? (
                      <ActivityIndicator size="small" color={theme.colors.button.primaryText} />
                    ) : (
                      <Plus size={15} color={theme.colors.button.primaryText} strokeWidth={3} />
                    )}
                    <Text style={[styles.submitButtonText, { color: theme.colors.button.primaryText }]}>
                      {isCustomMode
                        ? t('specialties.sendReviewBtn', 'Send for admin review')
                        : t('specialties.sendReviewBtn')}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {specialties.map((specialty, index) => {
                const color = statusColor(specialty, colors);
                const isPaid = specialty.priority > data.freeSpecialtyLimit;
                const specialtyFee = isPaid ? additionalCategoryMonthlyFee : 0;
                const canActivate = specialty.approvalStatus === 'approved'
                  && isPaid
                  && ['pending_activation', 'expired'].includes(specialty.subscriptionStatus);
                const showRenew = isPaid && ['active', 'payment_due'].includes(specialty.subscriptionStatus);
                const catNameLower = String(specialty.categoryId?.name || '').trim().toLowerCase();
                const matchedWorkerCerts = workerCertificates.filter((wc) => {
                  const wcCat = String(wc.categoryName || '').trim().toLowerCase();
                  if (wcCat && catNameLower) return wcCat === catNameLower;
                  if (!wcCat && specialty.priority === 1) return true;
                  return false;
                });
                const mergedCertMap = new Map<string, SpecialtyCertificate>();
                for (const certItem of [...(specialty.certificates || []), ...matchedWorkerCerts]) {
                  if (certItem?.certificateUrl) {
                    const prev = mergedCertMap.get(certItem.certificateUrl);
                    mergedCertMap.set(certItem.certificateUrl, {
                      title: certItem.title || prev?.title || 'Certificate',
                      issuingOrg: certItem.issuingOrg || prev?.issuingOrg || '',
                      certificateUrl: certItem.certificateUrl,
                      verificationStatus: certItem.verificationStatus || prev?.verificationStatus,
                    });
                  }
                }
                const specialtyCertificates = Array.from(mergedCertMap.values());

                const isPrimary = specialty.tier === 'primary' || specialty.priority === 1;
                const startDate = specialty.currentPeriodStart || specialty.approvedAt || specialty.requestedAt;
                const expireDate = specialty.currentPeriodEnd || specialty.nextBillingAt;

                let startLabel = t('specialties.startDateLabel', { defaultValue: 'STARTED' });
                let expireLabel = t('specialties.renewsOnLabel', { defaultValue: 'EXPIRES / RENEWS' });
                let startDateText = formatDate(startDate) || '—';
                let expireDateText = '';
                let expireColor = theme.colors.text.primary;

                if (isPrimary) {
                  startLabel = t('specialties.activeSinceLabel', { defaultValue: 'ACTIVE SINCE' });
                  expireLabel = t('specialties.expirationLabel', { defaultValue: 'EXPIRATION' });
                  expireDateText = t('specialties.includedFree', { defaultValue: 'Free forever' });
                  expireColor = colors.success;
                } else if (specialty.subscriptionStatus === 'pending_activation') {
                  startLabel = t('specialties.approvedLabel', { defaultValue: 'APPROVED' });
                  expireLabel = t('specialties.expirationLabel', { defaultValue: 'EXPIRATION' });
                  expireDateText = isRTL ? 'آن کرنے پر 30 دن' : '30 days upon activation';
                  expireColor = colors.yellow;
                } else if (specialty.subscriptionStatus === 'expired') {
                  startLabel = t('specialties.startDateLabel', { defaultValue: 'STARTED' });
                  expireLabel = t('specialties.expiresOnLabel', { defaultValue: 'EXPIRED ON' });
                  expireDateText = formatDate(expireDate) || (isRTL ? 'ختم شدہ' : 'Expired');
                  expireColor = colors.error;
                } else if (specialty.subscriptionStatus === 'payment_due') {
                  startLabel = t('specialties.startDateLabel', { defaultValue: 'STARTED' });
                  expireLabel = t('specialties.graceEndsLabel', { defaultValue: 'GRACE ENDS' });
                  expireDateText = formatDate(specialty.graceEndsAt || expireDate) || (isRTL ? 'فیس واجب الادا' : 'Payment due');
                  expireColor = colors.error;
                } else {
                  startLabel = t('specialties.startDateLabel', { defaultValue: 'STARTED' });
                  expireLabel = specialty.autoRenew
                    ? t('specialties.renewsOnLabel', { defaultValue: 'RENEWS ON' })
                    : t('specialties.expiresOnLabel', { defaultValue: 'EXPIRES ON' });
                  expireDateText = formatDate(expireDate) || '—';
                  expireColor = specialty.autoRenew ? colors.success : colors.yellow;
                }

                return (
                  <Animated.View key={specialty._id} entering={FadeInDown.delay(index * 60)} style={[styles.card, shadows.card, { backgroundColor: theme.colors.surface.card, borderColor: alpha(color, 0.28) }]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.priorityBadge, { backgroundColor: `${color}20`, borderColor: `${color}55` }]}>
                        <Text style={[styles.priorityText, { color }]}>#{specialty.priority}</Text>
                      </View>
                      <View style={styles.cardMain}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>{specialty.categoryId.name}</Text>
                        <Text style={[styles.tierText, { color: theme.colors.text.muted }]}>
                          {specialty.tier === 'primary' ? t('specialties.primaryTier') : t('specialties.additionalTier')}
                        </Text>
                      </View>
                      <View style={styles.orderButtons}>
                        <TouchableOpacity disabled={index === 0 || !!workingKey} style={styles.orderButton} onPress={() => move(index, -1)}><ArrowUp size={14} color={index === 0 ? colors.textDim : colors.textMuted} /></TouchableOpacity>
                        <TouchableOpacity disabled={index === specialties.length - 1 || !!workingKey} style={styles.orderButton} onPress={() => move(index, 1)}><ArrowDown size={14} color={index === specialties.length - 1 ? colors.textDim : colors.textMuted} /></TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <Text style={[styles.statusText, { color }]}>
                        {specialty.approvalStatus === 'pending'
                          ? t('specialties.waitingApproval')
                          : specialty.approvalStatus === 'rejected'
                            ? t('specialties.requestRejected')
                            : t(`specialties.${specialty.subscriptionStatus}`, { defaultValue: specialty.subscriptionStatus.replace(/_/g, ' ') })}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      {isPaid ? <Wallet size={13} color={colors.worker} /> : <ShieldCheck size={13} color={colors.success} />}
                      <Text style={[styles.metaText, { color: theme.colors.text.muted }]}>
                        {isPaid
                          ? t('specialties.feePerMonth', { fee: formatPKR(specialtyFee) })
                          : t('specialties.includedFree')}
                      </Text>
                    </View>

                    {/* Start & Expire Date Strip */}
                    <View style={[styles.dateStrip, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
                      <View style={styles.dateCol}>
                        <Text style={[styles.dateLabel, { color: theme.colors.text.muted }]}>{startLabel}</Text>
                        <Text style={[styles.dateValue, { color: theme.colors.text.primary }]}>{startDateText}</Text>
                      </View>
                      <View style={[styles.dateDivider, { backgroundColor: theme.colors.border.subtle }]} />
                      <View style={styles.dateCol}>
                        <Text style={[styles.dateLabel, { color: theme.colors.text.muted }]}>{expireLabel}</Text>
                        <Text style={[styles.dateValue, { color: expireColor }]}>{expireDateText}</Text>
                      </View>
                    </View>

                    <View style={[styles.profileBox, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
                      <View style={styles.profileStats}>
                        <Text style={[styles.profileStat, { color: theme.colors.text.primary }]}>
                          {t('specialties.ratePerHr', { rate: Number(specialty.hourlyRate || 0).toLocaleString('en-PK') })}
                        </Text>
                        <Text style={[styles.profileStat, { color: theme.colors.text.primary }]}>
                          {t('specialties.yearsExp', { count: Number(specialty.experience || 0) })}
                        </Text>
                      </View>
                      {(specialty.skills || []).length > 0 && (
                        <View style={styles.skillsWrap}>
                          {specialty.skills.slice(0, 5).map(skill => (
                            <Text key={skill} style={[styles.skillPill, { color: theme.colors.brand.primary, borderColor: alpha(theme.colors.brand.primary, 0.14), backgroundColor: alpha(theme.colors.brand.primary, 0.05) }]}>#{skill}</Text>
                          ))}
                        </View>
                      )}
                      {!!specialty.bio && <Text style={[styles.bioText, { color: theme.colors.text.muted }]} numberOfLines={2}>{specialty.bio}</Text>}
                      {specialtyCertificates.length > 0 && (
                        <View style={[styles.cardCertContainer, { borderTopColor: theme.colors.border.subtle }]}>
                          <View style={styles.cardCertHeader}>
                            <Award size={13} color={theme.colors.brand.primary} />
                            <Text style={[styles.cardCertHeaderLabel, { color: theme.colors.text.muted }]}>
                              {t('specialties.certificatesAttached', { count: specialtyCertificates.length, defaultValue: `${specialtyCertificates.length} certificate(s) attached` }).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.cardCertList}>
                            {specialtyCertificates.map((cert, certIdx) => (
                              <TouchableOpacity
                                key={`${cert.certificateUrl}-${certIdx}`}
                                style={[
                                  styles.cardCertItem,
                                  {
                                    backgroundColor: theme.colors.surface.card,
                                    borderColor: alpha(theme.colors.brand.primary, 0.22),
                                  },
                                ]}
                                activeOpacity={0.8}
                                onPress={() => setPreviewCert(cert)}
                              >
                                <Image
                                  source={{ uri: cert.certificateUrl }}
                                  style={[styles.cardCertThumb, { backgroundColor: theme.colors.input.background }]}
                                  resizeMode="cover"
                                />
                                <View style={styles.cardCertInfo}>
                                  <Text style={[styles.cardCertTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                                    {cert.title}
                                  </Text>
                                  {!!cert.issuingOrg && (
                                    <Text style={[styles.cardCertSub, { color: theme.colors.text.muted }]} numberOfLines={1}>
                                      {cert.issuingOrg}
                                    </Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardActions}>
                      {canActivate && (
                        <TouchableOpacity disabled={!!workingKey} style={[styles.activateButton, { backgroundColor: theme.colors.brand.primary }]} onPress={() => activate(specialty)}>
                          {workingKey === `activate-${specialty._id}` ? <ActivityIndicator size="small" color={theme.colors.button.primaryText} /> : <Wallet size={15} color={theme.colors.button.primaryText} />}
                          <Text style={[styles.activateText, { color: theme.colors.button.primaryText }]}>
                            {specialty.subscriptionStatus === 'expired'
                              ? t('specialties.reactivatePay')
                              : t('specialties.activatePay')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {showRenew && (
                        <View style={styles.renewWrap}>
                          <Text style={[styles.renewLabel, { color: theme.colors.text.muted }]}>{t('specialties.autoRenew')}</Text>
                          <Switch
                            value={specialty.autoRenew}
                            disabled={!!workingKey}
                            onValueChange={(autoRenew) => {
                              void runAction(
                                `renew-${specialty._id}`,
                                () => api.patch(`/workers/specialties/${specialty.categoryId._id}/auto-renew`, { autoRenew }),
                                autoRenew
                                  ? t('specialties.renewalEnabledDesc', { defaultValue: 'Automatic renewal is enabled.' })
                                  : t('specialties.renewalDisabledDesc', { defaultValue: 'Automatic renewal is disabled.' })
                              );
                            }}
                            trackColor={{ false: theme.colors.surface.subtle, true: alpha(theme.colors.status.success, 0.6) }}
                            thumbColor={specialty.autoRenew ? colors.success : theme.colors.text.muted}
                          />
                        </View>
                      )}
                      {specialty.priority > 1 && (
                        <TouchableOpacity style={[styles.removeButton, { backgroundColor: alpha(theme.colors.status.error, 0.12) }]} disabled={!!workingKey} onPress={() => remove(specialty)}>
                          <Trash2 size={15} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Animated.View>
                );
              })}

              {(data.pendingCustomRequests || []).map((req, reqIdx) => {
                const isPending = req.status === 'pending';
                const badgeBg = isPending ? `${colors.yellow}20` : `${colors.error}20`;
                const badgeBorder = isPending ? `${colors.yellow}55` : `${colors.error}55`;
                const badgeColor = isPending ? colors.yellow : colors.error;
                return (
                  <Animated.View
                    key={req._id || `custom-req-${reqIdx}`}
                    entering={FadeInDown.delay(reqIdx * 60)}
                    style={[
                      styles.card,
                      shadows.card,
                      {
                        backgroundColor: theme.colors.surface.card,
                        borderColor: isPending ? alpha(colors.yellow, 0.45) : alpha(colors.error, 0.45),
                        borderStyle: 'dashed',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: 8, backgroundColor: badgeBg, borderWidth: 1, borderColor: badgeBorder }}>
                        <Sparkles size={12} color={badgeColor} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: badgeColor, letterSpacing: 0.5 }}>
                          {isPending ? 'SUGGESTED TRADE' : 'TRADE NOT ADDED'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: badgeBg }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: badgeColor }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: badgeColor }}>
                            {isPending ? 'Under Review' : 'Rejected'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.removeButton, { backgroundColor: alpha(theme.colors.status.error, 0.12) }]}
                          disabled={!!workingKey}
                          onPress={() => removeCustomRequest(req)}
                        >
                          <Trash2 size={14} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 2 }}>
                        {req.professionName}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.text.muted }}>
                        {isPending ? 'Submitted for platform addition' : 'Admin review completed'}
                      </Text>
                    </View>

                    <View style={[styles.profileBox, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]}>
                      <View style={styles.profileStats}>
                        <Text style={[styles.profileStat, { color: theme.colors.text.primary }]}>
                          Rs. {Number(req.hourlyRate || 0).toLocaleString('en-PK')}/hr
                        </Text>
                        <Text style={[styles.profileStat, { color: theme.colors.text.muted }]}> • </Text>
                        <Text style={[styles.profileStat, { color: theme.colors.text.primary }]}>
                          {req.experience} yrs exp
                        </Text>
                      </View>
                      {(req.certificates || []).length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                          <Award size={12} color={theme.colors.brand.primary} />
                          <Text style={{ fontSize: 11, color: theme.colors.text.muted }}>
                            {(req.certificates || []).length} certificate(s) submitted
                          </Text>
                        </View>
                      )}
                      {!!req.description && (
                        <Text style={[styles.bioText, { color: theme.colors.text.muted, marginTop: 6 }]} numberOfLines={2}>
                          {req.description}
                        </Text>
                      )}
                    </View>

                    {req.status === 'rejected' && !!req.rejectionReason && (
                      <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: alpha(colors.error, 0.1) }}>
                        <Text style={{ fontSize: 12, color: colors.error }}>
                          Reason: {req.rejectionReason}
                        </Text>
                      </View>
                    )}

                    {isPending && (
                      <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: alpha(colors.yellow, 0.08) }}>
                        <Text style={{ fontSize: 11, color: theme.colors.text.muted }}>
                          ℹ️ Our team is reviewing your requested trade. Once approved, it will be added to the platform services.
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <BeautifulModal
        visible={rechargePromptVisible}
        onClose={() => setRechargePromptVisible(false)}
        title={t('specialties.rechargeNeeded')}
        height={470}
        glowColor={colors.worker}
        icon={<Wallet size={32} color={colors.worker} strokeWidth={2.4} />}
      >
        <View style={styles.rechargeModalBody}>
          <View style={[styles.rechargeIconRing, { backgroundColor: alpha(colors.worker, 0.12), borderColor: alpha(colors.worker, 0.35) }]}>
            <AlertTriangle size={22} color={colors.worker} strokeWidth={2.4} />
          </View>
          <Text style={[styles.rechargeTitle, { color: theme.colors.text.primary }]}>{t('specialties.addBalancePrompt')}</Text>
          <Text style={[styles.rechargeMessage, { color: theme.colors.text.muted }]}>
            {t('specialties.rechargeMessage', { action: rechargeActionLabel, fee: formatPKR(additionalCategoryMonthlyFee) })}
          </Text>

          <View style={[styles.walletSummaryCard, { backgroundColor: alpha(colors.worker, 0.08), borderColor: alpha(colors.worker, 0.24) }]}>
            <View style={styles.walletSummaryRow}>
              <Text style={[styles.walletSummaryLabel, { color: theme.colors.text.muted }]}>{t('specialties.requiredBalance')}</Text>
              <Text style={[styles.walletSummaryValue, { color: theme.colors.text.primary }]}>{formatPKR(additionalCategoryMonthlyFee)}</Text>
            </View>
            <View style={[styles.walletSummaryDivider, { backgroundColor: alpha(colors.worker, 0.2) }]} />
            <View style={styles.walletSummaryRow}>
              <Text style={[styles.walletSummaryLabel, { color: theme.colors.text.muted }]}>{t('specialties.availableBalance')}</Text>
              <Text style={[styles.walletSummaryValue, { color: theme.colors.text.primary }]}>{formatPKR(walletAvailableBalance)}</Text>
            </View>
            <View style={[styles.walletSummaryDivider, { backgroundColor: alpha(colors.worker, 0.2) }]} />
            <View style={styles.walletSummaryRow}>
              <Text style={[styles.walletSummaryLabel, { color: theme.colors.text.muted }]}>{t('specialties.needRecharge')}</Text>
              <Text style={[styles.walletSummaryValue, styles.shortfallText, { color: colors.worker }]}>{formatPKR(walletShortfall)}</Text>
            </View>
          </View>

          <View style={styles.rechargeActions}>
            <TouchableOpacity style={[styles.rechargeSecondaryButton, { backgroundColor: theme.colors.surface.subtle, borderWidth: 1, borderColor: theme.colors.border.subtle }]} onPress={() => setRechargePromptVisible(false)}>
              <Text style={[styles.rechargeSecondaryText, { color: theme.colors.text.muted }]}>{t('specialties.maybeLater')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rechargePrimaryButton}
              onPress={() => {
                setRechargePromptVisible(false);
                router.push('/(tabs)/wallet' as any);
              }}
            >
              <LinearGradient colors={theme.colors.button.workerBackground} style={styles.rechargePrimaryGradient}>
                <Wallet size={16} color={theme.colors.button.primaryText} strokeWidth={2.6} />
                <Text style={[styles.rechargePrimaryText, { color: theme.colors.button.primaryText }]}>{t('specialties.rechargeWallet')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BeautifulModal>

      {/* Category Dropdown Modal */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                {t('specialties.selectCategoryModalTitle', 'Select Category')}
              </Text>
              <TouchableOpacity onPress={() => setIsDropdownOpen(false)} hitSlop={12}>
                <X size={22} color={theme.colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.modalSearchWrapper, { backgroundColor: theme.colors.input.background, borderColor: theme.colors.border.subtle }]}>
              <Search size={18} color={theme.colors.text.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.modalSearchInput, { color: theme.colors.input.text }]}
                placeholder={t('specialties.searchCategoryPlaceholder', 'Search category...')}
                placeholderTextColor={theme.colors.input.placeholder}
                value={searchCategoryText}
                onChangeText={setSearchCategoryText}
                autoCapitalize="none"
              />
              {searchCategoryText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchCategoryText('')} hitSlop={8}>
                  <X size={16} color={theme.colors.text.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Categories List */}
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {filteredAvailableCategories.length > 0 ? (
                filteredAvailableCategories.map((item) => {
                  const isSelected = draftCategoryId === item._id;
                  const itemColor = item.color || colors.cyan;
                  return (
                    <TouchableOpacity
                      key={item._id}
                      style={[
                        styles.categoryItem,
                        isSelected && { backgroundColor: alpha(theme.colors.brand.primary, 0.12) },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDraftCategoryId(item._id);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <View style={styles.categoryItemLeft}>
                        <View style={[styles.categoryIconCircle, { backgroundColor: alpha(itemColor, 0.15) }]}>
                          <Briefcase size={17} color={itemColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.categoryItemName, { color: theme.colors.text.primary }, isSelected && { color: theme.colors.brand.primary, fontWeight: '800' }]}>
                            {item.name}
                          </Text>
                          {item.description ? (
                            <Text style={[styles.categoryItemDesc, { color: theme.colors.text.muted }]} numberOfLines={1}>
                              {item.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {isSelected && <CheckCircle size={18} color={theme.colors.brand.primary} />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyList}>
                  <Text style={[styles.emptyListText, { color: theme.colors.text.muted }]}>
                    {t('specialties.noMatchingCategory', 'No matching category found')}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Request Other Category button in Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border.subtle }]}>
              <TouchableOpacity
                style={[styles.modalRequestBtn, { borderColor: theme.colors.brand.primary, backgroundColor: alpha(theme.colors.brand.primary, 0.08) }]}
                onPress={() => {
                  setIsDropdownOpen(false);
                  setIsCustomMode(true);
                  setDraftCategoryId('');
                }}
              >
                <Sparkles size={16} color={theme.colors.brand.primary} />
                <Text style={[styles.modalRequestBtnText, { color: theme.colors.brand.primary }]}>
                  {t('specialties.cantFindCategory', "Can't find your category? Request other here")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Certificate Preview Modal */}
      <Modal
        visible={!!previewCert}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewCert(null)}
      >
        <View style={styles.certModalOverlay}>
          <View style={[styles.certModalCard, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle }]}>
            <View style={styles.certModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.certModalTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {previewCert?.title || 'Certificate'}
                </Text>
                {!!previewCert?.issuingOrg && (
                  <Text style={[styles.certModalSub, { color: theme.colors.text.muted }]} numberOfLines={1}>
                    {previewCert.issuingOrg}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPreviewCert(null)} hitSlop={10} style={styles.pickerCloseBtn}>
                <X size={20} color={theme.colors.text.muted} />
              </TouchableOpacity>
            </View>
            {previewCert?.certificateUrl ? (
              <Image
                source={{ uri: previewCert.certificateUrl }}
                style={[styles.certModalImage, { backgroundColor: theme.colors.input.background }]}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmModal.visible}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmColor={confirmModal.confirmColor}
        isLoading={confirmModal.isLoading}
      />

      <AlertModal
        visible={alertModal.visible}
        onDismiss={alertModal.onDismiss}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText={alertModal.buttonText}
      />
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.l, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerCounter: { minWidth: 40, height: 30, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerCounterText: { fontSize: 12, fontWeight: '900' },
  hero: { overflow: 'hidden', borderRadius: BorderRadius.xl, borderWidth: 1, padding: 18, marginBottom: 24 },
  heroIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '900' },
  heroText: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  loading: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  loadingText: { fontSize: 13 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 },
  addButtonText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  picker: { borderRadius: 18, borderWidth: 1, padding: 15, marginBottom: 14 },
  pickerHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  pickerCloseBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontSize: 16, fontWeight: '900' },
  pickerText: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 2,
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  dropdownTriggerText: {
    fontSize: 13,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customCategorySection: {
    marginTop: 2,
  },
  customModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  switchBackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '75%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
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
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
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
    marginRight: 8,
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
    fontWeight: '600',
  },
  categoryItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyList: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
  },
  modalFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  modalRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  modalRequestBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 14, marginBottom: 7 },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, fontWeight: '700' },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  certSection: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  certSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  certSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  certSectionDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  certItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
    marginBottom: 10,
  },
  certItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  certItemTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  removeCertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeCertLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  certImagePicker: {
    height: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  certImagePreview: {
    width: '100%',
    height: '100%',
  },
  certImagePlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  certImagePlaceholderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  addCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  addCertBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardCertContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cardCertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  cardCertHeaderLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardCertList: {
    gap: 7,
  },
  cardCertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    padding: 7,
    gap: 10,
  },
  cardCertThumb: {
    width: 46,
    height: 34,
    borderRadius: 7,
  },
  cardCertInfo: {
    flex: 1,
  },
  cardCertTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardCertSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  certModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  certModalCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  certModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  certModalTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  certModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  certModalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
  },
  feeBox: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 13 },
  feeText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, paddingVertical: 12, marginTop: 13 },
  submitButtonText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  emptyText: { fontSize: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 15, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priorityBadge: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  priorityText: { fontSize: 13, fontWeight: '900' },
  cardMain: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  tierText: { fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  orderButtons: { flexDirection: 'row', gap: 6 },
  orderButton: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaText: { fontSize: 11, fontWeight: '700', marginRight: 4 },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  dateCol: {
    flex: 1,
  },
  dateDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 10,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  profileBox: { borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 12 },
  profileStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileStat: { fontSize: 12, fontWeight: '900' },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  skillPill: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  bioText: { fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 9 },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 13 },
  activateButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
  activateText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  renewWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  renewLabel: { fontSize: 11, fontWeight: '700' },
  removeButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rechargeModalBody: { alignItems: 'center', width: '100%', gap: 12 },
  rechargeIconRing: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
  },
  rechargeTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  rechargeMessage: { fontSize: 13, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  walletSummaryCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  walletSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  walletSummaryLabel: { flex: 1, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  walletSummaryValue: { fontSize: 13, fontWeight: '900' },
  shortfallText: { color: '#EA580C' },
  walletSummaryDivider: { height: 1, marginVertical: 10 },
  rechargeActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  rechargeSecondaryButton: {
    flex: 0.85,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rechargeSecondaryText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  rechargePrimaryButton: { flex: 1.15, minHeight: 46, borderRadius: 14, overflow: 'hidden' },
  rechargePrimaryGradient: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  rechargePrimaryText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
});

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ChevronLeft,
  Clock3,
  Layers3,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { BackgroundWrapper } from '../../components/common/BackgroundWrapper';
import { BeautifulModal } from '../../components/ui';
import { alpha, BorderRadius, Colors, Spacing, useTheme, useThemeColors, useThemeShadows } from '../../constants/Theme';
import api from '../../services/api';

type Category = {
  _id: string;
  name: string;
  color?: string;
  description?: string;
  additionalCategoryMonthlyFee?: number;
  additionalCategoryGraceDays?: number;
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
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionStatus: 'free' | 'pending_activation' | 'active' | 'payment_due' | 'expired';
  monthlyFeeSnapshot: number;
  autoRenew: boolean;
  nextBillingAt?: string | null;
  graceEndsAt?: string | null;
};

type SpecialtyResponse = {
  specialties: Specialty[];
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
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};

const getErrorMessage = (error: any) => error?.response?.data?.message || error?.message || 'Please try again.';
const formatPKR = (value: number) => `Rs. ${Math.max(0, Number(value || 0)).toLocaleString('en-PK')}`;
const isWalletBalanceError = (error: any) => error?.response?.status === 402 || error?.response?.data?.requiredBalance !== undefined;

export default function SpecialtiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [data, setData] = useState<SpecialtyResponse>({ specialties: [], maxSpecialties: 5, freeSpecialtyLimit: 1, additionalCategoryMonthlyFee: 500 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [walletAvailableBalance, setWalletAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingKey, setWorkingKey] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [rechargePromptVisible, setRechargePromptVisible] = useState(false);
  const [rechargeActionLabel, setRechargeActionLabel] = useState('request another category');
  const [draftCategoryId, setDraftCategoryId] = useState('');
  const [draftSkills, setDraftSkills] = useState('');
  const [draftRate, setDraftRate] = useState('');
  const [draftExperience, setDraftExperience] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const theme = useTheme();
  const colors = useThemeColors();
  const shadows = useThemeShadows();

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [specialtyResponse, categoryResponse, walletResponse] = await Promise.all([
        api.get('/workers/specialties'),
        api.get('/users/categories'),
        api.get('/wallet/my-wallet'),
      ]);
      const specialtyData = specialtyResponse.data.data || {};
      const walletData: WalletSnapshot = walletResponse.data.data || {};
      setData({
        specialties: specialtyData.specialties || [],
        maxSpecialties: specialtyData.maxSpecialties || 5,
        freeSpecialtyLimit: specialtyData.freeSpecialtyLimit || 1,
        additionalCategoryMonthlyFee: Number(specialtyData.additionalCategoryMonthlyFee ?? walletData.additionalCategoryMonthlyFee ?? 500),
      });
      setCategories(categoryResponse.data.data || []);
      setWalletAvailableBalance(Math.max(0, Number(walletData.availableBalance ?? walletData.balance ?? 0)));
    } catch (error) {
      Alert.alert(t('specialties.loadError'), getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const specialties = useMemo(
    () => [...data.specialties].sort((left, right) => left.priority - right.priority),
    [data.specialties]
  );
  const selectedIds = useMemo(() => new Set(specialties.map(item => item.categoryId._id)), [specialties]);
  const availableCategories = categories.filter(category => !selectedIds.has(category._id));
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
      Alert.alert(t('specialties.done'), successMessage);
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
      Alert.alert(t('specialties.unableContinue'), getErrorMessage(actionError));
      return false;
    } finally {
      setWorkingKey('');
    }
  };

  const resetDraft = () => {
    setDraftCategoryId('');
    setDraftSkills('');
    setDraftRate('');
    setDraftExperience('');
    setDraftBio('');
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

  const requestCategory = () => {
    const skills = draftSkills.split(',').map(skill => skill.trim()).filter(Boolean);
    const hourlyRate = Number(draftRate);
    const experience = Number(draftExperience);
    if (!draftCategoryId || skills.length === 0 || !draftBio.trim() || !Number.isFinite(hourlyRate) || hourlyRate < 100 || !Number.isFinite(experience) || experience < 0) {
      Alert.alert(t('specialties.completeDetails'), t('specialties.completeDetailsDesc'));
      return;
    }
    if (!isWalletReadyForAdditionalCategory()) {
      showRechargePrompt();
      return;
    }

    runAction(
      'request-category',
      () => api.post('/workers/specialties/requests', {
        categoryId: draftCategoryId,
        skills,
        hourlyRate,
        experience,
        bio: draftBio.trim(),
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
    Alert.alert(
      t('specialties.activateConfirmTitle'),
      t('specialties.activateConfirmDesc', { fee: formatPKR(fee) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('specialties.activatePayBtn', { defaultValue: 'Activate & Pay' }),
          onPress: () => runAction(
            `activate-${specialty._id}`,
            () => api.patch(`/workers/specialties/${specialty.categoryId._id}/activate`),
            t('specialties.activatedDesc', { defaultValue: 'Your specialty is active and can receive matching jobs.' })
          ),
        },
      ]
    );
  };

  const move = (index: number, offset: number) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= specialties.length) return;
    const next = [...specialties];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    runAction(
      'reorder',
      () => api.patch('/workers/specialties/priorities', { categoryIds: next.map(item => item.categoryId._id) }),
      t('specialties.priorityUpdatedDesc')
    );
  };

  const remove = (specialty: Specialty) => Alert.alert(
    t('specialties.removeConfirmTitle'),
    t('specialties.removeConfirmDesc', { category: specialty.categoryId.name }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove', { defaultValue: 'Remove' }),
        style: 'destructive',
        onPress: () => runAction(
          `remove-${specialty._id}`,
          () => api.delete(`/workers/specialties/${specialty.categoryId._id}`),
          t('specialties.removedDesc')
        ),
      },
]
  );

  return (
    <BackgroundWrapper>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
      <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.surface.subtle, borderColor: theme.colors.border.subtle }]} onPress={() => router.back()}>
        <ChevronLeft size={22} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>{t('specialties.title')}</Text>
      <View style={[styles.headerCounter, { backgroundColor: alpha(theme.colors.brand.primary, 0.1), borderColor: alpha(theme.colors.brand.primary, 0.25) }]}><Text style={[styles.headerCounterText, { color: theme.colors.brand.primary }]}>{specialties.length}/{data.maxSpecialties}</Text></View>
    </View>

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
          <Text style={styles.sectionTitle}>{t('specialties.mySpecialties')}</Text>
          {specialties.length < data.maxSpecialties && (
            <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.brand.primary }]} onPress={openAddCategory}>
              <Plus size={15} color={theme.colors.button.primaryText} strokeWidth={3} />
              <Text style={[styles.addButtonText, { color: theme.colors.button.primaryText }]}>{t('specialties.addCategory')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {showPicker && (
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.picker, { backgroundColor: theme.colors.surface.card, borderColor: alpha(theme.colors.brand.secondary, 0.35) }]}>
            <Text style={[styles.pickerTitle, { color: theme.colors.text.primary }]}>{t('specialties.requestNew')}</Text>
            <Text style={[styles.pickerText, { color: theme.colors.text.muted }]}>{t('specialties.pickerText')}</Text>
            <View style={styles.categoryChips}>
              {availableCategories.map(category => (
                <TouchableOpacity
                  key={category._id}
                  style={[
                    styles.categoryChip,
                    { borderColor: `${category.color || colors.cyan}55` },
                    draftCategoryId === category._id && { backgroundColor: `${category.color || colors.cyan}22`, borderColor: category.color || colors.cyan }
                  ]}
                  disabled={!!workingKey}
                  onPress={() => setDraftCategoryId(category._id)}
                >
                  <Plus size={13} color={category.color || colors.cyan} />
                  <Text style={styles.categoryChipText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
              {availableCategories.length === 0 && <Text style={[styles.emptyText, { color: theme.colors.text.muted }]}>{t('specialties.noMoreCategories')}</Text>}
            </View>
            {availableCategories.length > 0 && (
              <>
                <Text style={[styles.formLabel, { color: theme.colors.text.muted }]}>{t('specialties.skillsLabel')}</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.input.text, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.input.background }]}
                  placeholder={t('specialties.skillsPlaceholder')}
                  placeholderTextColor={theme.colors.input.placeholder}
                  value={draftSkills}
                  onChangeText={setDraftSkills}
                />
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
                  style={[styles.input, styles.textArea]}
                  placeholder={t('specialties.descriptionPlaceholder')}
                  placeholderTextColor={theme.colors.input.placeholder}
                  value={draftBio}
                  onChangeText={setDraftBio}
                  multiline
                />
                <View style={styles.feeBox}>
                  <Wallet size={14} color={colors.worker} />
                  <Text style={[styles.feeText, { color: theme.colors.text.muted }]}>
                    {draftCategory
                      ? t('specialties.monthlyFeeInfo', { fee: formatPKR(additionalCategoryMonthlyFee), balance: formatPKR(walletAvailableBalance) })
                      : t('specialties.selectCategoryInfo', { fee: formatPKR(additionalCategoryMonthlyFee) })}
                  </Text>
                </View>
                <TouchableOpacity disabled={!!workingKey} style={[styles.submitButton, { backgroundColor: theme.colors.brand.primary }]} onPress={requestCategory}>
                  {workingKey === 'request-category' ? <ActivityIndicator size="small" color={theme.colors.button.primaryText} /> : <Plus size={15} color={theme.colors.button.primaryText} strokeWidth={3} />}
                  <Text style={[styles.submitButtonText, { color: theme.colors.button.primaryText }]}>{t('specialties.sendReviewBtn')}</Text>
                </TouchableOpacity>
              </>
            )}
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
                {specialty.nextBillingAt ? (
                  <>
                    <Clock3 size={13} color={theme.colors.text.muted} />
                    <Text style={[styles.metaText, { color: theme.colors.text.muted }]}>
                      {t('specialties.renewsOn', { date: formatDate(specialty.nextBillingAt) })}
                    </Text>
                  </>
                ) : null}
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
      </>
    )}
  </ScrollView>

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
        <View style={styles.walletSummaryDivider} />
        <View style={styles.walletSummaryRow}>
          <Text style={[styles.walletSummaryLabel, { color: theme.colors.text.muted }]}>{t('specialties.availableBalance')}</Text>
          <Text style={[styles.walletSummaryValue, { color: theme.colors.text.primary }]}>{formatPKR(walletAvailableBalance)}</Text>
        </View>
        <View style={styles.walletSummaryDivider} />
        <View style={styles.walletSummaryRow}>
          <Text style={[styles.walletSummaryLabel, { color: theme.colors.text.muted }]}>{t('specialties.needRecharge')}</Text>
          <Text style={[styles.walletSummaryValue, styles.shortfallText, { color: colors.worker }]}>{formatPKR(walletShortfall)}</Text>
        </View>
      </View>

      <View style={styles.rechargeActions}>
        <TouchableOpacity style={styles.rechargeSecondaryButton} onPress={() => setRechargePromptVisible(false)}>
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
  </BackgroundWrapper>
);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.l, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18 },
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
  pickerTitle: { fontSize: 15, fontWeight: '900' },
  pickerText: { fontSize: 12, marginTop: 3, marginBottom: 12 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  categoryChipText: { fontSize: 12, fontWeight: '700' },
  formLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 14, marginBottom: 7 },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, fontWeight: '700' },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
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
  shortfallText: { color: Colors.worker },
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

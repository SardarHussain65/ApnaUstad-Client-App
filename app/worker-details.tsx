import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  Award,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MessageSquare,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  Zap,
  Heart,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { BackgroundWrapper } from '../components/common/BackgroundWrapper';
import { useBookingDetails, useWorker, useWorkerReviews, useToggleFavoriteMutation } from '../hooks';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { alpha, useTheme, useThemeColors } from '../constants/Theme';

const C = {
  cyan: '#00F5FF',
  blue: '#087BFF',
  green: '#00E887',
  amber: '#FFB000',
  pink: '#FF4D8D',
  text: '#FFFFFF',
  muted: '#A8B0C2',
  dim: '#6E778C',
  surface: 'rgba(5, 11, 31, 0.88)',
  border: 'rgba(255,255,255,0.09)',
};

const firstParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'AU';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

const formatDate = (value?: string, locale: string = 'en') => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return locale === 'ur' ? 'حالیہ' : 'Recent';
  return date.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function WorkerDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = theme.colors;
  const legacyColors = theme.legacy;
  
  const params = useLocalSearchParams<{
    id?: string | string[];
    bidId?: string | string[];
    jobId?: string | string[];
    bookingId?: string | string[];
    category?: string | string[];
  }>();
  const workerId = firstParam(params.id);
  const bidId = firstParam(params.bidId);
  const jobId = firstParam(params.jobId);
  const bookingId = firstParam(params.bookingId);
  const selectedCategory = firstParam(params.category);
  const [isAccepting, setIsAccepting] = useState(false);

  const { data: worker, isLoading } = useWorker(workerId, selectedCategory);
  const { data: reviews = [], isLoading: isLoadingReviews } = useWorkerReviews(workerId);
  const { data: contextBooking } = useBookingDetails(bookingId);

  const { user, role, updateUser } = useAuth();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const [isToggling, setIsToggling] = useState(false);

  const isFavorite = user?.favorites?.includes(workerId as any);

  const handleToggleFavorite = async () => {
    if (!user?._id || isToggling) return;
    setIsToggling(true);
    try {
      const result = await toggleFavoriteMutation.mutateAsync({
        userId: user._id,
        workerId: workerId!,
      });
      await updateUser({
        ...user,
        favorites: result.favorites,
      });
      Toast.show({
        type: 'success',
        text1: result.isFavorite ? t('workerDetails.favoriteAdded') : t('workerDetails.favoriteRemoved'),
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.message || t('common.tryAgain'));
    } finally {
      setIsToggling(false);
    }
  };

  const rating = Number(worker?.rating || 0);
  const reviewCount = Number(worker?.totalReviews || reviews.length || 0);
  const completedJobs = Number(worker?.totalJobs || 0);
  const experience = Number(worker?.experience || 0);
  const hourlyRate = Number(worker?.hourlyRate || 0);
  const skills = Array.isArray(worker?.skills) ? worker.skills : [];
  const isAvailable = worker?.isAvailable !== false;
  const hasBid = Boolean(bidId && jobId);
  const hasBooking = Boolean(bookingId);
  const isCommunicationLocked = hasBooking
    && (!contextBooking || contextBooking.status === 'completed' || contextBooking.status === 'cancelled');
  const hasActiveBooking = hasBooking && !isCommunicationLocked;
  const bookingWorker = typeof contextBooking?.worker === 'object' ? contextBooking.worker : null;
  const workerPhone = hasActiveBooking && bookingWorker?._id === workerId ? bookingWorker?.phone : '';
  const primaryLabel = hasBid ? t('workerDetails.selectUstad') : t('workerDetails.requestService');

  const shareProfile = async () => {
    const defaultName = t('workerDetails.defaultSpecialist', { defaultValue: 'ApnaUstad specialist' });
    const defaultCategory = t('workerDetails.defaultCategory', { defaultValue: 'Service specialist' });
    const cityInfo = worker?.city ? t('workerDetails.shareCity', { city: worker.city }) : '';
    await Share.share({
      message: t('workerDetails.shareMessage', {
        name: worker?.fullName || defaultName,
        category: worker?.category || defaultCategory,
        cityInfo,
      }),
    });
  };

  const callWorker = async () => {
    if (!workerPhone) {
      Alert.alert(t('workerDetails.phoneUnavailable'), t('workerDetails.phoneUnavailableDesc'));
      return;
    }
    await Linking.openURL(`tel:${workerPhone}`);
  };

  const openChat = () => {
    if (!hasActiveBooking || !bookingId || !workerId) return;
    router.push({
      pathname: '/chat',
      params: { bookingId, recipientId: workerId, recipientName: worker?.fullName || 'Ustad' },
    });
  };

  const acceptProposal = async () => {
    if (!jobId || !bidId) return;
    setIsAccepting(true);
    try {
      const response = await api.post(`/jobs/${jobId}/bids/${bidId}/accept`);
      router.replace({ pathname: '/transaction-details', params: { id: response.data.data._id } });
    } catch (error: any) {
      Alert.alert(t('workerDetails.unableSelect'), error?.response?.data?.message || t('workerDetails.acceptError'));
    } finally {
      setIsAccepting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (hasBid) {
      acceptProposal();
      return;
    }
    router.push({
      pathname: '/job-creation',
      params: {
        title: worker?.category,
        targetWorkerId: worker?._id,
        targetWorkerName: worker?.fullName,
      },
    });
  };

  if (isLoading) {
    return (
      <BackgroundWrapper>
        <View style={styles.center}>
          <ActivityIndicator color={legacyColors.cyan} />
          <Text style={[styles.loadingText, { color: colors.text.muted }]}>{t('workerDetails.loading')}</Text>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!worker) {
    return (
      <BackgroundWrapper>
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('workerDetails.unavailable')}</Text>
          <TouchableOpacity 
            style={[
              styles.emptyAction,
              { backgroundColor: theme.isDark ? 'rgba(0,245,255,0.12)' : alpha(legacyColors.cyan, 0.12) }
            ]} 
            onPress={() => router.back()}
          >
            <Text style={[styles.emptyActionText, { color: legacyColors.cyan }]}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <View style={styles.root}>
        <View style={[
          styles.header, 
          { 
            paddingTop: insets.top + 8,
            backgroundColor: theme.isDark ? 'rgba(5,5,16,0.74)' : colors.background.screen,
            borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle,
          }
        ]}>
          <TouchableOpacity 
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.055)' : alpha(colors.text.primary, 0.03),
                borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : colors.border.subtle,
              }
            ]} 
            onPress={() => router.back()} 
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={colors.text.primary} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerEyebrow, { color: colors.text.dim }]}>{t('workerDetails.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('workerDetails.headerTitle')}</Text>
          </View>
          <View style={styles.headerActions}>
            {role === 'client' && (
              <TouchableOpacity 
                style={[
                  styles.headerButton, 
                  { 
                    marginRight: 8,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.055)' : alpha(colors.text.primary, 0.03),
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : colors.border.subtle,
                  }
                ]} 
                onPress={handleToggleFavorite} 
                activeOpacity={0.8} 
                disabled={isToggling}
              >
                <Heart size={18} color={isFavorite ? legacyColors.pink : colors.text.dim} fill={isFavorite ? legacyColors.pink : 'transparent'} strokeWidth={2.3} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[
                styles.headerButton,
                {
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.055)' : alpha(colors.text.primary, 0.03),
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.09)' : colors.border.subtle,
                }
              ]} 
              onPress={shareProfile} 
              activeOpacity={0.8}
            >
              <Share2 size={18} color={colors.text.muted} strokeWidth={2.3} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 108 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(520)} style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface.card,
              borderColor: theme.isDark ? 'rgba(0,245,255,0.18)' : colors.border.subtle,
            }
          ]}>
            <LinearGradient
              colors={theme.isDark 
                ? ['rgba(0,245,255,0.16)', 'rgba(5,11,31,0.92)', 'rgba(8,123,255,0.08)']
                : [alpha(colors.brand.primary, 0.06), colors.surface.card, alpha(colors.brand.secondary, 0.03)]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroTop}>
              <View style={[
                styles.avatarShell,
                {
                  borderColor: theme.isDark ? 'rgba(0,245,255,0.74)' : colors.border.strong,
                  backgroundColor: theme.isDark ? 'rgba(0,245,255,0.09)' : colors.surface.subtle,
                }
              ]}>
                {worker.profileImage ? (
                  <Image source={{ uri: worker.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={[
                    styles.avatarFallback,
                    {
                      backgroundColor: theme.isDark ? 'rgba(0,245,255,0.11)' : colors.surface.subtle,
                    }
                  ]}>
                    <Text style={[styles.avatarFallbackText, { color: legacyColors.cyan }]}>{initialsFor(worker.fullName)}</Text>
                  </View>
                )}
                <View style={[
                  styles.availabilityDot, 
                  !isAvailable && styles.availabilityDotBusy,
                  { borderColor: theme.isDark ? '#071024' : colors.surface.card }
                ]} />
              </View>

              <View style={styles.heroCopy}>
                <View style={styles.heroBadgeRow}>
                  <View style={[styles.verificationPill, !worker.isVerified && styles.verificationPillPending]}>
                    <ShieldCheck size={12} color={worker.isVerified ? legacyColors.green : C.amber} />
                    <Text style={[styles.verificationText, !worker.isVerified && styles.verificationTextPending, { color: worker.isVerified ? legacyColors.green : C.amber }]}>
                      {worker.isVerified ? t('workerDetails.verifiedUstad') : t('workerDetails.verificationPending')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.workerName, { color: colors.text.primary }]}>{worker.fullName}</Text>
                <Text style={[styles.workerCategory, { color: legacyColors.cyan }]}>{worker.category || t('workerDetails.defaultCategory', { defaultValue: 'Service Specialist' })}</Text>
                <View style={styles.locationLine}>
                  <MapPin size={13} color={legacyColors.pink} />
                  <Text style={[styles.locationText, { color: colors.text.muted }]} numberOfLines={1}>{worker.city || t('workerDetails.noCity', { defaultValue: 'Service area not added' })}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.heroDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle }]} />

            <View style={styles.heroBottom}>
              <View style={styles.ratingBlock}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      size={14}
                      color={C.amber}
                      fill={value <= Math.round(rating) ? C.amber : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : t('workerDetails.newProfile')}</Text>
                <Text style={[styles.ratingMeta, { color: colors.text.dim }]}>{t('workerDetails.reviewsCount', { count: reviewCount })}</Text>
              </View>
              <View style={[styles.availabilityPill, !isAvailable && styles.availabilityPillBusy]}>
                <View style={[styles.availabilityMiniDot, !isAvailable && styles.availabilityDotBusy, { backgroundColor: isAvailable ? legacyColors.green : colors.text.dim }]} />
                <Text style={[styles.availabilityLabel, !isAvailable && styles.availabilityLabelBusy, { color: isAvailable ? legacyColors.green : colors.text.dim }]}>
                  {isAvailable ? t('workerDetails.available') : t('workerDetails.busy')}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(520)} style={[
            styles.statsStrip,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
            }
          ]}>
            <Metric icon={Award} value={experience > 0 ? t('workerDetails.yrs', { count: experience }) : t('workerDetails.newExperience')} label={t('workerDetails.experienceLabel')} color={C.amber} />
            <View style={[styles.metricDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle }]} />
            <Metric icon={BriefcaseBusiness} value={String(completedJobs)} label={t('workerDetails.jobsLabel')} color={legacyColors.green} />
            <View style={[styles.metricDivider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : colors.border.subtle }]} />
            <Metric icon={Clock3} value={hourlyRate > 0 ? t('workerDetails.hourlyRateValue', { rate: hourlyRate.toLocaleString() }) : t('workerDetails.openRate')} label={t('workerDetails.rateLabel')} color={legacyColors.cyan} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(130).duration(520)} style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
            }
          ]}>
            <SectionTitle icon={Sparkles} title={t('workerDetails.bioTitle')} color={legacyColors.cyan} />
            <Text style={[styles.bioText, { color: colors.text.muted }]}>{worker.bio || t('workerDetails.bioPlaceholder')}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(520)} style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
            }
          ]}>
            <SectionTitle icon={Wrench} title={t('workerDetails.skillsTitle')} color={legacyColors.pink} />
            {skills.length > 0 ? (
              <View style={styles.skillsWrap}>
                {skills.map((skill) => (
                  <View key={skill} style={[
                    styles.skillPill,
                    {
                      borderColor: theme.isDark ? 'rgba(0,245,255,0.16)' : colors.border.subtle,
                      backgroundColor: theme.isDark ? 'rgba(0,245,255,0.05)' : colors.surface.subtle,
                    }
                  ]}>
                    <Check size={12} color={legacyColors.cyan} strokeWidth={3} />
                    <Text style={[styles.skillText, { color: colors.text.muted }]}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptySectionText, { color: colors.text.dim }]}>{t('workerDetails.skillsPlaceholder')}</Text>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(230).duration(520)} style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
            }
          ]}>
            <SectionTitle
              icon={Star}
              title={t('workerDetails.reviewsTitle')}
              color={C.amber}
              right={<Text style={[styles.sectionCount, { color: colors.text.dim }]}>{t('workerDetails.totalReviews', { count: reviewCount })}</Text>}
            />
            {isLoadingReviews ? (
              <ActivityIndicator color={legacyColors.cyan} style={styles.reviewsLoader} />
            ) : reviews.length > 0 ? (
              reviews.slice(0, 3).map((review: any, index: number) => (
                <ReviewItem key={review._id} review={review} isLast={index === Math.min(reviews.length, 3) - 1} />
              ))
            ) : (
              <View style={styles.emptyReviews}>
                <Star size={18} color={colors.text.dim} />
                <Text style={[styles.emptySectionText, { color: colors.text.dim }]}>{t('workerDetails.noReviews')}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {(!hasBooking || hasActiveBooking) && (
          <View style={[styles.dock, { paddingBottom: insets.bottom + 12 }]}>
            <BlurView intensity={80} tint={theme.blurTint} style={StyleSheet.absoluteFillObject} />
            <View style={[styles.dockLine, { backgroundColor: colors.border.subtle }]} />
            <View style={[styles.dockRow, hasActiveBooking && styles.bookingDockRow]}>
              <TouchableOpacity
                style={[
                  styles.dockButton, 
                  hasActiveBooking && styles.bookingDockButton,
                  {
                    backgroundColor: theme.isDark ? 'rgba(0,245,255,0.07)' : alpha(legacyColors.cyan, 0.05),
                    borderColor: theme.isDark ? 'rgba(0,245,255,0.18)' : colors.border.subtle,
                  }
                ]}
                onPress={hasActiveBooking ? openChat : shareProfile}
                activeOpacity={0.8}
              >
                {hasActiveBooking ? <MessageSquare size={19} color={legacyColors.cyan} /> : <Share2 size={19} color={legacyColors.cyan} />}
              </TouchableOpacity>
              {hasActiveBooking && (
                <TouchableOpacity 
                  style={[
                    styles.dockButton, 
                    styles.bookingDockButton,
                    {
                      backgroundColor: theme.isDark ? 'rgba(0,232,135,0.07)' : alpha(legacyColors.green, 0.05),
                      borderColor: theme.isDark ? 'rgba(0,232,135,0.2)' : colors.border.subtle,
                    }
                  ]} 
                  onPress={callWorker} 
                  activeOpacity={0.8}
                >
                  <Phone size={19} color={legacyColors.green} />
                </TouchableOpacity>
              )}
              {!hasBooking && (
                <TouchableOpacity style={styles.primaryAction} onPress={handlePrimaryAction} activeOpacity={0.86} disabled={isAccepting}>
                  <LinearGradient colors={[legacyColors.cyan, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                  {isAccepting ? (
                    <ActivityIndicator color="#001018" size="small" />
                  ) : (
                    <>
                      <Zap size={18} color="#001018" fill="#001018" />
                      <Text style={styles.primaryActionText}>{primaryLabel}</Text>
                      <ChevronRight size={18} color="#001018" strokeWidth={3} />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </BackgroundWrapper>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<any>;
  value: string;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Icon size={16} color={color} />
      <Text style={[styles.metricValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.text.dim }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  color,
  right,
}: {
  icon: React.ComponentType<any>;
  title: string;
  color: string;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}12` }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: theme.isDark ? `${color}35` : theme.colors.border.subtle }]} />
      {right}
    </View>
  );
}

function ReviewItem({ review, isLast }: { review: any; isLast: boolean }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colors = theme.colors;
  const legacyColors = theme.legacy;
  const clientName = review.customer?.fullName || t('jobDetails.client');
  return (
    <View style={[
      styles.reviewItem, 
      !isLast && [styles.reviewDivider, { borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.07)' : colors.border.subtle }]
    ]}>
      <View style={styles.reviewHeader}>
        <View style={[
          styles.reviewAvatar,
          {
            borderColor: theme.isDark ? 'rgba(255,176,0,0.2)' : colors.border.subtle,
            backgroundColor: theme.isDark ? 'rgba(255,176,0,0.08)' : colors.surface.subtle,
          }
        ]}>
          {review.customer?.profileImage ? (
            <Image source={{ uri: review.customer.profileImage }} style={styles.reviewAvatarImage} />
          ) : (
            <Text style={[styles.reviewAvatarText, { color: C.amber }]}>{initialsFor(clientName)}</Text>
          )}
        </View>
        <View style={styles.reviewCopy}>
          <Text style={[styles.reviewerName, { color: colors.text.primary }]}>{clientName}</Text>
          <Text style={[styles.reviewDate, { color: colors.text.dim }]}>{formatDate(review.createdAt, i18n.language)}</Text>
        </View>
        <View style={[
          styles.reviewRating,
          { backgroundColor: theme.isDark ? 'rgba(255,176,0,0.08)' : colors.surface.subtle }
        ]}>
          <Star size={12} color={C.amber} fill={C.amber} />
          <Text style={[styles.reviewRatingText, { color: C.amber }]}>{review.rating}</Text>
        </View>
      </View>
      {!!review.comment && <Text style={[styles.reviewComment, { color: colors.text.muted }]}>{review.comment}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  loadingText: { fontSize: 13, fontWeight: '800' },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyAction: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  emptyActionText: { fontSize: 12, fontWeight: '900' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerButton: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  heroCard: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, padding: 15, marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarShell: { width: 82, height: 82, borderRadius: 24, padding: 3, borderWidth: 2 },
  avatar: { width: '100%', height: '100%', borderRadius: 20 },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  avatarFallbackText: { fontSize: 24, fontWeight: '900' },
  availabilityDot: { position: 'absolute', bottom: 0, right: 0, width: 15, height: 15, borderRadius: 999, borderWidth: 2, backgroundColor: '#00E887' },
  availabilityDotBusy: { backgroundColor: '#6E778C' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 7 },
  verificationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,232,135,0.24)', backgroundColor: 'rgba(0,232,135,0.08)' },
  verificationPillPending: { borderColor: 'rgba(255,176,0,0.24)', backgroundColor: 'rgba(255,176,0,0.08)' },
  verificationText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  verificationTextPending: { color: '#FFB000' },
  workerName: { fontSize: 22, fontWeight: '900', marginBottom: 3 },
  workerCategory: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { flex: 1, fontSize: 11, fontWeight: '700' },
  heroDivider: { height: 1, marginVertical: 14 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ratingBlock: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  ratingStars: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '900' },
  ratingMeta: { fontSize: 10, fontWeight: '700' },
  availabilityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,232,135,0.08)', borderWidth: 1, borderColor: 'rgba(0,232,135,0.20)' },
  availabilityPillBusy: { backgroundColor: 'rgba(110,119,140,0.08)', borderColor: 'rgba(110,119,140,0.2)' },
  availabilityMiniDot: { width: 6, height: 6, borderRadius: 999 },
  availabilityLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  availabilityLabelBusy: { color: '#6E778C' },
  statsStrip: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 13, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: 1, marginVertical: 5 },
  metricValue: { maxWidth: '100%', fontSize: 14, fontWeight: '900', marginTop: 7, paddingHorizontal: 4 },
  metricLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.9, marginTop: 4 },
  sectionCard: { padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sectionLine: { flex: 1, height: 1 },
  sectionCount: { fontSize: 9, fontWeight: '900' },
  bioText: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  skillText: { fontSize: 11, fontWeight: '800' },
  reviewsLoader: { paddingVertical: 16 },
  emptyReviews: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  emptySectionText: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  reviewItem: { paddingVertical: 10 },
  reviewDivider: { borderBottomWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  reviewAvatarImage: { width: '100%', height: '100%' },
  reviewAvatarText: { fontSize: 12, fontWeight: '900' },
  reviewCopy: { flex: 1 },
  reviewerName: { fontSize: 12, fontWeight: '900', marginBottom: 3 },
  reviewDate: { fontSize: 10, fontWeight: '700' },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 999 },
  reviewRatingText: { fontSize: 11, fontWeight: '900' },
  reviewComment: { fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 8 },
  dock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 12, overflow: 'hidden' },
  dockLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16 },
  bookingDockRow: { justifyContent: 'center' },
  dockButton: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bookingDockButton: { width: 68 },
  primaryAction: { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, overflow: 'hidden', borderRadius: 15 },
  primaryActionText: { color: '#001018', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
});

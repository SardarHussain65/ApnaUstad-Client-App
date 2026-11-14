import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeInDown,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Scale,
  ShieldCheck,
  Star,
  UserRound,
  Zap,
  AlertTriangle,
  HelpCircle,
  Check,
  X,
  Pencil,
  Wrench,
} from 'lucide-react-native';
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from '@maplibre/maplibre-react-native';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useVoiceCall } from '../context/CallContext';
import { socketService } from '../services/socketService';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../services/backgroundLocationService';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeyFactory';
import {
  useAlertModal,
  useConfirmModal,
  useBookingDetails,
  useUpdateBookingStatusMutation,
  usePayBookingMutation,
  useRefreshOnFocus,
} from '../hooks';
import { MAPTILER_API_KEY } from '../constants/Config';
import {
  calculateDistance,
  calculateETA,
  getRouteFromOSRM,
  formatDistanceKm,
} from '../utils/mapUtils';
import { AlertModal, ConfirmModal } from '../components/ui/BeautifulModal';
import { RaiseDisputeModal } from '../components/disputes/RaiseDisputeModal';
import { SafetyShieldModal } from '../components/safety/SafetyShieldModal';
import { ReviewModal } from '../components/review/ReviewModal';
import { JobEvidenceGallery, buildJobEvidenceItems } from '../components/common/JobEvidenceGallery';
import {
  alpha,
  BorderRadius,
  useTheme,
  useThemeColors,
  useThemeTypography,
  getAccessibleColor,
} from '../constants/Theme';
import { useIsRTL } from '../context/LanguageContext';

type LocationType = { latitude: number; longitude: number };

const STEPS = [
  { value: 'pending', label: 'Requested' },
  { value: 'accepted', label: 'Booked' },
  { value: 'ongoing', label: 'Started' },
  { value: 'completed', label: 'Done' },
] as const;

const initialsFor = (name?: string) => {
  if (!name?.trim()) return 'AU';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');
};

const formatDate = (date?: string) => {
  const d = date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatCurrency = (val: number | string = 0) => {
  const num = Number(val) || 0;
  return `Rs. ${num.toLocaleString()}`;
};

interface MapUserMarkerProps {
  type: 'worker' | 'customer';
  displayName: string;
  avatarUrl?: string;
}

const MapUserMarker: React.FC<MapUserMarkerProps> = React.memo(({ type, displayName, avatarUrl }) => {
  const [imageError, setImageError] = useState(false);
  const isWorkerType = type === 'worker';
  const themeColor = isWorkerType ? '#00E5FF' : '#FF6B35';
  const glowColor = isWorkerType ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 107, 53, 0.35)';

  const hasValidImage = !!avatarUrl && !imageError;

  return (
    <View style={styles.mapMarkerRoot}>
      {/* Name / Role Badge Pill */}
      <View style={[styles.mapMarkerPill, { borderColor: themeColor }]}>
        <View style={[styles.mapMarkerPillDot, { backgroundColor: themeColor }]} />
        <Text style={[styles.mapMarkerPillText, { color: themeColor }]} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      {/* Avatar / Icon Bubble */}
      <View style={[styles.mapMarkerAvatarContainer, { borderColor: themeColor, shadowColor: themeColor }]}>
        {hasValidImage ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.mapMarkerAvatarImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.mapMarkerFallback}>
            {isWorkerType ? (
              <Wrench size={18} color="#00E5FF" strokeWidth={2.4} />
            ) : (
              <UserRound size={18} color="#FF6B35" strokeWidth={2.4} />
            )}
          </View>
        )}
      </View>

      {/* Pin Needle Pointer */}
      <View style={[styles.mapMarkerNeedle, { borderTopColor: themeColor }]} />

      {/* Ground Coordinate Pulse Target */}
      <View style={[styles.mapMarkerGroundTarget, { backgroundColor: glowColor }]}>
        <View style={[styles.mapMarkerGroundCore, { backgroundColor: themeColor }]} />
      </View>
    </View>
  );
});

export default function TransactionDetailsScreen() {
  const theme = useTheme();
  const colors = useThemeColors();
  const typography = useThemeTypography();
  const isRTL = useIsRTL();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { id, amount: initialAmount, autoAssigned } = useLocalSearchParams<{
    id: string;
    amount?: string;
    autoAssigned?: string;
  }>();
  const { role, user } = useAuth();
  const { startCall } = useVoiceCall();
  const isWorker = role === 'worker';

  const shieldColor = theme.id === 'light'
    ? '#0284C7'
    : (theme.id === 'dark' ? '#38BDF8' : '#00F5FF');
  const shieldBg = theme.id === 'light'
    ? '#E0F2FE'
    : (theme.id === 'dark' ? alpha('#38BDF8', 0.16) : alpha('#00F5FF', 0.18));
  const shieldBorder = theme.id === 'light'
    ? '#0284C7'
    : (theme.id === 'dark' ? '#38BDF8' : '#00F5FF');

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [interactiveRating, setInteractiveRating] = useState<number>(5);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showAutoAssignedModal, setShowAutoAssignedModal] = useState(autoAssigned === 'true');
  const alertModal = useAlertModal();
  const confirmModal = useConfirmModal();
  const bypassBeforeRemoveRef = useRef(false);

  // Start Work & Price Increase Verification State
  const [showStartWorkModal, setShowStartWorkModal] = useState(false);
  const [startWorkStep, setStartWorkStep] = useState<'confirm' | 'price_increase'>('confirm');
  const [revisedPriceInput, setRevisedPriceInput] = useState('');
  const [priceIncreaseReason, setPriceIncreaseReason] = useState('');
  const [isSubmittingPriceIncrease, setIsSubmittingPriceIncrease] = useState(false);
  const [isSubmittingPriceDecision, setIsSubmittingPriceDecision] = useState(false);

  // Truth Verification Modal State (Completion)
  const [showTruthModal, setShowTruthModal] = useState(false);
  const [truthPaidOption, setTruthPaidOption] = useState<'exact' | 'more'>('exact');
  const [truthDeclaredAmount, setTruthDeclaredAmount] = useState('');
  const [truthReportExtraDemand, setTruthReportExtraDemand] = useState(false);
  const [truthFeedback, setTruthFeedback] = useState('');
  const [isSubmittingTruth, setIsSubmittingTruth] = useState(false);

  // Chat Unread State
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  // Map state
  const cameraRef = useRef<CameraRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [workerLocation, setWorkerLocation] = useState<LocationType | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeETA, setRouteETA] = useState<number | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassBeforeRemoveRef.current) return;
      e.preventDefault();
      bypassBeforeRemoveRef.current = true;
      router.replace('/(tabs)' as any);
    });
    return unsubscribe;
  }, [navigation, router]);

  const { data: booking, isLoading, refetch } = useBookingDetails(id);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const queryClient = useQueryClient();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateBookingStatusMutation();
  const { mutate: payBooking, mutateAsync: payBookingAsync, isPending: isPaying } = usePayBookingMutation();

  // Auto-refresh when TransactionDetails screen regains focus
  useRefreshOnFocus(refetch);

  // Check for existing unread chat messages for this active booking
  useEffect(() => {
    if (!id) return;
    let active = true;
    api.get(`/messages/${id}?limit=20`)
      .then(res => {
        if (!active) return;
        const msgs = res.data?.data || [];
        const hasUnread = msgs.some((m: any) => m.sender !== user?._id && !m.readAt);
        if (hasUnread) setHasUnreadChat(true);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [id, user?._id]);

  useEffect(() => {
    const events = [
      'booking:status',
      'booking:accepted',
      'booking:ongoing',
      'booking:completed',
      'booking:cancelled',
      'booking:paid',
      'booking:price_increase_requested',
      'booking:price_increase_approved',
      'booking:price_increase_rejected',
      'booking:price_updated',
      'dispute:created',
      'dispute:updated',
      'dispute:resolved',
      'dispute:cancelled',
      'dispute:message',
      'chat:receive'
    ];

    const unsubs = events.map(event =>
      socketService.on(event, (data: any) => {
        if (event === 'chat:receive') {
          const msgBookingId = String(data?.booking?._id || data?.booking || '');
          if (msgBookingId === String(id) && data?.sender !== user?._id) {
            setHasUnreadChat(true);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Toast.show({
              type: 'info',
              text1: `💬 ${partnerName || t('common.chat', 'Chat')}`,
              text2: data?.messageType === 'audio' ? '🎤 Voice message' : (data?.content || 'New message'),
              onPress: navigateToChat,
            });
          }
          return;
        }
        const incomingId = (data?.bookingId || data?._id || data?.booking?._id)?.toString();
        if (!incomingId || incomingId === String(id) || event.startsWith('dispute:')) {
          setShowStartWorkModal(false);

          if (event === 'dispute:created' || event === 'dispute:updated') {
            setShowDisputeModal(false);
          }

          if (event === 'booking:price_increase_approved' && isWorker) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
              type: 'success',
              text1: t('transactionDetails.workerPriceApprovedTitle', 'Price Approved – Work Started! ⚡'),
              text2: t('transactionDetails.workerPriceApprovedDesc', 'Customer approved the new price. Work is now in progress.'),
            });
          }

          const bookingPayload = data?.booking || (data?._id ? data : null);
          if (bookingPayload) {
            queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => ({
              ...(prev || {}),
              ...bookingPayload,
            }));
          } else if (event === 'booking:ongoing') {
            queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => prev ? ({ ...prev, status: 'ongoing' }) : prev);
          } else if (event === 'booking:completed') {
            queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => prev ? ({ ...prev, status: 'completed', isCompleted: true }) : prev);
          } else if (event === 'booking:paid') {
            queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => prev ? ({ ...prev, isPaid: true, paymentStatus: 'paid', status: 'completed' }) : prev);
          } else if (event === 'booking:cancelled') {
            queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => prev ? ({ ...prev, status: 'cancelled' }) : prev);
          }

          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
          refetchRef.current();
        }
      })
    );

    return () => {
      unsubs.forEach(u => u());
    };
  }, [id, queryClient, isWorker, t]);

  const meta = booking?.cardMeta;
  const status = booking?.status || 'accepted';

  useEffect(() => {
    if (status === 'ongoing' || status === 'completed') {
      setShowStartWorkModal(false);
    }
  }, [status]);
  const disputeMeta = booking?.disputeMeta;
  const hasActiveDispute = Boolean(
    disputeMeta?.hasDispute && ['open', 'under_review'].includes(disputeMeta.disputeStatus || '')
  );
  const canRaiseDispute = disputeMeta?.canRaiseDispute === true;
  const isPaid = booking?.paymentStatus === 'paid';
  const isJobEnded = (status === 'completed' && isPaid) || status === 'cancelled';
  const isJobCompletedOrEnded = status === 'completed' || status === 'cancelled';
  const showDisputeAction = hasActiveDispute || (canRaiseDispute && !isJobEnded);
  const isCommunicationLocked = isJobEnded;

  const handleOpenDispute = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (disputeMeta?.disputeId) {
      router.push({ pathname: '/dispute-room' as any, params: { id: disputeMeta.disputeId } });
      return;
    }

    // Proactively verify with server in case the other party just submitted a dispute
    try {
      const res = await api.get(`/disputes/booking/${id}`);
      const activeDisputeId = res.data?.data?.dispute?._id;
      if (activeDisputeId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
        refetchRef.current();
        router.push({ pathname: '/dispute-room' as any, params: { id: activeDisputeId } });
        return;
      }
    } catch {
      // Proceed to show report modal if no dispute found
    }

    setShowDisputeModal(true);
  }, [id, disputeMeta?.disputeId, queryClient, router]);

  const partner = isWorker ? booking?.customer : booking?.worker;
  const customerId = typeof booking?.customer === 'object' ? booking.customer._id : booking?.customer;
  const workerId = typeof booking?.worker === 'object' ? booking.worker._id : booking?.worker;
  const partnerName = meta?.counterParty?.fullName || partner?.fullName || (isWorker ? t('transactionDetails.client', 'Customer') : t('common.ustad', 'Ustad'));
  const partnerImage = meta?.counterParty?.profileImage || partner?.profileImage || '';
  const partnerProfileId = isWorker ? customerId : workerId;
  const partnerPhone = isCommunicationLocked ? '' : meta?.counterParty?.phone || partner?.phone || '';
  const partnerCategory = meta?.counterParty?.category || partner?.category || (isWorker ? t('transactionDetails.activeClient', 'Customer') : t('findingWorker.ustadSpecialist', 'Specialist'));
  const partnerExperience = Number(meta?.counterParty?.experience ?? partner?.experience ?? 0);
  const partnerRating = Number(meta?.counterParty?.rating ?? partner?.rating ?? 0);

  const amountValue = Number(meta?.financial?.amount ?? (isWorker ? booking?.workerEarning : booking?.totalAmount) ?? initialAmount ?? 0);
  const amountText = meta?.financial?.amountText || formatCurrency(amountValue);
  const isInstant = booking?.bookingType === 'instant';

  const serviceTitle = meta?.title || booking?.category || t('transactionDetails.jobDetails', 'Service Booking');
  const serviceDescription = meta?.description || booking?.description || '';

  const rawDateLabel = meta?.schedule?.dateLabel || formatDate(booking?.scheduledDate);
  const dateLabel = rawDateLabel === 'Today' ? t('transactionDetails.today', 'Today') : rawDateLabel;
  const rawTimeLabel = meta?.schedule?.timeLabel || booking?.scheduledTime || 'ASAP';
  const timeLabel = rawTimeLabel === 'ASAP' ? t('transactionDetails.asap', 'ASAP') : rawTimeLabel;

  const isValidPakistanCoord = useCallback((lat?: number | null, lng?: number | null): boolean => {
    if (lat == null || lng == null) return false;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const isEmulator =
      (Math.abs(lat - 37.422) < 0.05 && Math.abs(lng - (-122.084)) < 0.05) ||
      (Math.abs(lat - 37.33) < 0.05 && Math.abs(lng - (-122.03)) < 0.05);
    if (isEmulator) return false;
    return lat >= 23.0 && lat <= 37.5 && lng >= 60.0 && lng <= 78.5;
  }, []);

  const [geocodedDestination, setGeocodedDestination] = useState<LocationType | null>(null);

  // If coordinates in booking are missing or invalid, forward geocode the booking address
  useEffect(() => {
    const coords = booking?.location?.coordinates || (booking?.customer as any)?.location?.coordinates;
    const lat = Number(coords?.[1] ?? (booking?.location as any)?.latitude);
    const lng = Number(coords?.[0] ?? (booking?.location as any)?.longitude);
    const hasValidCoords = isValidPakistanCoord(lat, lng);
    const addressToGeocode = booking?.address || meta?.location?.address;

    if (!hasValidCoords && addressToGeocode) {
      Location.geocodeAsync(addressToGeocode).then(results => {
        if (results && results.length > 0) {
          const first = results[0];
          if (isValidPakistanCoord(first.latitude, first.longitude)) {
            setGeocodedDestination({ latitude: first.latitude, longitude: first.longitude });
          }
        }
      }).catch((e) => {
        console.warn('Geocoding booking destination fallback error:', e);
      });
    }
  }, [booking?.location, booking?.customer, booking?.address, meta?.location?.address, isValidPakistanCoord]);

  // Destination Location (Customer / Service address)
  const destinationLocation = useMemo<LocationType>(() => {
    const coords = booking?.location?.coordinates || (booking?.customer as any)?.location?.coordinates;
    const lat = Number(coords?.[1] ?? (booking?.location as any)?.latitude);
    const lng = Number(coords?.[0] ?? (booking?.location as any)?.longitude);
    if (isValidPakistanCoord(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
    if (geocodedDestination && isValidPakistanCoord(geocodedDestination.latitude, geocodedDestination.longitude)) {
      return geocodedDestination;
    }
    return { latitude: 33.6430, longitude: 73.0733 }; // Islamabad/Rawalpindi fallback
  }, [booking?.location, booking?.customer, geocodedDestination, isValidPakistanCoord]);

  // Clean Address
  const rawAddress = meta?.location?.address || booking?.address || '';
  const cleanAddress = useMemo(() => {
    if (!rawAddress) return t('incomingJobModal.serviceLocation', 'Nearby service area');
    const cleaned = rawAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '').trim();
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    return cleaned || rawAddress;
  }, [rawAddress, t]);

  // Live Worker Location GPS Tracking & Sockets (only when en-route, i.e. status === 'accepted')
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    if (isWorker && status === 'accepted') {
      if (id) {
        void startBackgroundLocationTracking(id as string);
      }

      (async () => {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== 'granted' || !isMounted) return;

        try {
          const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted) {
            const loc = { latitude: current.coords.latitude, longitude: current.coords.longitude };
            if (isValidPakistanCoord(loc.latitude, loc.longitude)) {
              setWorkerLocation(loc);
              if (id) {
                socketService.emit('worker:location', {
                  bookingId: id,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                });
              }
            }
          }

          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
            (newPos) => {
              if (!isMounted) return;
              const loc = { latitude: newPos.coords.latitude, longitude: newPos.coords.longitude };
              if (isValidPakistanCoord(loc.latitude, loc.longitude)) {
                setWorkerLocation(loc);
                if (id) {
                  socketService.emit('worker:location', {
                    bookingId: id,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  });
                }
              }
            }
          );
        } catch (err) {
          console.warn('GPS location error:', err);
        }
      })();
    }

    return () => {
      isMounted = false;
      if (subscription) subscription.remove();
      if (isWorker) {
        void stopBackgroundLocationTracking();
      }
    };
  }, [isWorker, status, id, isValidPakistanCoord]);

  // Client listens to socket for worker location updates
  useEffect(() => {
    if (isWorker || status === 'ongoing' || status === 'completed' || status === 'cancelled') return;

    // Check if worker location already exists in booking
    const w = booking?.worker;
    const coords = (w as any)?.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lat = Number(coords[1]);
      const lng = Number(coords[0]);
      if (isValidPakistanCoord(lat, lng)) {
        setWorkerLocation({ latitude: lat, longitude: lng });
      }
    }

    const unsub = socketService.on('worker:location', (data: any) => {
      if (data && isValidPakistanCoord(data.latitude, data.longitude)) {
        setWorkerLocation({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        });
      }
    });

    return () => {
      unsub();
    };
  }, [isWorker, status, booking?.worker, isValidPakistanCoord]);

  // Worker live or profile location (Exact coordinates, no fake offsets)
  const workerMarkerLocation = useMemo<LocationType | null>(() => {
    if (workerLocation && isValidPakistanCoord(workerLocation.latitude, workerLocation.longitude)) {
      return workerLocation;
    }
    const w = booking?.worker;
    const coords = (w as any)?.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lat = Number(coords[1]);
      const lng = Number(coords[0]);
      if (isValidPakistanCoord(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    const cpCoords = (meta?.counterParty as any)?.location?.coordinates;
    if (Array.isArray(cpCoords) && cpCoords.length >= 2) {
      const lat = Number(cpCoords[1]);
      const lng = Number(cpCoords[0]);
      if (isValidPakistanCoord(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }, [workerLocation, booking?.worker, meta?.counterParty, isValidPakistanCoord]);

  // Worker has arrived at customer workplace when status is 'ongoing' or 'completed'
  const isWorkerArrived = status === 'ongoing' || status === 'completed' || (status as string) === 'started' || (status as string) === 'in_progress';
  const showMapSection = !isWorkerArrived && status !== 'cancelled' && status !== 'pending';

  // User/Worker display information for interactive map markers
  const workerDisplayName = useMemo(() => {
    if (isWorker) {
      return t('jobTracking.youUstad', 'You (Ustad)');
    }
    const raw = (booking?.worker as any)?.fullName || partnerName || t('common.ustad', 'Ustad');
    const first = raw.trim().split(' ')[0] || 'Ustad';
    return `${first} (Ustad)`;
  }, [isWorker, booking?.worker, partnerName, t]);

  const customerDisplayName = useMemo(() => {
    if (!isWorker) {
      return t('jobTracking.youClient', 'You (Client)');
    }
    const raw = (booking?.customer as any)?.fullName || partnerName || t('transactionDetails.client', 'Customer');
    const first = raw.trim().split(' ')[0] || 'Client';
    return `${first} (Client)`;
  }, [isWorker, booking?.customer, partnerName, t]);

  const workerAvatarUrl = useMemo(() => {
    if (isWorker) {
      return user?.profileImage || (booking?.worker as any)?.profileImage || '';
    }
    return partnerImage || (booking?.worker as any)?.profileImage || '';
  }, [isWorker, user?.profileImage, booking?.worker, partnerImage]);

  const customerAvatarUrl = useMemo(() => {
    if (!isWorker) {
      return user?.profileImage || (booking?.customer as any)?.profileImage || '';
    }
    return partnerImage || (booking?.customer as any)?.profileImage || '';
  }, [isWorker, user?.profileImage, booking?.customer, partnerImage]);

  // Route calculation
  const drawRouteBetween = useCallback(async (from: LocationType, to: LocationType) => {
    setIsLoadingRoute(true);
    try {
      const result = await getRouteFromOSRM(from, to);
      if (result && result.coords.length > 0) {
        setRouteCoords(result.coords);
        setRouteDistance(formatDistanceKm(result.distanceMeters));
        const mins = Math.max(1, Math.round(result.durationSeconds / 60));
        setRouteETA(mins);

        if (cameraRef.current && mapReady) {
          const west = Math.min(from.longitude, to.longitude);
          const east = Math.max(from.longitude, to.longitude);
          const south = Math.min(from.latitude, to.latitude);
          const north = Math.max(from.latitude, to.latitude);
          cameraRef.current.fitBounds([west, south, east, north], {
            padding: { top: 60, bottom: 60, left: 60, right: 60 },
          });
        }
      } else {
        setRouteCoords([[from.latitude, from.longitude], [to.latitude, to.longitude]]);
        const directMeters = calculateDistance(from, to);
        setRouteDistance(formatDistanceKm(directMeters));
        setRouteETA(Math.max(1, Math.round(calculateETA(directMeters))));
      }
    } catch (e) {
      setRouteCoords([[from.latitude, from.longitude], [to.latitude, to.longitude]]);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [mapReady]);

  const lastDrawnCoordRef = useRef<LocationType | null>(null);

  useEffect(() => {
    if (!mapReady || !showMapSection) return;
    if (workerMarkerLocation) {
      if (lastDrawnCoordRef.current) {
        const movedMeters = calculateDistance(lastDrawnCoordRef.current, workerMarkerLocation);
        // If worker has moved less than 25 meters, skip expensive route recalculation
        if (movedMeters < 25 && routeCoords.length > 0) {
          return;
        }
      }
      lastDrawnCoordRef.current = workerMarkerLocation;
      drawRouteBetween(workerMarkerLocation, destinationLocation);
    } else {
      lastDrawnCoordRef.current = null;
      setRouteCoords([]);
      setRouteDistance(null);
      setRouteETA(null);
    }
  }, [mapReady, showMapSection, workerMarkerLocation, destinationLocation, drawRouteBetween, routeCoords.length]);

  const routeGeoJSON = useMemo(() => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeCoords.map(([lat, lng]) => [lng, lat]),
    },
    properties: {},
  }), [routeCoords]);

  // Distance display text (distance-based without variable ETA minutes)
  const etaText = useMemo(() => {
    if (status === 'completed') return t('bookingStatus.completed.title', 'Job Completed');
    if (status === 'ongoing') return t('bookingStatus.ongoing.title', 'Work in progress');
    if (!workerMarkerLocation) return t('jobTracking.locating', 'Locating Ustad...');
    if (isLoadingRoute) return t('jobTracking.updatingDistance', 'Calculating distance...');
    if (routeDistance) {
      return `${routeDistance} away`;
    }
    return t('jobTracking.liveBadge', 'Live Tracking');
  }, [status, workerMarkerLocation, isLoadingRoute, routeDistance, t]);

  // Status headline
  const statusHeadline = useMemo(() => {
    if (status === 'accepted') {
      return isWorker
        ? t('transactionDetails.headingToCustomer', 'Heading to Customer')
        : t('transactionDetails.ustadOnTheWay', 'Ustad is on the way');
    }
    if (status === 'ongoing') {
      return t('transactionDetails.workInProgress', 'Work in progress');
    }
    if (status === 'completed') {
      if (!isPaid) {
        return isWorker
          ? t('transactionDetails.workDoneAwaitingPayment', 'Work completed — Awaiting Cash')
          : t('transactionDetails.workDonePayCash', 'Work completed — Please Pay Cash');
      }
      return t('transactionDetails.workCompleted', 'Work completed');
    }
    if (status === 'cancelled') {
      return t('bookingStatus.cancelled.title', 'Job cancelled');
    }
    return t('bookingStatus.pending.title', 'Requested');
  }, [status, isWorker, t]);

  // Visible Stepper Index
  const visibleStepIndex = useMemo(() => {
    const s = String(status);
    if (s === 'pending') return 0;
    if (s === 'accepted' || s === 'assigned') return 1;
    if (s === 'ongoing' || s === 'in-progress') return 2;
    if (s === 'completed') return 3;
    return 1;
  }, [status]);

  // Media evidence items
  const photosAndVideos = useMemo(() => buildJobEvidenceItems({
    images: booking?.imageUrls || [],
    videos: booking?.videoUrls || [],
  }), [booking?.imageUrls, booking?.videoUrls]);

  const voiceBriefs = useMemo(() => buildJobEvidenceItems({
    audios: booking?.audioUrls || [],
  }), [booking?.audioUrls]);

  // Handlers
  const navigateToChat = () => {
    setHasUnreadChat(false);
    if (!partnerProfileId || isCommunicationLocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/chat',
      params: { bookingId: id, recipientName: partnerName, recipientId: partnerProfileId },
    });
  };

  const callPartner = async () => {
    if (isCommunicationLocked || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await startCall({
        bookingId: id,
        recipientName: partnerName || 'Partner',
        recipientAvatar: partnerImage,
        recipientRole: isWorker ? 'Client' : 'Worker',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Call Failed',
        text2: err?.message || 'Unable to place in-app call.',
      });
    }
  };

  const openExternalMaps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationLocation.latitude},${destinationLocation.longitude}`;
    Linking.openURL(url);
  };

  const handleStartJob = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStartWorkStep('confirm');
    setRevisedPriceInput('');
    setPriceIncreaseReason('');
    setShowStartWorkModal(true);
  };

  const handleConfirmStartWorkAgreed = () => {
    if (isUpdating) return;
    setShowStartWorkModal(false);
    updateStatus(
      { bookingId: id as string, status: 'ongoing' },
      {
        onSuccess: (data: any) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (data) {
            queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => ({
              ...(prev || {}),
              ...data,
              status: 'ongoing',
            }));
          }
          refetch();
        },
        onError: (error: any) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const msg = error?.response?.data?.message || t('transactionDetails.startJobFailed', 'Could not start job. Please check your connection and try again.');
          alertModal.showAlert(t('common.error', 'Error'), msg, undefined, 'error', t('common.ok', 'OK'));
        },
      }
    );
  };

  const handleSendPriceIncrease = async () => {
    const currentPrice = Number(booking?.totalAmount || 0);
    const newPrice = Number(revisedPriceInput);

    if (!newPrice || newPrice <= currentPrice) {
      alertModal.showAlert(
        t('common.error', 'Error'),
        `New price must be higher than the agreed Rs. ${currentPrice.toLocaleString()}. Ustads cannot reduce agreed prices. If scope was reduced, customer must contact Admin Support.`,
        undefined,
        'warning'
      );
      return;
    }

    if (!priceIncreaseReason.trim() || priceIncreaseReason.trim().length < 5) {
      alertModal.showAlert(
        t('common.error', 'Error'),
        'Please enter a detailed reason for the price increase (at least 5 characters).',
        undefined,
        'warning'
      );
      return;
    }

    setIsSubmittingPriceIncrease(true);
    try {
      const res = await api.post(`/bookings/${id}/request-price-increase`, {
        revisedPrice: newPrice,
        reason: priceIncreaseReason.trim(),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowStartWorkModal(false);
      Toast.show({
        type: 'success',
        text1: 'Price Increase Sent',
        text2: 'Waiting for customer approval on their phone.',
      });
      if (res?.data?.data) {
        queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => ({
          ...(prev || {}),
          ...res.data.data,
        }));
      }
      refetch();
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.response?.data?.message || 'Failed to submit price increase request.';
      alertModal.showAlert(t('common.error', 'Error'), msg, undefined, 'error');
    } finally {
      setIsSubmittingPriceIncrease(false);
    }
  };

  const handleApprovePriceIncrease = async () => {
    setIsSubmittingPriceDecision(true);
    try {
      const res = await api.post(`/bookings/${id}/respond-price-increase`, { approved: true });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: t('transactionDetails.priceApprovedTitle', 'Price Approved & Work Started ⚡'),
        text2: t('transactionDetails.priceApprovedDesc', 'Agreed price updated. Work is now ongoing.'),
      });
      if (res?.data?.data) {
        queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => ({
          ...(prev || {}),
          ...res.data.data,
          status: 'ongoing',
        }));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to approve price increase.';
      alertModal.showAlert(t('common.error', 'Error'), msg, undefined, 'error');
    } finally {
      setIsSubmittingPriceDecision(false);
    }
  };

  const handleDeclinePriceIncrease = async () => {
    setIsSubmittingPriceDecision(true);
    try {
      const res = await api.post(`/bookings/${id}/respond-price-increase`, { approved: false });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({
        type: 'info',
        text1: 'Price Increase Declined',
        text2: 'Original agreed price remains.',
      });
      if (res?.data?.data) {
        queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => ({
          ...(prev || {}),
          ...res.data.data,
        }));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to decline price increase.';
      alertModal.showAlert(t('common.error', 'Error'), msg, undefined, 'error');
    } finally {
      setIsSubmittingPriceDecision(false);
    }
  };

  const handleOpenTruthModal = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTruthPaidOption('exact');
    setTruthDeclaredAmount('');
    setTruthReportExtraDemand(false);
    setTruthFeedback('');
    setShowTruthModal(true);
  };

  const handleSubmitTruthPayment = async () => {
    const agreedAmount = Number((booking as any)?.agreement?.cashDue ?? booking?.totalAmount ?? 0);
    const declared = truthPaidOption === 'more' ? Number(truthDeclaredAmount) : agreedAmount;

    if (truthPaidOption === 'more') {
      if (!truthDeclaredAmount || isNaN(declared) || declared <= agreedAmount) {
        alertModal.showAlert(
          t('common.error', 'Error'),
          `Please enter the actual amount paid. It must be higher than the agreed Rs. ${agreedAmount.toLocaleString()}.`,
          undefined,
          'warning'
        );
        return;
      }
    }

    setIsSubmittingTruth(true);
    try {
      if (truthPaidOption === 'more' || truthReportExtraDemand) {
        await api.post(`/bookings/${id}/verify-payment`, {
          actualAmountPaid: declared,
          reportExtraDemand: Boolean(truthReportExtraDemand),
          feedback: truthFeedback.trim() || undefined,
        });
      }

      await payBookingAsync({ bookingId: id as string, paymentMethod: 'cash' });
      setShowTruthModal(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => ({
        ...(prev || {}),
        paymentStatus: 'paid',
        isPaid: true,
        status: 'completed',
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
      refetch();
      setShowReviewModal(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('transactionDetails.paymentFailed', 'Could not confirm payment.');
      alertModal.showAlert(t('transactionDetails.paymentBlocked', 'Payment paused'), msg, undefined, 'error');
    } finally {
      setIsSubmittingTruth(false);
    }
  };

  const handleConfirmCashPayment = () => {
    handleOpenTruthModal();
  };

  const handleCompleteJob = () => {
    if (isUpdating) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirmModal.showConfirm(
      t('transactionDetails.confirmCompleteTitle', 'Complete Service?'),
      t('transactionDetails.confirmCompleteMsg', 'Please confirm that all tasks are finished and verified with the client. The client will be prompted to settle payment.'),
      () => {
        confirmModal.closeConfirm();
        updateStatus(
          { bookingId: id as string, status: 'completed' },
          {
            onSuccess: (data: any) => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (data) {
                queryClient.setQueryData(queryKeys.bookings.detail(id), (prev: any) => ({
                  ...(prev || {}),
                  ...data,
                  status: 'completed',
                }));
              }
              refetch();
            },
            onError: (error: any) => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              const msg = error?.response?.data?.message || t('transactionDetails.completeJobFailed', 'Could not complete job. Please check your connection and try again.');
              alertModal.showAlert(t('common.error', 'Error'), msg, undefined, 'error');
            },
          }
        );
      },
      undefined,
      t('transactionDetails.completeJob', 'Complete Job'),
      t('common.cancel', 'Cancel'),
      colors.success
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background.screen }]}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <ActivityIndicator color={colors.cyan} size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.text.muted }]}>
          {t('transactionDetails.loadingDetails', 'Loading booking details...')}
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background.screen }]}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
          {t('transactionDetails.bookingNotFound', 'Booking not found')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {!!id && (
            <TouchableOpacity
              onPress={() => refetch()}
              style={[styles.emptyButton, { backgroundColor: colors.cyan }]}
            >
              <Text style={[styles.emptyButtonText, { color: '#001014', fontWeight: '800' }]}>{t('common.retry', 'Try Again')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/bookings' as any);
              }
            }}
            style={[
              styles.emptyButton,
              !!id && { backgroundColor: theme.colors.surface.card, borderWidth: 1, borderColor: theme.colors.border.subtle }
            ]}
          >
            <Text style={[styles.emptyButtonText, !!id && { color: theme.colors.text.primary }]}>
              {t('transactionDetails.goBack', 'Go Back')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const mapHeight = Math.round(windowHeight * 0.40);

  const isDone = status === 'completed';
  const isDark = theme.isDark;
  const cardBg = theme.id === 'current' ? 'rgba(12, 16, 30, 0.88)' : (isDark ? '#111822' : '#FFFFFF');
  const cardBorder = theme.colors.border.default;
  const metaDividerColor = isDark ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1';

  const renderCards = () => (
    <View style={styles.cardsWrap}>
      {/* ── 1. Hero Status & Timeline Card ── */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDone
              ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
              : isWorkerArrived
                ? (isDark ? 'rgba(14, 165, 233, 0.12)' : '#EFF6FF')
                : cardBg,
            borderColor: isDone
              ? (isDark ? 'rgba(34, 197, 94, 0.45)' : '#22C55E')
              : isWorkerArrived
                ? (isDark ? 'rgba(56, 189, 248, 0.45)' : '#3B82F6')
                : cardBorder,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.heroIconBadge,
              {
                backgroundColor: isDone
                  ? (isDark ? 'rgba(34, 197, 94, 0.22)' : '#DCFCE7')
                  : isWorkerArrived
                    ? (isDark ? 'rgba(6, 182, 212, 0.22)' : '#E0F2FE')
                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'),
              },
            ]}
          >
            {isDone ? (
              <CheckCircle2 size={26} color={colors.success} strokeWidth={2.4} />
            ) : isWorkerArrived ? (
              <Zap size={24} color={colors.cyan} strokeWidth={2.4} />
            ) : (
              <Clock3 size={24} color={colors.worker} strokeWidth={2.4} />
            )}
          </View>

          <View style={styles.heroTitles}>
            <View style={styles.heroHeadlineRow}>
              <Text
                style={[styles.heroHeadline, typography.threeD, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {statusHeadline}
              </Text>

              <View
                style={[
                  styles.urgencyPill,
                  {
                    backgroundColor: isInstant ? alpha(colors.worker, 0.12) : alpha(colors.cyan, 0.10),
                    borderColor: isInstant ? alpha(colors.worker, 0.35) : alpha(colors.cyan, 0.3),
                  },
                ]}
              >
                <Zap size={10} color={isInstant ? colors.worker : colors.cyan} strokeWidth={2.5} />
                <Text
                  style={[
                    styles.urgencyPillText,
                    { color: isInstant ? colors.worker : colors.cyan },
                  ]}
                >
                  {isInstant ? t('home.worker.instant', 'Urgent') : t('transactionDetails.scheduled', 'Scheduled')}
                </Text>
              </View>
            </View>

            <Text style={[styles.heroSubText, { color: theme.colors.text.muted }]}>
              {isDone
                ? `${t('transactionDetails.completedOn', 'Completed on')} ${dateLabel} • ${timeLabel}`
                : isWorkerArrived
                  ? t('transactionDetails.workInProgressSub', 'Ustad is actively working on site')
                  : t('transactionDetails.enRouteSub', 'Ustad is heading to your location')}
            </Text>
          </View>
        </View>

        {/* 4-Stage Connected Micro-Timeline */}
        <View style={styles.timelineRow}>
          {STEPS.map((step, idx) => {
            const isCompleted = isDone ? true : idx < visibleStepIndex;
            const isCurrent = isDone ? false : idx === visibleStepIndex;

            return (
              <React.Fragment key={step.value}>
                <View style={styles.timelineStep}>
                  <View
                    style={[
                      styles.timelineNode,
                      isCompleted && [
                        styles.timelineNodeCompleted,
                        {
                          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.22)' : '#DCFCE7',
                          borderColor: colors.success,
                        },
                      ],
                      isCurrent && [
                        styles.timelineNodeCurrent,
                        {
                          backgroundColor: alpha(colors.cyan, 0.15),
                          borderColor: colors.cyan,
                        },
                      ],
                      (!isCompleted && !isCurrent) && [
                        styles.timelineNodePending,
                        {
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                        },
                      ],
                    ]}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={13} color={colors.success} strokeWidth={2.8} />
                    ) : isCurrent ? (
                      <View style={[styles.timelineNodeDot, { backgroundColor: colors.cyan }]} />
                    ) : (
                      <View
                        style={[
                          styles.timelineNodeDot,
                          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)' },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      (isCompleted || isCurrent)
                        ? [styles.timelineLabelActive, { color: theme.colors.text.primary }]
                        : [styles.timelineLabelDim, { color: theme.colors.text.dim }],
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>

                {idx < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.timelineConnector,
                      (isDone || idx < visibleStepIndex)
                        ? [
                          styles.timelineConnectorActive,
                          { backgroundColor: isDone ? colors.success : colors.cyan },
                        ]
                        : [
                          styles.timelineConnectorDim,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
                          },
                        ],
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* ── Customer Price Increase Review Alert Banner ── */}
      {!isWorker && (booking as any)?.pendingPriceIncrease && (() => {
        const currentAmount = Number(booking?.totalAmount || 0);
        const newAmount = Number((booking as any).pendingPriceIncrease.revisedPrice || 0);
        const difference = newAmount - currentAmount;

        return (
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: isDark ? '#1C150A' : '#FFFBF5',
                borderColor: colors.worker || '#FF9800',
                borderWidth: 1.8,
                borderRadius: 20,
                padding: 16,
                marginBottom: 14,
                shadowColor: colors.worker || '#FF9800',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.25 : 0.12,
                shadowRadius: 10,
                elevation: 4,
              },
            ]}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: alpha(colors.worker || '#FF9800', 0.18),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} color={colors.worker || '#FF9800'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.worker || '#FF9800' }}>
                  {t('transactionDetails.priceIncreaseAlert', 'Price Revision Request from Ustad')}
                </Text>
                <Text style={{ fontSize: 11.5, color: theme.colors.text.muted, marginTop: 1 }}>
                  {t('transactionDetails.priceIncreaseSubtitle', 'Ustad inspected on-site and requested an updated rate')}
                </Text>
              </View>
            </View>

            {/* Prominent Highlighted Price Comparison Box */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : '#FFFFFF',
                borderColor: alpha(colors.worker || '#FF9800', 0.35),
                borderWidth: 1.2,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 14,
                marginVertical: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '700',
                    color: theme.colors.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Current Price
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: theme.colors.text.secondary,
                    textDecorationLine: 'line-through',
                    marginTop: 2,
                  }}
                >
                  Rs. {currentAmount.toLocaleString()}
                </Text>
              </View>

              <View style={{ paddingHorizontal: 8, alignItems: 'center' }}>
                <ArrowRight size={18} color={colors.worker || '#FF9800'} />
                {difference > 0 && (
                  <View
                    style={{
                      backgroundColor: alpha(colors.worker || '#FF9800', 0.18),
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      marginTop: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.worker || '#FF9800' }}>
                      +Rs. {difference.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: colors.worker || '#FF9800',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  New Requested Price
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.success || '#00E676', marginTop: 1 }}>
                  Rs. {newAmount.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Reason Box */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                borderWidth: 1,
                padding: 10,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, lineHeight: 17 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.text.primary }}>{t('common.reason', 'Reason')}: </Text>
                "{(booking as any).pendingPriceIncrease.reason}"
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1.3,
                  backgroundColor: colors.success,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: colors.success,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                onPress={handleApprovePriceIncrease}
                disabled={isSubmittingPriceDecision}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {isSubmittingPriceDecision ? 'Updating...' : `Approve (Rs. ${newAmount.toLocaleString()})`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 0.9,
                  borderWidth: 1.5,
                  borderColor: colors.error,
                  backgroundColor: alpha(colors.error, 0.08),
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleDeclinePriceIncrease}
                disabled={isSubmittingPriceDecision}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.error, fontWeight: '700', fontSize: 13.5 }}>
                  {t('common.decline', 'Decline')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* ── Worker Price Increase Pending Notice Banner ── */}
      {isWorker && (booking as any)?.pendingPriceIncrease && (
        <View style={[styles.cardSection, { backgroundColor: alpha(colors.cyan, 0.08), borderColor: colors.cyan, borderWidth: 1.5, marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Clock3 size={18} color={colors.cyan} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.cyan }}>
              Price Increase Pending Approval (Rs. {Number((booking as any).pendingPriceIncrease.revisedPrice).toLocaleString()})
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 4 }}>
            Waiting for the customer to review and approve the updated price on their phone.
          </Text>
        </View>
      )}

      {/* ── Latest Price Revision Declined Resolution Mechanism ── */}
      {(() => {
        const history = (booking as any)?.priceRevisionHistory;
        const latestRev = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
        const isDeclined = latestRev?.status === 'rejected' && !(booking as any)?.pendingPriceIncrease && status === 'accepted';
        if (!isDeclined) return null;

        if (isWorker) {
          return (
            <View style={[styles.cardSection, { backgroundColor: alpha(colors.worker, isDark ? 0.14 : 0.08), borderColor: colors.worker, borderWidth: 1.5, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={18} color={colors.worker} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.worker }}>
                  Customer Declined Price Revision
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.colors.text.primary, lineHeight: 18, marginBottom: 6 }}>
                Customer did not agree to increase the price to Rs. {Number(latestRev.revisedPrice).toLocaleString()}. The agreed rate of Rs. {Number(booking.totalAmount).toLocaleString()} remains active.
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 10 }}>
                Please choose how you wish to proceed:
              </Text>
              <View style={{ flexDirection: 'column', gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: colors.worker,
                      paddingVertical: 11,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setStartWorkStep('price_increase');
                      setRevisedPriceInput('');
                      setPriceIncreaseReason('');
                      setShowStartWorkModal(true);
                    }}
                    activeOpacity={0.82}
                  >
                    <Pencil size={14} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                      Propose New Rate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: colors.cyan,
                      paddingVertical: 11,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onPress={handleConfirmStartWorkAgreed}
                    activeOpacity={0.82}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#001014" />
                    ) : (
                      <>
                        <CheckCircle2 size={14} color="#001014" strokeWidth={2.4} />
                        <Text style={{ color: '#001014', fontWeight: '800', fontSize: 12 }} numberOfLines={1}>
                          Proceed at Rs. {Number(booking.totalAmount).toLocaleString()}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: alpha(colors.error, 0.45),
                    backgroundColor: alpha(colors.error, 0.08),
                    paddingVertical: 9,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onPress={() => {
                    confirmModal.showConfirm(
                      'Cancel Booking?',
                      'Cancel this job due to on-site price disagreement with the customer? No penalty will be applied to your account.',
                      () => {
                        confirmModal.closeConfirm();
                        updateStatus(
                          { bookingId: id as string, status: 'cancelled', cancelReason: 'Price disagreement on site (customer declined price increase)' },
                          {
                            onSuccess: () => {
                              refetch();
                              alertModal.showAlert('Booking Cancelled', 'Booking cancelled safely due to price disagreement.', undefined, 'info');
                            }
                          }
                        );
                      },
                      undefined,
                      'Cancel Booking',
                      'Keep Booking'
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <X size={14} color={colors.error} strokeWidth={2.4} />
                  <Text style={{ color: colors.error, fontWeight: '700', fontSize: 12 }}>
                    Cancel Job (Price Disagreement)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        } else {
          return (
            <View style={[styles.cardSection, { backgroundColor: alpha(colors.worker, isDark ? 0.14 : 0.08), borderColor: colors.worker, borderWidth: 1.5, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={18} color={colors.worker} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.worker }}>
                  Price Increase Declined
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.colors.text.primary, lineHeight: 18, marginBottom: 6 }}>
                You declined the Ustad's price increase of Rs. {Number(latestRev.revisedPrice).toLocaleString()}. The original price of Rs. {Number(booking.totalAmount).toLocaleString()} remains active.
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 10 }}>
                If the Ustad is willing to complete the work at the original price, they will start now. If they refuse to work, you can cancel without any charges.
              </Text>
              <TouchableOpacity
                style={{ borderWidth: 1, borderColor: colors.error, paddingVertical: 9, borderRadius: 10, alignItems: 'center' }}
                onPress={() => {
                  confirmModal.showConfirm(
                    'Cancel Booking?',
                    'Cancel this booking because the Ustad refused to work at the agreed price?',
                    () => {
                      confirmModal.closeConfirm();
                      updateStatus(
                        { bookingId: id as string, status: 'cancelled', cancelReason: 'Ustad refused to work at original agreed price' },
                        {
                          onSuccess: () => {
                            refetch();
                            alertModal.showAlert('Booking Cancelled', 'Booking cancelled. You can find another Ustad anytime.', undefined, 'info');
                          }
                        }
                      );
                    },
                    undefined,
                    'Yes, Cancel',
                    'Wait for Ustad'
                  );
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.error, fontWeight: '700', fontSize: 12 }}>
                  Cancel Booking (Ustad Refused Original Rate)
                </Text>
              </TouchableOpacity>
            </View>
          );
        }
      })()}

      {/* ── 2. Unified Partner & Financial Master Hub ── */}
      <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Partner Header Row */}
        <View style={styles.partnerHubHeader}>
          <View style={styles.partnerHubLeft}>
            <View
              style={[
                styles.partnerAvatarFrame,
                { borderColor: isDark ? alpha(colors.cyan, 0.4) : 'rgba(15, 23, 42, 0.14)' },
              ]}
            >
              {partnerImage ? (
                <Image source={{ uri: partnerImage }} style={styles.partnerAvatarImage} />
              ) : (
                <View style={[styles.partnerAvatarFallback, { backgroundColor: alpha(colors.cyan, 0.15) }]}>
                  <Text style={[styles.partnerAvatarInitials, { color: colors.cyan }]}>
                    {initialsFor(partnerName)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.partnerHubMeta}>
              <Text style={[styles.partnerHubName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {partnerName}
              </Text>
              <Text style={[styles.partnerHubCategory, { color: theme.colors.text.muted }]} numberOfLines={1}>
                {isWorker
                  ? cleanAddress
                  : `${partnerCategory}${partnerExperience > 0 ? ` • ${partnerExperience} yrs exp` : ''}`}
              </Text>
            </View>
          </View>

          {/* Contact Action Pills: Call & Chat */}
          <View style={styles.contactPillsGroup}>
            <TouchableOpacity
              style={[
                styles.contactPillBtn,
                { backgroundColor: alpha(colors.cyan, 0.12), borderColor: alpha(colors.cyan, 0.28) },
                (isCommunicationLocked || !partnerProfileId) && styles.buttonDisabled,
              ]}
              onPress={navigateToChat}
              disabled={isCommunicationLocked || !partnerProfileId}
              activeOpacity={0.8}
            >
              <View style={styles.chatIconWrapper}>
                <MessageCircle size={15} color={colors.cyan} strokeWidth={2.4} />
                {hasUnreadChat && <View style={styles.unreadChatDot} />}
              </View>
              <Text style={[styles.contactPillText, { color: colors.cyan }]}>
                {t('common.chat', 'Chat')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.contactPillBtn,
                { backgroundColor: alpha(colors.success, 0.12), borderColor: alpha(colors.success, 0.28) },
                (isCommunicationLocked || !partnerPhone) && styles.buttonDisabled,
              ]}
              onPress={callPartner}
              disabled={isCommunicationLocked || !partnerPhone}
              activeOpacity={0.8}
            >
              <Phone size={14} color={colors.success} strokeWidth={2.4} />
              <Text style={[styles.contactPillText, { color: colors.success }]}>
                {t('common.call', 'Call')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Clean Hairline Divider */}
        <View style={[styles.hubDivider, { backgroundColor: metaDividerColor }]} />

        {/* Financial Strip: Agreed Rate & Payment Status */}
        <View style={styles.hubPaymentRow}>
          <View>
            <Text style={[styles.hubPaymentLabel, { color: theme.colors.text.muted }]}>
              {isWorker
                ? t('transactionDetails.yourEarning', 'YOUR NET EARNING')
                : t('jobAssignedModal.agreedPrice', 'TOTAL AGREED RATE')}
            </Text>
            <Text style={[styles.hubPaymentAmount, { color: theme.colors.text.primary }]}>
              {amountText}
            </Text>
          </View>

          <View
            style={[
              styles.hubPaymentBadge,
              {
                backgroundColor: isPaid ? alpha(colors.success, 0.12) : alpha(colors.worker, 0.12),
                borderColor: isPaid ? alpha(colors.success, 0.35) : alpha(colors.worker, 0.35),
              },
            ]}
          >
            {isPaid ? (
              <CheckCircle2 size={15} color={colors.success} strokeWidth={2.4} />
            ) : (
              <CreditCard size={15} color={colors.worker} strokeWidth={2.4} />
            )}
            <Text
              style={[
                styles.hubPaymentBadgeText,
                { color: isPaid ? colors.success : colors.worker },
              ]}
            >
              {isPaid ? t('transactionDetails.paid', 'Cash Paid') : t('transactionDetails.cashPending', 'Cash to Pay')}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 3. Job Specifications & Location Hub ── */}
      <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.sectionHeaderLine}>
          <BriefcaseBusiness size={16} color={colors.cyan} strokeWidth={2.2} />
          <Text style={[styles.sectionHeaderTitle, { color: theme.colors.text.primary }]}>
            {t('transactionDetails.jobSpecifications', 'Job Details')}
          </Text>
        </View>

        <View style={styles.specsGrid}>
          <View style={styles.specTile}>
            <View style={[styles.specIconWrap, { backgroundColor: alpha(colors.cyan, 0.12) }]}>
              <CalendarDays size={16} color={colors.cyan} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.specLabel, { color: theme.colors.text.muted }]}>
                {t('transactionDetails.scheduledTimeLabel', 'SCHEDULE')}
              </Text>
              <Text style={[styles.specValue, { color: theme.colors.text.primary }]}>
                {dateLabel} • {timeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.specTile}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
              onPress={openExternalMaps}
              activeOpacity={0.8}
            >
              <View style={[styles.specIconWrap, { backgroundColor: alpha(colors.worker, 0.12) }]}>
                <MapPin size={16} color={colors.worker} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.specLabel, { color: theme.colors.text.muted }]}>
                  {t('transactionDetails.serviceLocationLabel', 'SERVICE ADDRESS')}
                </Text>
                <Text style={[styles.specValue, { color: theme.colors.text.primary }]} numberOfLines={2}>
                  {cleanAddress}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Client Problem Brief */}
        {Boolean(serviceDescription && serviceDescription.trim()) && (
          <View
            style={[
              styles.noteContainer,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
              },
            ]}
          >
            <View style={styles.noteHeader}>
              <FileText size={13} color={theme.colors.text.muted} strokeWidth={2.2} />
              <Text style={[styles.noteHeaderLabel, { color: theme.colors.text.muted }]}>
                {t('transactionDetails.workInstructions', 'WORK DESCRIPTION / CLIENT NOTE')}
              </Text>
            </View>
            <Text style={[styles.noteBodyText, { color: theme.colors.text.primary }]}>
              {serviceDescription}
            </Text>
          </View>
        )}

        {/* Photos & Videos */}
        {photosAndVideos.length > 0 && (
          <View style={styles.galleryBlock}>
            <Text style={[styles.galleryTitle, { color: theme.colors.text.muted }]}>
              {t('transactionDetails.photosVideos', 'PHOTOS & VIDEOS')}
            </Text>
            <JobEvidenceGallery items={photosAndVideos} isWorker={isWorker} />
          </View>
        )}

        {/* Voice Memo */}
        {voiceBriefs.length > 0 && (
          <View style={styles.galleryBlock}>
            <Text style={[styles.galleryTitle, { color: theme.colors.text.muted }]}>
              {t('transactionDetails.voiceBrief', 'VOICE MEMO')}
            </Text>
            <JobEvidenceGallery items={voiceBriefs} isWorker={isWorker} />
          </View>
        )}
      </View>

      {/* ── 4. Review Submitted Confirmation (For Client) ── */}
      {!isWorker && isDone && isPaid && booking?.isReviewed && (
        <View style={styles.ratingHeroContainer}>
          <View
            style={[
              styles.reviewRecordedCard,
              {
                backgroundColor: alpha(colors.success, 0.10),
                borderColor: alpha(colors.success, 0.28),
              },
            ]}
          >
            <CheckCircle2 size={20} color={colors.success} strokeWidth={2.4} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.reviewRecordedTitle, { color: colors.success }]}>
                {t('transactionDetails.feedbackRecorded', 'Review Submitted!')}
              </Text>
              <Text style={[styles.reviewRecordedSub, { color: theme.colors.text.muted }]}>
                {t('transactionDetails.feedbackThankYou', 'Thank you for rating Ustad and supporting quality work.')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 5. Primary Action Buttons ── */}
      {isWorker && status !== 'completed' && status !== 'cancelled' && (
        <View style={styles.actionContainer}>
          {status === 'accepted' && (
            <ActionButton
              color={colors.cyan}
              icon={Zap}
              label={t('transactionDetails.startJob', 'Start Job')}
              loading={isUpdating}
              onPress={handleStartJob}
            />
          )}

          {status === 'ongoing' && (
            <ActionButton
              color={colors.success}
              icon={CheckCircle2}
              label={t('transactionDetails.completeJob', 'Complete Job')}
              loading={isUpdating}
              onPress={handleCompleteJob}
            />
          )}
        </View>
      )}

      {!isWorker && status === 'completed' && !isPaid && !hasActiveDispute && (
        <View style={styles.actionContainer}>
          <ActionButton
            color={colors.success}
            icon={CheckCircle2}
            label={t('transactionDetails.confirmCash', 'Confirm Cash Payment')}
            loading={isPaying}
            onPress={handleConfirmCashPayment}
          />
        </View>
      )}

      {/* Discreet Dispute Help Link */}
      {canRaiseDispute && !isJobEnded && !hasActiveDispute && (
        <TouchableOpacity
          style={styles.disputeLink}
          onPress={handleOpenDispute}
          activeOpacity={0.7}
        >
          <Scale size={13} color={theme.colors.text.muted} strokeWidth={2} />
          <Text style={[styles.disputeLinkText, { color: theme.colors.text.muted }]}>
            {t('transactionDetails.raiseDisputeLink', 'Have an issue with this job? Tap to raise dispute')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.isDark ? '#080C16' : theme.colors.background.screen }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />

      {/* ──────────────── Upper Section: Live Map (shown only while en-route / accepted) ──────────────── */}
      {showMapSection ? (
        <View style={[styles.mapContainer, { height: mapHeight }]}>
          <Map
            style={StyleSheet.absoluteFill}
            logo={false}
            compass={false}
            touchZoom={true}
            mapStyle={`https://api.maptiler.com/maps/${theme.isDark ? 'dataviz-dark' : 'streets-v2'}/style.json?key=${MAPTILER_API_KEY}`}
            onDidFinishLoadingMap={() => setMapReady(true)}
            onDidFinishLoadingStyle={() => setMapReady(true)}
          >
            <Camera
              ref={cameraRef}
              zoom={14}
              center={[destinationLocation.longitude, destinationLocation.latitude]}
            />

            {routeCoords.length > 0 && (
              <GeoJSONSource id="routeSource" data={routeGeoJSON as any}>
                <Layer
                  id="routeGlow"
                  type="line"
                  style={{
                    lineColor: '#00E5FF',
                    lineWidth: 10,
                    lineOpacity: 0.22,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Layer
                  id="routeLine"
                  type="line"
                  style={{
                    lineColor: '#00E5FF',
                    lineWidth: 3.5,
                    lineOpacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </GeoJSONSource>
            )}

            {/* Customer / Service Destination Marker */}
            <Marker
              id="destination"
              anchor="bottom"
              lngLat={[destinationLocation.longitude, destinationLocation.latitude]}
            >
              <MapUserMarker
                type="customer"
                displayName={customerDisplayName}
                avatarUrl={customerAvatarUrl}
              />
            </Marker>

            {/* Worker Marker */}
            {workerMarkerLocation && (
              <Marker
                id="worker"
                anchor="bottom"
                lngLat={[workerMarkerLocation.longitude, workerMarkerLocation.latitude]}
              >
                <MapUserMarker
                  type="worker"
                  displayName={workerDisplayName}
                  avatarUrl={workerAvatarUrl}
                />
              </Marker>
            )}
          </Map>

          {/* Top Header Overlay Controls */}
          <View style={[styles.mapTopControls, { top: insets.top + 8 }]}>
            <TouchableOpacity
              style={[
                styles.circleButton,
                {
                  backgroundColor: isDark ? 'rgba(10, 14, 26, 0.85)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border.default,
                  borderWidth: 1.8,
                }
              ]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ChevronLeft size={22} color={isDark ? '#FFFFFF' : theme.colors.text.primary} strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.mapTopRightControls}>
              <TouchableOpacity
                style={[
                  styles.circleButton,
                  {
                    backgroundColor: isDark ? 'rgba(10, 14, 26, 0.85)' : shieldBg,
                    borderWidth: 1.8,
                    borderColor: shieldBorder,
                  },
                  isJobCompletedOrEnded && styles.buttonDisabled,
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSafetyModal(true);
                }}
                disabled={isJobCompletedOrEnded}
                activeOpacity={0.8}
              >
                <ShieldCheck size={18} color={shieldColor} strokeWidth={2.4} />
              </TouchableOpacity>

              {showDisputeAction && (
                <TouchableOpacity
                  style={[
                    styles.circleButton,
                    {
                      backgroundColor: isDark ? alpha('#EF4444', 0.85) : '#FEE2E2',
                      borderWidth: 1.8,
                      borderColor: '#EF4444',
                    }
                  ]}
                  onPress={handleOpenDispute}
                  activeOpacity={0.8}
                >
                  <Scale size={18} color={isDark ? '#FFFFFF' : '#EF4444'} strokeWidth={2.4} />
                </TouchableOpacity>
              )}

              {destinationLocation?.latitude && destinationLocation?.longitude ? (
                <TouchableOpacity
                  style={[
                    styles.circleButton,
                    {
                      backgroundColor: isDark ? 'rgba(10, 14, 26, 0.85)' : '#FFFFFF',
                      borderWidth: 1.8,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border.default,
                    },
                    isJobCompletedOrEnded && styles.buttonDisabled,
                  ]}
                  onPress={openExternalMaps}
                  disabled={isJobCompletedOrEnded}
                  activeOpacity={0.8}
                >
                  <Navigation size={17} color={theme.id === 'light' ? theme.colors.brand.primary : (theme.id === 'dark' ? '#38BDF8' : '#00E5FF')} strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Floating ETA & Distance Badge */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.floatingEtaPill}>
            <View style={styles.pulsingDot} />
            <Text style={styles.floatingEtaText}>{etaText}</Text>
          </Animated.View>
        </View>
      ) : (
        /* Top Navigation Header when map is removed (worker reached workplace) */
        <View style={[
          styles.standardHeader,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: theme.colors.border.default,
            backgroundColor: theme.colors.background.screen,
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.circleButton,
              {
                backgroundColor: theme.colors.surface.card,
                borderWidth: 1.8,
                borderColor: theme.colors.border.default,
              }
            ]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={theme.colors.text.primary} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.standardHeaderContent}>
            <Text style={[styles.standardHeaderTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {serviceTitle}
            </Text>
            <Text style={[styles.standardHeaderSubtitle, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {statusHeadline}
            </Text>
          </View>

          <View style={styles.standardHeaderRight}>
            <TouchableOpacity
              style={[
                styles.circleButton,
                {
                  backgroundColor: shieldBg,
                  borderWidth: 1.8,
                  borderColor: shieldBorder,
                },
                isJobCompletedOrEnded && styles.buttonDisabled,
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSafetyModal(true);
              }}
              disabled={isJobCompletedOrEnded}
              activeOpacity={0.8}
            >
              <ShieldCheck size={18} color={shieldColor} strokeWidth={2.4} />
            </TouchableOpacity>

            {showDisputeAction && (
              <TouchableOpacity
                style={[
                  styles.circleButton,
                  {
                    backgroundColor: isDark ? alpha('#EF4444', 0.85) : '#FEE2E2',
                    borderWidth: 1.8,
                    borderColor: '#EF4444',
                  }
                ]}
                onPress={handleOpenDispute}
                activeOpacity={0.8}
              >
                <Scale size={18} color={isDark ? '#FFFFFF' : '#EF4444'} strokeWidth={2.4} />
              </TouchableOpacity>
            )}

            {destinationLocation?.latitude && destinationLocation?.longitude ? (
              <TouchableOpacity
                style={[
                  styles.circleButton,
                  {
                    backgroundColor: theme.colors.surface.card,
                    borderWidth: 1.8,
                    borderColor: theme.colors.border.default,
                  },
                  isJobCompletedOrEnded && styles.buttonDisabled,
                ]}
                onPress={openExternalMaps}
                disabled={isJobCompletedOrEnded}
                activeOpacity={0.8}
              >
                <Navigation size={17} color={theme.colors.brand.primary} strokeWidth={2.4} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* ──────────────── Main Content Area ──────────────── */}
      {showMapSection ? (
        <View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: isDark ? '#0C101E' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.12)',
            },
          ]}
        >
          <View style={styles.sheetDragBar} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 28 },
            ]}
          >
            {renderCards()}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.fullScrollContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
        >
          {renderCards()}
        </ScrollView>
      )}

      {/* ──────────────── Modals ──────────────── */}
      <ReviewModal
        visible={showReviewModal}
        bookingId={id as string}
        workerId={workerId as string}
        workerName={partnerName}
        workerImage={partnerImage}
        category={serviceTitle}
        initialRating={interactiveRating}
        onClose={() => setShowReviewModal(false)}
        onSkip={() => {
          setShowReviewModal(false);
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
          router.replace('/(tabs)' as any);
        }}
        onSuccess={() => {
          setShowReviewModal(false);
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.homeSummary() });
          refetch();
          router.replace('/(tabs)' as any);
        }}
      />

      <RaiseDisputeModal
        visible={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        bookingId={id as string}
        bookingStatus={status}
        jobAmount={amountValue}
        isWorker={isWorker}
        onSubmitted={() => refetch()}
        onCancelled={() => {
          refetch();
          router.replace('/(tabs)' as any);
        }}
      />

      <AlertModal
        visible={showPaymentSuccess}
        onDismiss={() => {
          setShowPaymentSuccess(false);
          router.replace('/(tabs)' as any);
        }}
        title={t('transactionDetails.settlementConfirmed', 'Settlement Confirmed')}
        message={t('transactionDetails.settlementMsg', `You have successfully settled the payment of {{amount}} with your Ustad {{ustad}} for the {{category}} job.\n\nThank you for choosing Apna Ustad!`, { amount: formatCurrency(booking.hourlyRate), ustad: partnerName, category: booking.category })}
        buttonText={t('transactionDetails.backToHome', 'Back to Home')}
        type="success"
      />

      <AlertModal
        visible={alertModal.visible}
        onDismiss={alertModal.onDismiss}
        title={alertModal.title}
        message={alertModal.message}
        buttonText={alertModal.buttonText}
        type={alertModal.type}
      />

      <ConfirmModal
        visible={confirmModal.visible}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.closeConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmColor={confirmModal.confirmColor}
        isLoading={isUpdating || isPaying}
      />

      <SafetyShieldModal
        visible={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        bookingId={id as string}
        partnerName={partnerName}
        partnerCategory={partnerCategory}
        isPartnerVerified={true}
        address={cleanAddress}
        isWorker={isWorker}
      />

      <Modal
        visible={showAutoAssignedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAutoAssignedModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <BlurView intensity={45} style={StyleSheet.absoluteFill} tint={theme.isDark ? 'dark' : 'light'} />
          <View style={styles.successModalContainer}>
            <Animated.View
              entering={FadeInDown.duration(260)}
              exiting={FadeOut.duration(160)}
              style={[
                styles.successCard,
                {
                  backgroundColor: theme.isDark ? '#07091A' : '#FFFFFF',
                  borderColor: theme.isDark ? 'rgba(0, 255, 127, 0.3)' : 'rgba(0, 168, 107, 0.25)',
                },
              ]}
            >
              <LinearGradient
                colors={theme.isDark ? ['rgba(0, 255, 127, 0.15)', 'rgba(7, 9, 26, 0.95)'] : ['rgba(0, 168, 107, 0.08)', 'rgba(255, 255, 255, 0.98)']}
                style={styles.successGradient}
              >
                <View style={styles.successBadgeOutline}>
                  <CheckCircle2 size={32} color="#00FF7F" strokeWidth={2.5} />
                </View>

                <Text style={[styles.successTitle, { color: theme.isDark ? '#00FF7F' : '#00A86B' }]}>
                  {t('findingWorker.assignedTitle', 'USTAD ASSIGNED! ⚡')}
                </Text>

                <Text style={[styles.successSubtitle, { color: theme.colors.text.secondary }]}>
                  {partner
                    ? t('jobAssignedModal.clientAcceptedPrice', { name: partnerName, amount: amountValue.toLocaleString() })
                    : t('jobAssignedModal.ustadAcceptedPrice', { amount: amountValue.toLocaleString() })}
                </Text>

                <TouchableOpacity
                  style={styles.successActionBtn}
                  onPress={() => setShowAutoAssignedModal(false)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.successActionText}>{t('common.gotIt', 'Got It')}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </View>
        </View>
      </Modal>

      {/* ── Start Work Verification Modal (Worker) ── */}
      <Modal
        visible={showStartWorkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartWorkModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <View style={styles.modalBackdrop}>
            <BlurView intensity={50} style={StyleSheet.absoluteFill} tint={theme.isDark ? 'dark' : 'light'} />
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.customModalSheet, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Top-Right Dismiss 'X' Button */}
                <TouchableOpacity
                  style={[styles.modalTopCloseBtn, { backgroundColor: alpha(theme.colors.text.primary, 0.08) }]}
                  onPress={() => setShowStartWorkModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>

                {startWorkStep === 'confirm' ? (
                  <>
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <View style={[styles.modalIconWrap, { backgroundColor: alpha(colors.cyan, 0.15) }]}>
                        <Zap size={28} color={colors.cyan} />
                      </View>
                      <Text style={[styles.modalTitleText, { color: theme.colors.text.primary }]}>
                        {t('transactionDetails.confirmStartTitle', 'Confirm Starting Work')}
                      </Text>
                      <Text style={[styles.modalSubtitleText, { color: theme.colors.text.secondary }]}>
                        {t('transactionDetails.confirmStartQuestion', 'Are you starting the work with the agreed amount of')}
                      </Text>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.success, marginTop: 4 }}>
                        Rs. {Number(booking?.totalAmount || 0).toLocaleString()}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryModalBtn, { backgroundColor: colors.cyan }]}
                      onPress={handleConfirmStartWorkAgreed}
                      activeOpacity={0.8}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#001014" />
                      ) : (
                        <Text style={[styles.primaryModalBtnText, { color: '#001014', fontWeight: '900' }]}>
                          {t('transactionDetails.yesStartWork', 'Yes, Start Work (Rs. {{amount}})', { amount: Number(booking?.totalAmount || 0).toLocaleString() })}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryModalBtn, { borderColor: cardBorder }]}
                      onPress={() => setStartWorkStep('price_increase')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.secondaryModalBtnText, { color: colors.worker }]}>
                        {t('transactionDetails.noPriceIncreased', 'No, Price Increased on Site')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginTop: 8, padding: 8, alignItems: 'center' }}
                      onPress={() => setShowStartWorkModal(false)}
                    >
                      <Text style={{ fontSize: 13, color: theme.colors.text.muted }}>{t('common.cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={{ alignItems: 'center', marginBottom: 12 }}>
                      <View style={[styles.modalIconWrap, { backgroundColor: alpha(colors.worker, 0.15) }]}>
                        <AlertTriangle size={28} color={colors.worker} />
                      </View>
                      <Text style={[styles.modalTitleText, { color: theme.colors.text.primary }]}>
                        {t('transactionDetails.reportPriceIncrease', 'Report Increased Price')}
                      </Text>
                      <Text style={[styles.modalSubtitleText, { color: theme.colors.text.secondary }]}>
                        {t('transactionDetails.reportPriceIncreaseSub', 'If additional tasks or spare parts were required, enter the new price for customer approval.')}
                      </Text>
                    </View>

                    {/* Price input */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.text.secondary, marginBottom: 4 }}>
                      NEW AMOUNT (PKR)
                    </Text>
                    <View style={[styles.modalTextInputBox, { borderColor: cardBorder, backgroundColor: alpha(theme.colors.text.primary, 0.04) }]}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text.muted, marginRight: 8 }}>PKR</Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.text.primary }}
                        keyboardType="numeric"
                        placeholder={`Higher than ${Number(booking?.totalAmount || 0).toLocaleString()}`}
                        placeholderTextColor={theme.colors.text.muted}
                        value={revisedPriceInput}
                        onChangeText={setRevisedPriceInput}
                      />
                    </View>

                    {/* Strict validation banner */}
                    {!!revisedPriceInput && Number(revisedPriceInput) <= Number(booking?.totalAmount || 0) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: alpha(colors.error, 0.1), padding: 8, borderRadius: 8, marginBottom: 10 }}>
                        <AlertTriangle size={13} color={colors.error} />
                        <Text style={{ flex: 1, fontSize: 11, color: colors.error, lineHeight: 15 }}>
                          Ustads cannot lower agreed prices. Price increases only. If the scope was reduced, customer must contact Admin Support.
                        </Text>
                      </View>
                    )}

                    {/* Reason input */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.text.secondary, marginBottom: 4, marginTop: 8 }}>
                      REASON FOR INCREASE
                    </Text>
                    <View style={[styles.modalTextInputBox, { borderColor: cardBorder, backgroundColor: alpha(theme.colors.text.primary, 0.04), minHeight: 60, alignItems: 'flex-start' }]}>
                      <TextInput
                        style={{ flex: 1, fontSize: 13, color: theme.colors.text.primary, paddingVertical: 4 }}
                        placeholder="E.g., Spare parts needed, motor rewiring, extra 2 hours"
                        placeholderTextColor={theme.colors.text.muted}
                        multiline
                        value={priceIncreaseReason}
                        onChangeText={setPriceIncreaseReason}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.primaryModalBtn,
                        {
                          backgroundColor: colors.worker,
                          marginTop: 14,
                          opacity: (!revisedPriceInput || Number(revisedPriceInput) <= Number(booking?.totalAmount || 0) || !priceIncreaseReason.trim()) ? 0.5 : 1,
                        },
                      ]}
                      onPress={handleSendPriceIncrease}
                      disabled={isSubmittingPriceIncrease || !revisedPriceInput || Number(revisedPriceInput) <= Number(booking?.totalAmount || 0) || !priceIncreaseReason.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryModalBtnText}>
                        {isSubmittingPriceIncrease ? 'Sending...' : t('transactionDetails.sendForApproval', 'Send for Customer Approval')}
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 10 }}>
                      <TouchableOpacity
                        style={{ padding: 6 }}
                        onPress={() => setStartWorkStep('confirm')}
                      >
                        <Text style={{ fontSize: 13, color: theme.colors.text.muted }}>{t('common.back', 'Back')}</Text>
                      </TouchableOpacity>
                      <View style={{ width: 1, height: 12, backgroundColor: alpha(theme.colors.text.muted, 0.3) }} />
                      <TouchableOpacity
                        style={{ padding: 6 }}
                        onPress={() => setShowStartWorkModal(false)}
                      >
                        <Text style={{ fontSize: 13, color: colors.error }}>{t('common.close', 'Close')}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Truth Verification Modal (Customer at Completion) ── */}
      <Modal
        visible={showTruthModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTruthModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <View style={styles.modalBackdrop}>
            <BlurView intensity={50} style={StyleSheet.absoluteFill} tint={theme.isDark ? 'dark' : 'light'} />
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.customModalSheet, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Top Close Button */}
                <TouchableOpacity
                  style={[styles.modalTopCloseBtn, { backgroundColor: alpha(theme.colors.text.primary, 0.07) }]}
                  onPress={() => setShowTruthModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={18} color={theme.colors.text.secondary} strokeWidth={2.4} />
                </TouchableOpacity>

                {/* Header Section */}
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View style={[styles.modalIconWrap, { backgroundColor: alpha(colors.success, 0.14) }]}>
                    <ShieldCheck size={28} color={colors.success} strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.modalTitleText, { color: theme.colors.text.primary }]}>
                    {t('transactionDetails.verifyPaymentTitle', 'Confirm Service Payment')}
                  </Text>

                  {/* Bill Callout Badge */}
                  <View style={[styles.agreedBillBox, { backgroundColor: alpha(colors.success, 0.08), borderColor: alpha(colors.success, 0.22) }]}>
                    <Text style={[styles.agreedBillLabel, { color: theme.colors.text.secondary }]}>
                      {t('transactionDetails.verifyPaymentAgreedLabel', 'Agreed Bill for this service:')}
                    </Text>
                    <Text style={[styles.agreedBillAmount, { color: colors.success }]}>
                      Rs. {Number((booking as any)?.agreement?.cashDue ?? booking?.totalAmount ?? 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Warranty & Honest policy notice */}
                <View style={[styles.warrantyBox, { backgroundColor: alpha(colors.cyan, 0.08), borderColor: alpha(colors.cyan, 0.22) }]}>
                  <ShieldCheck size={18} color={colors.cyan} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warrantyTitle, { color: colors.cyan }]}>
                      15-Day Free Rework Warranty
                    </Text>
                    <Text style={[styles.warrantyBody, { color: theme.colors.text.secondary }]}>
                      Your warranty only protects the exact amount declared here. The Ustad has no right to demand unapproved off-platform cash.
                    </Text>
                  </View>
                </View>

                {/* Payment Choice Selection */}
                <View style={{ gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={[
                      styles.truthOptionBtn,
                      {
                        borderColor: truthPaidOption === 'exact' ? colors.success : cardBorder,
                        backgroundColor: truthPaidOption === 'exact' ? alpha(colors.success, 0.12) : alpha(theme.colors.text.primary, 0.02),
                      },
                    ]}
                    onPress={() => setTruthPaidOption('exact')}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.radioCircle,
                      { borderColor: truthPaidOption === 'exact' ? colors.success : theme.colors.text.muted }
                    ]}>
                      {truthPaidOption === 'exact' && <View style={[styles.radioCircleInner, { backgroundColor: colors.success }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.truthOptionTitle, { color: theme.colors.text.primary }]}>
                        I paid the exact agreed Rs. {Number((booking as any)?.agreement?.cashDue ?? booking?.totalAmount ?? 0).toLocaleString()}
                      </Text>
                      <Text style={[styles.truthOptionSub, { color: theme.colors.text.muted }]}>
                        Standard completion with full cash handed over
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.truthOptionBtn,
                      {
                        borderColor: truthPaidOption === 'more' ? colors.worker : cardBorder,
                        backgroundColor: truthPaidOption === 'more' ? alpha(colors.worker, 0.12) : alpha(theme.colors.text.primary, 0.02),
                      },
                    ]}
                    onPress={() => setTruthPaidOption('more')}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.radioCircle,
                      { borderColor: truthPaidOption === 'more' ? colors.worker : theme.colors.text.muted }
                    ]}>
                      {truthPaidOption === 'more' && <View style={[styles.radioCircleInner, { backgroundColor: colors.worker }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.truthOptionTitle, { color: theme.colors.text.primary }]}>
                        I willingly paid more for extra tasks/materials
                      </Text>
                      <Text style={[styles.truthOptionSub, { color: theme.colors.text.muted }]}>
                        Additional agreed work or spare parts bought on-site
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {truthPaidOption === 'more' && (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: theme.colors.text.secondary, marginBottom: 6 }}>
                      ACTUAL TOTAL CASH PAID (PKR)
                    </Text>
                    <View style={[styles.modalTextInputBox, { borderColor: cardBorder, backgroundColor: alpha(theme.colors.text.primary, 0.04) }]}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text.muted, marginRight: 8 }}>PKR</Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 16, fontWeight: '700', color: theme.colors.text.primary, paddingVertical: 4 }}
                        keyboardType="numeric"
                        placeholder="Enter total amount paid"
                        placeholderTextColor={theme.colors.text.muted}
                        value={truthDeclaredAmount}
                        onChangeText={setTruthDeclaredAmount}
                      />
                    </View>
                  </View>
                )}

                {/* Report Extra Demand Toggle */}
                <TouchableOpacity
                  style={[
                    styles.reportDemandCard,
                    {
                      borderColor: truthReportExtraDemand ? alpha(colors.error, 0.55) : alpha(cardBorder, 0.7),
                      backgroundColor: truthReportExtraDemand ? alpha(colors.error, 0.08) : 'transparent',
                    }
                  ]}
                  onPress={() => setTruthReportExtraDemand(!truthReportExtraDemand)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.reportCheckbox,
                    {
                      borderColor: truthReportExtraDemand ? colors.error : theme.colors.text.muted,
                      backgroundColor: truthReportExtraDemand ? colors.error : 'transparent',
                    }
                  ]}>
                    {truthReportExtraDemand && <Check size={12} color="#fff" strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reportDemandTitle, { color: colors.error }]}>
                      Report: Ustad demanded or pressured for extra cash
                    </Text>
                    <Text style={[styles.reportDemandSub, { color: theme.colors.text.muted }]}>
                      Flags this booking for platform review without delaying completion
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryModalBtn,
                    { backgroundColor: colors.success },
                  ]}
                  onPress={handleSubmitTruthPayment}
                  disabled={isSubmittingTruth}
                  activeOpacity={0.85}
                >
                  {isSubmittingTruth ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={[styles.primaryModalBtnText, { color: '#001014', fontWeight: '900' }]}>
                      {t('transactionDetails.confirmAndClose', 'Confirm Payment & Complete')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 10, paddingVertical: 6, alignItems: 'center' }}
                  onPress={() => setShowTruthModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.colors.text.muted }}>
                    {t('common.cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ──────────────── Helper Animated Button Component ────────────────
function ActionButton({
  color,
  icon: Icon,
  label,
  loading,
  onPress,
}: {
  color: string;
  icon: React.ComponentType<any>;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.025, { duration: 1100 }), withTiming(1, { duration: 1100 })),
      -1,
      true
    );
  }, [scale]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isSuccess = color.includes('green') || color.includes('#00') || color.includes('22');
  const gradientColors: [string, string, string] = isSuccess
    ? ['#00FF87', '#00E676', '#00B85A']
    : ['#00F5FF', '#007AFF', '#7D00FF'];

  return (
    <Animated.View style={buttonAnimatedStyle}>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        disabled={loading}
        style={styles.actionButtonTouch}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.actionButtonGradient}
        >
          {loading ? (
            <ActivityIndicator color="#001014" size="small" />
          ) : (
            <Icon size={19} color="#001014" strokeWidth={2.6} />
          )}
          <Text style={styles.actionButtonText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ──────────────── Styles ────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#001014',
    fontSize: 14,
    fontWeight: '800',
  },
  mapContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  destinationMarkerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 53, 0.28)',
    borderWidth: 2,
    borderColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  workerMarkerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 229, 255, 0.28)',
    borderWidth: 2,
    borderColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00E5FF',
  },
  mapMarkerRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
  },
  mapMarkerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 17, 32, 0.94)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    maxWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  mapMarkerPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  mapMarkerPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  mapMarkerAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  mapMarkerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  mapMarkerFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  mapMarkerGroundTarget: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  mapMarkerGroundCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapTopControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  mapTopRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  standardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
  },
  standardHeaderContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  standardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  standardHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  standardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardsWrap: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    gap: 14,
  },
  fullScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.8,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heroIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitles: {
    flex: 1,
  },
  heroHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroHeadline: {
    fontSize: 19,
    fontWeight: '800',
    flexShrink: 1,
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1.4,
  },
  urgencyPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroSubText: {
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 3,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  timelineStep: {
    alignItems: 'center',
    gap: 5,
    minWidth: 56,
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeCompleted: {
    borderWidth: 1.8,
  },
  timelineNodeCurrent: {
    borderWidth: 2,
  },
  timelineNodePending: {
    borderWidth: 1.6,
  },
  timelineNodeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  timelineLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  timelineLabelActive: {
    fontWeight: '800',
  },
  timelineLabelDim: {
    fontWeight: '600',
  },
  timelineConnector: {
    flex: 1,
    height: 2.5,
    marginHorizontal: 3,
    marginBottom: 16,
    borderRadius: 1.5,
  },
  timelineConnectorActive: {
    height: 2.5,
  },
  timelineConnectorDim: {
    height: 2,
  },
  cardSection: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.8,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  partnerHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  partnerHubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  partnerAvatarFrame: {
    width: 54,
    height: 54,
    borderRadius: 17,
    borderWidth: 1.8,
    overflow: 'hidden',
  },
  partnerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  partnerAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarInitials: {
    fontSize: 18,
    fontWeight: '900',
  },
  partnerHubMeta: {
    flex: 1,
  },
  partnerHubName: {
    fontSize: 17.5,
    fontWeight: '800',
  },
  partnerHubCategory: {
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 2,
  },
  contactPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  contactPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  chatIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadChatDot: {
    position: 'absolute',
    top: -3,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  hubDivider: {
    height: 1.2,
    marginVertical: 14,
  },
  hubPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hubPaymentLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  hubPaymentAmount: {
    fontSize: 23,
    fontWeight: '900',
  },
  hubPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  hubPaymentBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  specsGrid: {
    gap: 12,
    marginBottom: 10,
  },
  specTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  noteContainer: {
    borderRadius: 14,
    borderWidth: 1.6,
    padding: 13,
    marginTop: 4,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  noteHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  noteBodyText: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '600',
  },
  galleryBlock: {
    marginTop: 10,
  },
  galleryTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ratingHeroContainer: {
    width: '100%',
    marginTop: 2,
  },
  reviewRecordedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.2,
  },
  reviewRecordedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewRecordedSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomSheetFull: {
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  floatingEtaPill: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(10, 14, 26, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    elevation: 6,
    zIndex: 10,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E5FF',
  },
  floatingEtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomSheet: {
    flex: 1,
    marginTop: -18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    elevation: 16,
    overflow: 'hidden',
  },
  sheetDragBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  statusHeadline: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  urgencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  urgencyTagText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  stepItem: {
    alignItems: 'center',
    gap: 5,
  },
  stepNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepNodeCompleted: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  stepNodeCurrent: {
    backgroundColor: 'transparent',
    borderColor: '#00E5FF',
  },
  stepCurrentCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E5FF',
  },
  stepNodeFuture: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepFutureCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: '#00E5FF',
  },
  stepLabelDim: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#00E5FF',
  },
  stepLineDim: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: 12,
  },
  partnerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatarShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '900',
  },
  partnerDetails: {
    flex: 1,
    minWidth: 0,
  },
  partnerNameText: {
    fontSize: 15,
    fontWeight: '800',
  },
  partnerSubText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  partnerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCircle: {
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  callCircle: {
    backgroundColor: '#00E676',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  priceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceStripLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priceStripAmount: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  quickBarItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  quickBarDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  quickBarText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  noteBox: {
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  galleryWrapper: {
    marginBottom: 12,
  },
  actionContainer: {
    marginTop: 8,
    marginBottom: 14,
  },
  actionButtonTouch: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    elevation: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    color: '#001014',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reviewSection: {
    marginTop: 4,
    marginBottom: 14,
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: BorderRadius.m,
    borderWidth: 1,
  },
  reviewNoticeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  disputeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  disputeLinkText: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    width: '100%',
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    width: '100%',
  },
  successModalContainer: {
    width: '88%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  successCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  successGradient: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  successBadgeOutline: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 255, 127, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  successActionBtn: {
    backgroundColor: '#00FF7F',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  successActionText: {
    color: '#001014',
    fontSize: 14,
    fontWeight: '900',
  },
  customModalSheet: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
  },
  modalTopCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 6,
    borderRadius: 20,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalTitleText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitleText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  agreedBillBox: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  agreedBillLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  agreedBillAmount: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  warrantyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  warrantyTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  warrantyBody: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  primaryModalBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryModalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryModalBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1.5,
  },
  secondaryModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalTextInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  truthOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  truthOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  truthOptionSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  reportDemandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  reportCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportDemandTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
  },
  reportDemandSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
});

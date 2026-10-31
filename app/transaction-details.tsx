import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
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
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Scale,
  Star,
  UserRound,
  Zap,
} from 'lucide-react-native';
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from '@maplibre/maplibre-react-native';

import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';
import {
  useAlertModal,
  useBookingDetails,
  useUpdateBookingStatusMutation,
  usePayBookingMutation,
  useCreateReviewMutation,
} from '../hooks';
import { MAPTILER_API_KEY } from '../constants/Config';
import {
  calculateDistance,
  calculateETA,
  getRouteFromOSRM,
  formatDistanceKm,
} from '../utils/mapUtils';
import { AlertModal } from '../components/ui/BeautifulModal';
import { RaiseDisputeModal } from '../components/disputes/RaiseDisputeModal';
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
  const isWorker = role === 'worker';

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showAutoAssignedModal, setShowAutoAssignedModal] = useState(autoAssigned === 'true');
  const alertModal = useAlertModal();
  const bypassBeforeRemoveRef = useRef(false);

  // Map state
  const cameraRef = useRef<CameraRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [workerLocation, setWorkerLocation] = useState<LocationType | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeETA, setRouteETA] = useState<number | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    if (autoAssigned === 'true') {
      router.setParams({ autoAssigned: undefined } as any);
    }
  }, [autoAssigned]);

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
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateBookingStatusMutation();
  const { mutate: payBooking, isPending: isPaying } = usePayBookingMutation();
  const { mutate: createReview, isPending: isCreatingReview } = useCreateReviewMutation();

  useEffect(() => {
    const unsub = socketService.on('booking:status', () => refetch());
    return () => unsub();
  }, [refetch]);

  const meta = booking?.cardMeta;
  const status = booking?.status || 'accepted';
  const disputeMeta = booking?.disputeMeta;
  const hasActiveDispute = Boolean(
    disputeMeta?.hasDispute && ['open', 'under_review'].includes(disputeMeta.disputeStatus || '')
  );
  const canRaiseDispute = disputeMeta?.canRaiseDispute === true;
  const isJobEnded = status === 'completed' || status === 'cancelled';
  const showDisputeAction = hasActiveDispute || (canRaiseDispute && !isJobEnded);
  const isCommunicationLocked = isJobEnded;

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
  const isPaid = booking?.paymentStatus === 'paid';
  const isInstant = booking?.bookingType === 'instant';

  const serviceTitle = meta?.title || booking?.category || t('transactionDetails.jobDetails', 'Service Booking');
  const serviceDescription = meta?.description || booking?.description || '';

  const rawDateLabel = meta?.schedule?.dateLabel || formatDate(booking?.scheduledDate);
  const dateLabel = rawDateLabel === 'Today' ? t('transactionDetails.today', 'Today') : rawDateLabel;
  const rawTimeLabel = meta?.schedule?.timeLabel || booking?.scheduledTime || 'ASAP';
  const timeLabel = rawTimeLabel === 'ASAP' ? t('transactionDetails.asap', 'ASAP') : rawTimeLabel;

  // Destination Location (Customer / Service address)
  const destinationLocation = useMemo<LocationType>(() => {
    const coords = booking?.location?.coordinates;
    const lat = Number(coords?.[1] ?? (booking?.location as any)?.latitude);
    const lng = Number(coords?.[0] ?? (booking?.location as any)?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return { latitude: lat, longitude: lng };
    }
    return { latitude: 33.6430, longitude: 73.0733 }; // Islamabad/Rawalpindi fallback
  }, [booking?.location]);

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

  // Live Worker Location GPS Tracking & Sockets
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    if (isWorker && status !== 'completed' && status !== 'cancelled') {
      (async () => {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== 'granted' || !isMounted) return;

        try {
          const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted) {
            const loc = { latitude: current.coords.latitude, longitude: current.coords.longitude };
            setWorkerLocation(loc);
            if (id) {
              socketService.emit('worker:location', {
                bookingId: id,
                latitude: loc.latitude,
                longitude: loc.longitude,
              });
            }
          }

          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
            (newPos) => {
              if (!isMounted) return;
              const loc = { latitude: newPos.coords.latitude, longitude: newPos.coords.longitude };
              setWorkerLocation(loc);
              if (id) {
                socketService.emit('worker:location', {
                  bookingId: id,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                });
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
    };
  }, [isWorker, status, id]);

  // Client listens to socket for worker location updates
  useEffect(() => {
    if (isWorker || status === 'completed' || status === 'cancelled') return;

    // Check if worker location already exists in booking
    const w = booking?.worker;
    if (w && typeof w === 'object' && (w as any).location?.coordinates) {
      const coords = (w as any).location.coordinates;
      const lat = Number(coords[1]);
      const lng = Number(coords[0]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        setWorkerLocation({ latitude: lat, longitude: lng });
      }
    }

    const unsub = socketService.on('worker:location', (data: any) => {
      if (data && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
        setWorkerLocation({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        });
      }
    });

    return () => {
      unsub();
    };
  }, [isWorker, status, booking?.worker]);

  // Fallback worker position if not yet reporting
  const workerMarkerLocation = useMemo<LocationType>(() => {
    if (workerLocation && Number.isFinite(workerLocation.latitude) && Number.isFinite(workerLocation.longitude)) {
      return workerLocation;
    }
    // Subtle realistic offset from destination
    return {
      latitude: destinationLocation.latitude + 0.009,
      longitude: destinationLocation.longitude + 0.012,
    };
  }, [workerLocation, destinationLocation]);

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

  useEffect(() => {
    if (!mapReady) return;
    drawRouteBetween(workerMarkerLocation, destinationLocation);
  }, [mapReady, workerMarkerLocation, destinationLocation, drawRouteBetween]);

  const routeGeoJSON = useMemo(() => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeCoords.map(([lat, lng]) => [lng, lat]),
    },
    properties: {},
  }), [routeCoords]);

  // ETA display text
  const etaText = useMemo(() => {
    if (status === 'completed') return t('bookingStatus.completed.title', 'Job Completed');
    if (status === 'ongoing') return t('bookingStatus.ongoing.title', 'Work in progress');
    if (isLoadingRoute) return t('jobTracking.updating', 'Calculating ETA...');
    if (routeETA && routeDistance) {
      return `${routeETA} min away • ${routeDistance}`;
    }
    if (routeDistance) {
      return `${routeDistance} away`;
    }
    return t('jobTracking.liveBadge', 'Live Tracking');
  }, [status, isLoadingRoute, routeETA, routeDistance, t]);

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
    if (!partnerProfileId || isCommunicationLocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/chat',
      params: { bookingId: id, recipientName: partnerName, recipientId: partnerProfileId },
    });
  };

  const callPartner = () => {
    if (isCommunicationLocked || !partnerPhone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${partnerPhone}`);
  };

  const openExternalMaps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationLocation.latitude},${destinationLocation.longitude}`;
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background.screen }]}>
        <StatusBar barStyle="light-content" />
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
        <StatusBar barStyle="light-content" />
        <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
          {t('transactionDetails.bookingNotFound', 'Booking not found')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.emptyButton, { backgroundColor: colors.cyan }]}
        >
          <Text style={styles.emptyButtonText}>{t('transactionDetails.goBack', 'Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mapHeight = Math.round(windowHeight * 0.40);

  return (
    <View style={[styles.root, { backgroundColor: theme.isDark ? '#080C16' : theme.colors.background.screen }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ──────────────── Upper Section: Live Map ──────────────── */}
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <Map
          style={StyleSheet.absoluteFill}
          logo={false}
          compass={false}
          touchZoom={true}
          mapStyle={`https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_API_KEY}`}
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

          {/* Customer / Service Destination Marker (Orange) */}
          <Marker id="destination" lngLat={[destinationLocation.longitude, destinationLocation.latitude]}>
            <View style={styles.destinationMarkerOuter}>
              <View style={styles.destinationMarkerInner} />
            </View>
          </Marker>

          {/* Worker Marker (Cyan) */}
          <Marker id="worker" lngLat={[workerMarkerLocation.longitude, workerMarkerLocation.latitude]}>
            <View style={styles.workerMarkerOuter}>
              <View style={styles.workerMarkerInner} />
            </View>
          </Marker>
        </Map>

        {/* Top Header Overlay Controls */}
        <View style={[styles.mapTopControls, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.mapTopRightControls}>
            {showDisputeAction && (
              <TouchableOpacity
                style={[styles.circleButton, { backgroundColor: alpha('#FF3B30', 0.85) }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (disputeMeta?.disputeId) {
                    router.push({ pathname: '/dispute-room' as any, params: { id: disputeMeta.disputeId } });
                  } else {
                    setShowDisputeModal(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Scale size={18} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.circleButton}
              onPress={openExternalMaps}
              activeOpacity={0.8}
            >
              <Navigation size={17} color="#00E5FF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating ETA & Distance Badge */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.floatingEtaPill}>
          <View style={styles.pulsingDot} />
          <Text style={styles.floatingEtaText}>{etaText}</Text>
        </Animated.View>
      </View>

      {/* ──────────────── Lower Section: Interactive Bottom Sheet ──────────────── */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: theme.isDark ? '#0C101E' : theme.colors.surface.card,
            borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
          },
        ]}
      >
        {/* Sheet Drag Indicator */}
        <View style={styles.sheetDragBar} />

        {/* Status Title & Urgency Tag */}
        <View style={styles.sheetHeader}>
          <Text
            style={[styles.statusHeadline, typography.threeD, { color: theme.colors.text.primary }]}
            numberOfLines={1}
          >
            {statusHeadline}
          </Text>

          <View
            style={[
              styles.urgencyTag,
              {
                backgroundColor: isInstant ? alpha(colors.worker, 0.14) : alpha(colors.cyan, 0.12),
                borderColor: isInstant ? alpha(colors.worker, 0.35) : alpha(colors.cyan, 0.3),
              },
            ]}
          >
            <Zap size={11} color={isInstant ? colors.worker : colors.cyan} strokeWidth={2.5} />
            <Text
              style={[
                styles.urgencyTagText,
                { color: isInstant ? colors.worker : colors.cyan },
              ]}
            >
              {isInstant ? t('home.worker.instant', 'Urgent') : t('transactionDetails.scheduled', 'Scheduled')}
            </Text>
          </View>
        </View>

        {/* 4-Step Progress Stepper */}
        <View style={styles.stepperContainer}>
          {STEPS.map((step, idx) => {
            const isCompleted = idx < visibleStepIndex;
            const isCurrent = idx === visibleStepIndex;
            const isFuture = idx > visibleStepIndex;

            return (
              <React.Fragment key={step.value}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepNode,
                      isCompleted && styles.stepNodeCompleted,
                      isCurrent && styles.stepNodeCurrent,
                      isFuture && styles.stepNodeFuture,
                    ]}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={12} color="#001014" strokeWidth={3} />
                    ) : isCurrent ? (
                      <View style={styles.stepCurrentCore} />
                    ) : (
                      <View style={styles.stepFutureCore} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      (isCompleted || isCurrent) ? styles.stepLabelActive : styles.stepLabelDim,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>

                {idx < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      idx < visibleStepIndex ? styles.stepLineActive : styles.stepLineDim,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Partner Profile Row with Action Buttons */}
        <View style={[styles.partnerRow, { borderColor: alpha(theme.colors.text.primary, 0.08) }]}>
          <View style={styles.partnerInfo}>
            <View style={styles.avatarShell}>
              {partnerImage ? (
                <Image source={{ uri: partnerImage }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: alpha(colors.cyan, 0.15) }]}>
                  <Text style={[styles.avatarInitials, { color: colors.cyan }]}>
                    {initialsFor(partnerName)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.partnerDetails}>
              <Text style={[styles.partnerNameText, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {partnerName}
              </Text>
              <Text style={[styles.partnerSubText, { color: theme.colors.text.muted }]} numberOfLines={1}>
                {isWorker
                  ? cleanAddress
                  : `${partnerCategory}${partnerExperience > 0 ? ` • ${partnerExperience} yrs exp` : ''}`}
              </Text>
            </View>
          </View>

          {/* Direct Chat & Call Buttons */}
          <View style={styles.partnerActions}>
            <TouchableOpacity
              style={[
                styles.actionCircleButton,
                styles.chatCircle,
                (isCommunicationLocked || !partnerProfileId) && styles.buttonDisabled,
              ]}
              onPress={navigateToChat}
              disabled={isCommunicationLocked || !partnerProfileId}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color="#00E5FF" strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCircleButton,
                styles.callCircle,
                (isCommunicationLocked || !partnerPhone) && styles.buttonDisabled,
              ]}
              onPress={callPartner}
              disabled={isCommunicationLocked || !partnerPhone}
              activeOpacity={0.8}
            >
              <Phone size={18} color="#001014" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Summary Details */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* Price & Payment Badge */}
          <View
            style={[
              styles.priceStrip,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.035)' : theme.colors.surface.subtle,
                borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.colors.border.subtle,
              },
            ]}
          >
            <View>
              <Text style={[styles.priceStripLabel, { color: theme.colors.text.muted }]}>
                {isWorker ? t('transactionDetails.yourEarning', 'Your Earning') : t('jobAssignedModal.agreedPrice', 'Agreed Price')}
              </Text>
              <Text style={[styles.priceStripAmount, { color: theme.colors.text.primary }]}>
                {amountText}
              </Text>
            </View>

            <View
              style={[
                styles.paymentStatusBadge,
                {
                  backgroundColor: isPaid ? alpha(colors.success, 0.12) : alpha(colors.worker, 0.12),
                  borderColor: isPaid ? alpha(colors.success, 0.3) : alpha(colors.worker, 0.3),
                },
              ]}
            >
              <CreditCard size={13} color={isPaid ? colors.success : colors.worker} strokeWidth={2.4} />
              <Text
                style={[
                  styles.paymentStatusText,
                  { color: isPaid ? colors.success : colors.worker },
                ]}
              >
                {isPaid ? t('transactionDetails.paid', 'Paid') : t('transactionDetails.cashPending', 'Cash to Pay')}
              </Text>
            </View>
          </View>

          {/* Schedule & Location Quick Bar */}
          <View style={styles.quickBar}>
            <View style={styles.quickBarItem}>
              <CalendarDays size={13} color={colors.cyan} strokeWidth={2.2} />
              <Text style={[styles.quickBarText, { color: theme.colors.text.secondary }]}>
                {dateLabel} • {timeLabel}
              </Text>
            </View>
            <View style={styles.quickBarDivider} />
            <View style={styles.quickBarItem}>
              <MapPin size={13} color={colors.worker} strokeWidth={2.2} />
              <Text style={[styles.quickBarText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                {cleanAddress}
              </Text>
            </View>
          </View>

          {/* Service Description Note (if provided) */}
          {Boolean(serviceDescription && serviceDescription.trim()) && (
            <View style={[styles.noteBox, { borderColor: alpha(theme.colors.text.primary, 0.08) }]}>
              <Text style={[styles.noteTitle, { color: theme.colors.text.muted }]}>
                {t('transactionDetails.serviceDescription', 'What needs fixing')}
              </Text>
              <Text style={[styles.noteText, { color: theme.colors.text.primary }]}>
                {serviceDescription}
              </Text>
            </View>
          )}

          {/* Evidence Audio/Video Galleries */}
          {photosAndVideos.length > 0 && (
            <View style={styles.galleryWrapper}>
              <Text style={[styles.noteTitle, { color: theme.colors.text.muted, marginBottom: 8 }]}>
                {t('transactionDetails.photosVideos', 'PHOTOS & VIDEOS')}
              </Text>
              <JobEvidenceGallery items={photosAndVideos} isWorker={isWorker} />
            </View>
          )}

          {voiceBriefs.length > 0 && (
            <View style={styles.galleryWrapper}>
              <Text style={[styles.noteTitle, { color: theme.colors.text.muted, marginBottom: 8 }]}>
                {t('transactionDetails.voiceBrief', 'VOICE MEMO')}
              </Text>
              <JobEvidenceGallery items={voiceBriefs} isWorker={isWorker} />
            </View>
          )}

          {/* ──────────────── Primary Contextual Actions ──────────────── */}

          {/* Worker Controls */}
          {isWorker && status !== 'completed' && status !== 'cancelled' && (
            <View style={styles.actionContainer}>
              {status === 'accepted' && (
                <ActionButton
                  color={colors.cyan}
                  icon={Zap}
                  label={t('transactionDetails.startJob', 'Start Job')}
                  loading={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'ongoing' })}
                />
              )}

              {status === 'ongoing' && (
                <ActionButton
                  color={colors.success}
                  icon={CheckCircle2}
                  label={t('transactionDetails.completeJob', 'Complete Job')}
                  loading={isUpdating}
                  onPress={() => updateStatus({ bookingId: id as string, status: 'completed' })}
                />
              )}
            </View>
          )}

          {/* Client Settlement (Cash Payment Confirmation) */}
          {!isWorker && status === 'completed' && !isPaid && !hasActiveDispute && (
            <View style={styles.actionContainer}>
              <ActionButton
                color={colors.success}
                icon={CheckCircle2}
                label={t('transactionDetails.confirmCash', 'Confirm Cash Payment')}
                loading={isPaying}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  payBooking(
                    { bookingId: id as string, paymentMethod: 'cash' },
                    {
                      onSuccess: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        refetch();
                        setShowPaymentSuccess(true);
                      },
                      onError: (error: any) => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        const msg = error?.response?.data?.message || t('transactionDetails.paymentFailed', 'Could not confirm payment.');
                        alertModal.showAlert(
                          t('transactionDetails.paymentBlocked', 'Payment paused'),
                          msg,
                          undefined,
                          'error',
                          t('common.ok', 'OK')
                        );
                      },
                    }
                  );
                }}
              />
            </View>
          )}

          {/* Client Star Rating & Review Widget */}
          {!isWorker && status === 'completed' && (
            <View style={styles.reviewSection}>
              {booking.isReviewed ? (
                <View style={[styles.reviewNotice, { backgroundColor: alpha(colors.success, 0.12), borderColor: alpha(colors.success, 0.3) }]}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[styles.reviewNoticeText, { color: colors.success }]}>
                    {t('transactionDetails.feedbackRecorded', 'Your feedback has been recorded for this job.')}
                  </Text>
                </View>
              ) : (
                <View style={[styles.reviewCard, { borderColor: alpha(theme.colors.text.primary, 0.08) }]}>
                  <Text style={[styles.reviewTitle, { color: theme.colors.text.primary }]}>
                    {t('transactionDetails.ratePartner', `Rate ${partnerName}`, { name: partnerName })}
                  </Text>
                  <Text style={[styles.reviewSubtitle, { color: theme.colors.text.muted }]}>
                    {t('transactionDetails.reviewSubtitle', 'A quick review helps maintain quality on Apna Ustad.')}
                  </Text>

                  {/* 5-Star Row */}
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((starNum) => {
                      const isActive = starNum <= selectedRating;
                      return (
                        <TouchableOpacity
                          key={starNum}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedRating(starNum);
                          }}
                          activeOpacity={0.7}
                          style={styles.starTouch}
                        >
                          <Star
                            size={28}
                            color={isActive ? '#FFD700' : 'rgba(255,255,255,0.2)'}
                            fill={isActive ? '#FFD700' : 'transparent'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Comment Input */}
                  <TextInput
                    style={[
                      styles.reviewInput,
                      {
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.colors.surface.subtle,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border.subtle,
                        color: theme.colors.text.primary,
                      },
                    ]}
                    placeholder={t('transactionDetails.commentPlaceholder', 'Write a comment about their work... (optional)')}
                    placeholderTextColor={theme.colors.text.muted}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    multiline
                    numberOfLines={2}
                  />

                  {/* Submit Review */}
                  <TouchableOpacity
                    style={[
                      styles.reviewSubmitBtn,
                      (selectedRating === 0 || isCreatingReview) && styles.buttonDisabled,
                    ]}
                    disabled={selectedRating === 0 || isCreatingReview}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      createReview(
                        {
                          booking: id as string,
                          worker: workerId as string,
                          rating: selectedRating,
                          comment: reviewComment.trim() || undefined,
                        },
                        {
                          onSuccess: () => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Toast.show({
                              type: 'success',
                              text1: t('review.successTitle', 'Review Submitted'),
                              text2: t('review.successDesc', 'Thank you for your feedback!'),
                            });
                            refetch();
                          },
                          onError: (err: any) => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            Toast.show({
                              type: 'error',
                              text1: t('review.failedTitle', 'Failed to Submit Review'),
                              text2: err.response?.data?.message || t('common.tryAgain', 'Please try again.'),
                            });
                          },
                        }
                      );
                    }}
                    activeOpacity={0.82}
                  >
                    {isCreatingReview ? (
                      <ActivityIndicator size="small" color="#001014" />
                    ) : (
                      <Text style={styles.reviewSubmitText}>{t('transactionDetails.submitReview', 'Submit Review')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Discreet Dispute Help Link */}
          {canRaiseDispute && !isJobEnded && !hasActiveDispute && (
            <TouchableOpacity
              style={styles.disputeLink}
              onPress={() => setShowDisputeModal(true)}
              activeOpacity={0.7}
            >
              <Scale size={13} color={theme.colors.text.muted} strokeWidth={2} />
              <Text style={[styles.disputeLinkText, { color: theme.colors.text.muted }]}>
                {t('transactionDetails.raiseDisputeLink', 'Have an issue with this job? Tap to raise dispute')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ──────────────── Modals ──────────────── */}
      <RaiseDisputeModal
        visible={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        bookingId={id as string}
        jobAmount={amountValue}
        onSubmitted={() => refetch()}
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
              entering={SlideInDown.springify().damping(15)}
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10, 14, 26, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 10,
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
  reviewCard: {
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  starTouch: {
    padding: 2,
  },
  reviewInput: {
    borderRadius: BorderRadius.m,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    minHeight: 54,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  reviewSubmitBtn: {
    backgroundColor: '#00FF87',
    paddingVertical: 10,
    borderRadius: BorderRadius.m,
    alignItems: 'center',
  },
  reviewSubmitText: {
    color: '#001014',
    fontSize: 13,
    fontWeight: '900',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successModalContainer: {
    width: '100%',
    maxWidth: 340,
  },
  successCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
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
});

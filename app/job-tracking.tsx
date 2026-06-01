import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Linking,
  Animated,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { useBookingDetails } from '../hooks';
import { MAPTILER_API_KEY } from '../constants/Config';
import {
  calculateDistance,
  getRouteFromOSRM,
  formatDistanceKm,
} from '../utils/mapUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from '@maplibre/maplibre-react-native';

const COLORS = {
  bg: '#0A0E1A',
  surface: '#111827',
  border: 'rgba(255,255,255,0.07)',
  cyan: '#00E5FF',
  cyanDim: 'rgba(0,229,255,0.15)',
  purple: '#BF5AF2',
  purpleDim: 'rgba(191,90,242,0.15)',
  text: '#F0F4FF',
  textMuted: '#6B7A9F',
  white: '#FFFFFF',
};

type LocationType = { latitude: number; longitude: number };

const firstParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const personId = (person: any) => typeof person === 'string' ? person : person?._id;

const coordinateLabel = ({ latitude, longitude }: LocationType) =>
  `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

const readableAddress = (place?: {
  name?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
}) => {
  if (!place) return '';
  return [...new Set([place.name, place.street, place.district, place.city, place.region]
    .filter((part): part is string => Boolean(part?.trim())))]
    .join(', ');
};

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: color, transform: [{ scale }], opacity },
        ]}
      />
      <View style={[styles.pulseDot, { backgroundColor: color }]} />
    </View>
  );
}

export default function JobTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string | string[];
    customerId?: string | string[];
    workerId?: string | string[];
    latitude?: string | string[];
    longitude?: string | string[];
    address?: string | string[];
  }>();
  const { role } = useAuth();
  const isWorker = role === 'worker';
  const bookingId = firstParam(params.bookingId);
  const routeCustomerId = firstParam(params.customerId);
  const routeWorkerId = firstParam(params.workerId);
  const routeLatitude = firstParam(params.latitude);
  const routeLongitude = firstParam(params.longitude);
  const routeAddress = firstParam(params.address);
  const { data: booking } = useBookingDetails(bookingId);
  const isCommunicationLocked = !booking || booking.status === 'completed' || booking.status === 'cancelled';

  const sheetAnim = useRef(new Animated.Value(120)).current;
  const headerAnim = useRef(new Animated.Value(-80)).current;
  const cameraRef = useRef<CameraRef>(null);

  const [mapReady, setMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationType | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const originGeocodeKeyRef = useRef('');

  const bookingCustomer = booking?.customer as any;
  const bookingWorker = booking?.worker as any;
  const customerId = personId(bookingCustomer) || routeCustomerId;
  const workerId = personId(bookingWorker) || routeWorkerId;
  const partner = isWorker ? bookingCustomer : bookingWorker;
  const partnerId = personId(partner) || (isWorker ? customerId : workerId);
  const partnerName = booking?.cardMeta?.counterParty?.fullName || partner?.fullName || (isWorker ? 'Client' : 'Assigned Ustad');
  const partnerPhone = booking?.cardMeta?.counterParty?.phone || partner?.phone || '';
  const addressLabel = booking?.cardMeta?.location?.address || booking?.address || routeAddress || 'Service destination';

  const destinationLocation = useMemo<LocationType>(() => {
    const coordinates = booking?.location?.coordinates;
    const latitude = Number(coordinates?.[1] ?? routeLatitude);
    const longitude = Number(coordinates?.[0] ?? routeLongitude);
    return {
      latitude: Number.isFinite(latitude) ? latitude : 24.8607,
      longitude: Number.isFinite(longitude) ? longitude : 67.0011,
    };
  }, [booking?.location?.coordinates, routeLatitude, routeLongitude]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sheetAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring(headerAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [headerAnim, sheetAnim]);

  const updateCamera = useCallback((bounds: [[number, number], [number, number]]) => {
    if (cameraRef.current && mapReady) {
      const west = Math.min(bounds[0][1], bounds[1][1]);
      const south = Math.min(bounds[0][0], bounds[1][0]);
      const east = Math.max(bounds[0][1], bounds[1][1]);
      const north = Math.max(bounds[0][0], bounds[1][0]);

      cameraRef.current.fitBounds([west, south, east, north], { padding: { top: 80, bottom: 200, left: 80, right: 80 } });
    }
  }, [mapReady]);

  const drawRouteBetween = useCallback(
    async (from: LocationType, to: LocationType) => {
      setIsLoadingRoute(true);
      try {
        const result = await getRouteFromOSRM(from, to);
        if (result) {
          setRouteCoords(result.coords);
          updateCamera([
            [from.latitude, from.longitude],
            [to.latitude, to.longitude],
          ]);
          const distStr = formatDistanceKm(result.distanceMeters);
          setRouteDistance(distStr);
        }
      } catch (e) {
        console.error('Route draw error:', e);
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [updateCamera]
  );

  useEffect(() => {
    if (!isWorker) {
      setHasPermission(false);
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, [isWorker]);

  useEffect(() => {
    if (!mapReady) return;
    const routeOrigin = isWorker ? currentLocation : partnerLocation;
    if (!routeOrigin) return;
    drawRouteBetween(routeOrigin, destinationLocation);
  }, [destinationLocation, drawRouteBetween, isWorker, mapReady, currentLocation, partnerLocation]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;
    const startTracking = async () => {
      if (isWorker && hasPermission && bookingId) {
        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (newLocation) => {
            const loc: LocationType = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            setCurrentLocation(loc);
            socketService.emit('worker:location', {
              bookingId,
              latitude: loc.latitude,
              longitude: loc.longitude,
            });
            drawRouteBetween(loc, destinationLocation);
          }
        );
      }
    };
    startTracking();
    return () => { if (locationSubscription) locationSubscription.remove(); };
  }, [isWorker, hasPermission, bookingId, destinationLocation, drawRouteBetween]);

  useEffect(() => {
    if (isWorker) return;
    const unsubscribe = socketService.on('worker:location', (data: any) => {
      if (String(data.bookingId) !== String(bookingId)) return;
      const newPartnerLoc: LocationType = { latitude: data.latitude, longitude: data.longitude };
      setPartnerLocation(newPartnerLoc);
      const dist = calculateDistance(newPartnerLoc, destinationLocation);
      setRouteDistance(formatDistanceKm(dist));
      drawRouteBetween(newPartnerLoc, destinationLocation);
    });
    return () => unsubscribe();
  }, [isWorker, bookingId, destinationLocation, drawRouteBetween]);

  const workerMarkerLocation = isWorker ? currentLocation : partnerLocation;
  const routeOrigin = isWorker ? currentLocation : partnerLocation;
  const originCoordinateKey = routeOrigin
    ? `${routeOrigin.latitude.toFixed(3)}:${routeOrigin.longitude.toFixed(3)}`
    : '';
  const destinationCoordinateKey = `${destinationLocation.latitude.toFixed(3)}:${destinationLocation.longitude.toFixed(3)}`;

  useEffect(() => {
    let isActive = true;
    if (!routeOrigin) {
      setOriginAddress('Waiting for live location');
      return undefined;
    }

    if (originGeocodeKeyRef.current === originCoordinateKey) return undefined;
    originGeocodeKeyRef.current = originCoordinateKey;
    setOriginAddress(coordinateLabel(routeOrigin));

    Location.reverseGeocodeAsync(routeOrigin)
      .then(([place]) => {
        const label = readableAddress(place);
        if (isActive && label) setOriginAddress(label);
      })
      .catch(() => undefined);

    return () => { isActive = false; };
  }, [originCoordinateKey, routeOrigin]);

  useEffect(() => {
    let isActive = true;
    if (addressLabel !== 'Service destination') {
      setDestinationAddress(addressLabel);
      return undefined;
    }

    setDestinationAddress(coordinateLabel(destinationLocation));
    Location.reverseGeocodeAsync(destinationLocation)
      .then(([place]) => {
        const label = readableAddress(place);
        if (isActive && label) setDestinationAddress(label);
      })
      .catch(() => undefined);

    return () => { isActive = false; };
  }, [addressLabel, destinationCoordinateKey, destinationLocation]);

  const directDistance = routeOrigin
    ? formatDistanceKm(calculateDistance(routeOrigin, destinationLocation))
    : null;
  const distDisplay = isLoadingRoute ? 'Updating...' : (routeDistance ?? directDistance ?? 'Waiting for GPS');

  const handleCallPartner = useCallback(async () => {
    if (isCommunicationLocked) {
      Alert.alert('Contact closed', 'Calling is disabled because this mission has ended.');
      return;
    }

    if (!partnerPhone) {
      Alert.alert('Phone unavailable', `${partnerName}'s phone number is not available for this mission.`);
      return;
    }

    try {
      await Linking.openURL(`tel:${partnerPhone}`);
    } catch {
      Alert.alert('Could not start call', 'Your device could not open the phone dialer.');
    }
  }, [isCommunicationLocked, partnerName, partnerPhone]);

  const handleOpenChat = useCallback(() => {
    if (isCommunicationLocked) {
      Alert.alert('Chat closed', 'Messaging is disabled because this mission has ended.');
      return;
    }

    if (!bookingId) {
      Alert.alert('Chat unavailable', 'This mission is missing its booking reference.');
      return;
    }

    router.push({
      pathname: '/chat',
      params: {
        bookingId,
        recipientId: partnerId || '',
        recipientName: partnerName,
      },
    });
  }, [bookingId, isCommunicationLocked, partnerId, partnerName, router]);

  const routeGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeCoords.map(([lat, lng]) => [lng, lat]),
    },
    properties: {},
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

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
                lineColor: COLORS.cyan,
                lineWidth: 12,
                lineOpacity: 0.12,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Layer
              id="routeLine"
              type="line"
              style={{
                lineColor: COLORS.cyan,
                lineWidth: 4,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </GeoJSONSource>
        )}

        <Marker id="customer" lngLat={[destinationLocation.longitude, destinationLocation.latitude]}>
          <View style={[styles.marker, { backgroundColor: COLORS.cyan }]}>
            <Text style={styles.markerEmoji}>📍</Text>
          </View>
        </Marker>

        {workerMarkerLocation && (
          <Marker id="worker" lngLat={[workerMarkerLocation.longitude, workerMarkerLocation.latitude]}>
            <View style={[styles.marker, { backgroundColor: COLORS.purple }]}>
              <Text style={styles.markerEmoji}>🔧</Text>
            </View>
          </Marker>
        )}
      </Map>

      <LinearGradient
        colors={['rgba(10,14,26,0.95)', 'rgba(10,14,26,0.6)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <Animated.View
          style={[styles.header, { transform: [{ translateY: headerAnim }] }]}
        >
          <View style={styles.headerSpacer} />

          <View style={styles.headerCenter}>
            <PulseDot color={COLORS.cyan} />
            <Text style={styles.headerTitle}>Live Tracking</Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </Animated.View>
      </SafeAreaView>

      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: sheetAnim }] }]}
      >
        <View style={styles.sheetHandle} />

        <View style={styles.distanceSummary}>
          <View style={styles.distanceIcon}>
            <Ionicons name="navigate" size={19} color={COLORS.cyan} />
          </View>
          <View style={styles.distanceCopy}>
            <Text style={styles.sheetEyebrow}>LIVE ROUTE DISTANCE</Text>
            <Text style={styles.distanceValue}>{distDisplay}</Text>
          </View>
          <PulseDot color={COLORS.cyan} />
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeRail}>
            <View style={[styles.routeNode, { borderColor: COLORS.purple }]}>
              <View style={[styles.routeNodeCore, { backgroundColor: COLORS.purple }]} />
            </View>
            <View style={styles.routeRailLine} />
            <View style={[styles.routeNode, { borderColor: COLORS.cyan }]}>
              <View style={[styles.routeNodeCore, { backgroundColor: COLORS.cyan }]} />
            </View>
          </View>
          <View style={styles.routeStops}>
            <View style={styles.routeStop}>
              <Text style={styles.routeStopLabel}>LIVE ORIGIN</Text>
              <Text style={styles.routeStopValue} numberOfLines={2}>{originAddress || 'Waiting for live location'}</Text>
            </View>
            <View style={styles.routeStop}>
              <Text style={styles.routeStopLabel}>SERVICE LOCATION</Text>
              <Text style={styles.routeStopValue} numberOfLines={2}>{destinationAddress || addressLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.back()} activeOpacity={0.82}>
            <LinearGradient
              colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.035)']}
              style={styles.actionBtnInner}
            >
              <Ionicons name="arrow-back" size={21} color={COLORS.text} />
              <Text style={[styles.actionLabel, { color: COLORS.text }]}>Back</Text>
            </LinearGradient>
          </TouchableOpacity>

          {!isCommunicationLocked && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleOpenChat} activeOpacity={0.82}>
                <LinearGradient
                  colors={[COLORS.purpleDim, 'rgba(191,90,242,0.05)']}
                  style={styles.actionBtnInner}
                >
                  <Ionicons name="chatbubble-ellipses" size={22} color={COLORS.purple} />
                  <Text style={[styles.actionLabel, { color: COLORS.purple }]}>Chat</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleCallPartner} activeOpacity={0.82}>
                <LinearGradient
                  colors={[COLORS.cyanDim, 'rgba(0,229,255,0.05)']}
                  style={styles.actionBtnInner}
                >
                  <Ionicons name="call" size={21} color={COLORS.cyan} />
                  <Text style={[styles.actionLabel, { color: COLORS.cyan }]}>Call</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 5,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerSpacer: {
    width: 40,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cyan,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.cyan,
    letterSpacing: 1.2,
  },

  pulseContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  markerEmoji: {
    fontSize: 16,
  },

  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 30,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 20,
  },

  distanceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  distanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  distanceCopy: {
    flex: 1,
  },
  sheetEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1.4,
  },
  distanceValue: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 2,
  },
  routeCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  routeRail: {
    width: 18,
    alignItems: 'center',
    paddingVertical: 3,
  },
  routeNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNodeCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeRailLine: {
    flex: 1,
    width: 1,
    minHeight: 34,
    backgroundColor: 'rgba(0,229,255,0.34)',
  },
  routeStops: {
    flex: 1,
    gap: 16,
  },
  routeStop: {
    minHeight: 34,
    justifyContent: 'center',
  },
  routeStopLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  routeStopValue: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 3,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnInner: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

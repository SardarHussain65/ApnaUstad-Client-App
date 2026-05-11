import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
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
import { MAPTILER_API_KEY } from '../constants/Config';
import {
  calculateDistance,
  calculateETA,
  getRouteFromOSRM,
  formatDistanceKm,
} from '../utils/mapUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, Camera, GeoJSONSource, Layer, Marker, type CameraRef } from '@maplibre/maplibre-react-native';

const COLORS = {
  bg: '#0A0E1A',
  surface: '#111827',
  surfaceLight: '#1A2235',
  border: 'rgba(255,255,255,0.07)',
  cyan: '#00E5FF',
  cyanDim: 'rgba(0,229,255,0.15)',
  purple: '#BF5AF2',
  purpleDim: 'rgba(191,90,242,0.15)',
  orange: '#FF6B35',
  text: '#F0F4FF',
  textMuted: '#6B7A9F',
  white: '#FFFFFF',
};

type LocationType = { latitude: number; longitude: number };

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
  }, []);

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

function StatChip({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.statChip, { borderColor: color + '33' }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View>
        <Text style={[styles.statValue, { color: COLORS.text }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function JobTrackingScreen() {
  const router = useRouter();
  const { bookingId, customerId, latitude, longitude, address } = useLocalSearchParams();
  const { role } = useAuth();
  const isWorker = role === 'worker';

  const sheetAnim = useRef(new Animated.Value(120)).current;
  const headerAnim = useRef(new Animated.Value(-80)).current;
  const mapRef = useRef<Map>(null);
  const cameraRef = useRef<CameraRef>(null);

  const [mapReady, setMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationType | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const customerLocation: LocationType = {
    latitude: parseFloat(latitude as string) || 24.8607,
    longitude: parseFloat(longitude as string) || 67.0011,
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sheetAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring(headerAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

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
          const etaMins = Math.round((result.durationSeconds * 1.4) / 60);
          setRouteDistance(distStr);
          setEta(etaMins);
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
  }, []);

  useEffect(() => {
    if (!mapReady || !currentLocation) return;
    drawRouteBetween(currentLocation, customerLocation);
  }, [mapReady, currentLocation]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;
    const startTracking = async () => {
      if (isWorker && hasPermission && bookingId && customerId) {
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
              customerId,
              latitude: loc.latitude,
              longitude: loc.longitude,
            });
            drawRouteBetween(loc, customerLocation);
          }
        );
      }
    };
    startTracking();
    return () => { if (locationSubscription) locationSubscription.remove(); };
  }, [isWorker, hasPermission, bookingId, customerId]);

  useEffect(() => {
    if (isWorker) return;
    const unsubscribe = socketService.on('worker:location', (data: any) => {
      if (data.bookingId !== bookingId) return;
      const newPartnerLoc: LocationType = { latitude: data.latitude, longitude: data.longitude };
      setPartnerLocation(newPartnerLoc);
      const dist = calculateDistance(newPartnerLoc, customerLocation);
      setEta(Math.round(calculateETA(dist)));
      setRouteDistance(formatDistanceKm(dist));
      drawRouteBetween(newPartnerLoc, customerLocation);
    });
    return () => unsubscribe();
  }, [isWorker, bookingId, customerLocation]);

  const distDisplay = isLoadingRoute ? '...' : (routeDistance ?? '—');
  const etaDisplay = isLoadingRoute ? '...' : (eta ? `${eta} min` : '—');

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
        ref={mapRef}
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
          center={[customerLocation.longitude, customerLocation.latitude]}
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

        <Marker id="customer" lngLat={[customerLocation.longitude, customerLocation.latitude]}>
          <View style={[styles.marker, { backgroundColor: COLORS.cyan }]}>
            <Text style={styles.markerEmoji}>📍</Text>
          </View>
        </Marker>

        {currentLocation && (
          <Marker id="worker" lngLat={[currentLocation.longitude, currentLocation.latitude]}>
            <View style={[styles.marker, { backgroundColor: COLORS.purple }]}>
              <Text style={styles.markerEmoji}>🔧</Text>
            </View>
          </Marker>
        )}

        {partnerLocation && (
          <Marker id="partner" lngLat={[partnerLocation.longitude, partnerLocation.latitude]}>
            <View style={[styles.marker, { backgroundColor: COLORS.orange }]}>
              <Text style={styles.markerEmoji}>👷</Text>
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
          </TouchableOpacity>

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

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isWorker ? COLORS.purple : COLORS.cyan }]} />
          <Text style={styles.statusTitle}>
            {isWorker ? 'Heading to Client' : 'Worker En Route'}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>ON THE WAY</Text>
          </View>
        </View>

        {address ? (
          <View style={styles.addressRow}>
            <View style={[styles.addressIcon, { backgroundColor: COLORS.cyanDim }]}>
              <Ionicons name="location" size={14} color={COLORS.cyan} />
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              {address as string}
            </Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatChip
            icon="navigate-outline"
            value={distDisplay}
            label="Distance"
            color={COLORS.cyan}
          />
          <View style={styles.statsSeparator} />
          <StatChip
            icon="time-outline"
            value={etaDisplay}
            label="ETA"
            color={COLORS.purple}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <LinearGradient
              colors={[COLORS.cyanDim, 'rgba(0,229,255,0.05)']}
              style={styles.actionBtnInner}
            >
              <Ionicons name="call" size={22} color={COLORS.cyan} />
              <Text style={[styles.actionLabel, { color: COLORS.cyan }]}>Call</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <LinearGradient
              colors={[COLORS.purpleDim, 'rgba(191,90,242,0.05)']}
              style={styles.actionBtnInner}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color={COLORS.purple} />
              <Text style={[styles.actionLabel, { color: COLORS.purple }]}>Chat</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <LinearGradient
              colors={['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)']}
              style={styles.actionBtnInner}
            >
              <Ionicons name="share-social" size={22} color={COLORS.orange} />
              <Text style={[styles.actionLabel, { color: COLORS.orange }]}>Share</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isWorker && (
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => {
              if (currentLocation) {
                const url = `maps://?daddr=${customerLocation.latitude},${customerLocation.longitude}`;
                Linking.openURL(url).catch(() => {
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${customerLocation.latitude},${customerLocation.longitude}`
                  );
                });
              }
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#00E5FF', '#0099BB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.navigateBtnGradient}
            >
              <Ionicons name="navigate" size={20} color={COLORS.bg} />
              <Text style={styles.navigateBtnText}>Start Navigation</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
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

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  statusBadge: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.cyan,
    letterSpacing: 1.5,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addressIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  statsSeparator: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnInner: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  navigateBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  navigateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  navigateBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.bg,
    letterSpacing: 0.3,
  },
});
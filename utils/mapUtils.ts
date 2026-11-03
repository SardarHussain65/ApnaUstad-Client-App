import { MAPTILER_API_KEY } from '../constants/Config';

export type Location = {
  latitude: number;
  longitude: number;
};

export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371e3;
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateETA(distanceInMeters: number, avgSpeedKmh: number = 30): number {
  const distanceKm = distanceInMeters / 1000;
  const hours = distanceKm / avgSpeedKmh;
  return hours * 60;
}

export type RouteResult = {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

/**
 * Fetches turn-by-turn driving route between two points.
 * Tries the SLA-backed MapTiler Navigation API first; falls back to OSRM if unreachable.
 */
export async function getRouteFromOSRM(
  start: Location,
  end: Location
): Promise<RouteResult | null> {
  const coordsQuery = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;

  // 1. Try MapTiler Directions API (High availability, no rate-limiting)
  if (MAPTILER_API_KEY) {
    try {
      const maptilerUrl = `https://api.maptiler.com/navigation/v1/driving/${coordsQuery}.json?key=${MAPTILER_API_KEY}&geometries=geojson&overview=full`;
      const response = await fetch(maptilerUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coords: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          return {
            coords,
            distanceMeters: route.distance,
            durationSeconds: route.duration,
          };
        }
      }
    } catch (maptilerError) {
      console.warn('MapTiler routing fallback triggered:', maptilerError);
    }
  }

  // 2. Fallback to public OSRM server if MapTiler fails
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;
    const response = await fetch(osrmUrl);
    const data = await response.json();
    if (data.routes && data.routes[0]) {
      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );
      return {
        coords,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
      };
    }
  } catch (osrmError) {
    console.error('OSRM routing error:', osrmError);
  }

  // 3. Fallback: Straight line distance estimate if network routing fails
  const dist = calculateDistance(start, end);
  return {
    coords: [
      [start.latitude, start.longitude],
      [end.latitude, end.longitude],
    ],
    distanceMeters: dist,
    durationSeconds: Math.round((dist / 1000 / 30) * 3600),
  };
}

export function formatDistanceKm(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
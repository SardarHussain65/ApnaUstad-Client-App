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

export async function getRouteFromOSRM(
  start: Location,
  end: Location
): Promise<RouteResult | null> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`
    );
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
    return null;
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
}

export function formatDistanceKm(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';

export interface UserLocation {
  city: string;
  country: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

let cachedUserLocation: UserLocation | null = null;

export function getCachedUserLocation(): UserLocation | null {
  if (cachedUserLocation?.address) {
    return {
      ...cachedUserLocation,
      address: cleanAddressString(cachedUserLocation.address),
    };
  }
  return cachedUserLocation;
}

export function setCachedUserLocation(loc: UserLocation | null) {
  cachedUserLocation = loc
    ? {
        ...loc,
        address: loc.address ? cleanAddressString(loc.address) : loc.address,
      }
    : null;
}

export function useUserLocation() {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>(() => getCachedUserLocation());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLocation = (next: UserLocation) => {
    const cleanedNext: UserLocation = {
      ...next,
      address: next.address ? cleanAddressString(next.address) : next.address,
    };
    cachedUserLocation = cleanedNext;
    setLocation(cleanedNext);
  };

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const fallbackLocation = async () => {
          if (user?.location?.coordinates) {
            const [longitude, latitude] = user.location.coordinates;
            const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (reverseGeocode && reverseGeocode.length > 0) {
              const geo = reverseGeocode[0];
              return {
                city: geo.city || extractCityFromAddress(user.address || '') || 'Unknown',
                country: geo.country || 'Pakistan',
                address: formatAddress(geo) || user.address,
                latitude,
                longitude,
              };
            }

            return {
              city: extractCityFromAddress(user.address || '') || 'Unknown',
              country: 'Pakistan',
              address: user.address,
              latitude,
              longitude,
            };
          }

          if (user?.address) {
            return {
              address: user.address,
              city: extractCityFromAddress(user.address),
              country: 'Pakistan',
            };
          }

          return {
            city: 'Your Location',
            country: 'Pakistan',
          };
        };

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          updateLocation(await fallbackLocation());
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = currentLocation.coords;

        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const geo = reverseGeocode[0];
          updateLocation({
            city: geo.city || 'Unknown',
            country: geo.country || 'Pakistan',
            address: formatAddress(geo) || `${geo.city || 'Current Location'}, ${geo.country || 'Pakistan'}`,
            latitude,
            longitude,
          });
        } else {
          updateLocation({
            city: 'Unknown',
            country: 'Pakistan',
            latitude,
            longitude,
          });
        }
      } catch (err) {
        console.error('Error getting user location:', err);
        setError(err instanceof Error ? err.message : 'Failed to get location');
        if (user?.address) {
          updateLocation({
            city: extractCityFromAddress(user.address),
            country: 'Pakistan',
            address: user.address,
            latitude: user.location?.coordinates?.[1],
            longitude: user.location?.coordinates?.[0],
          });
        } else {
          updateLocation({
            city: 'Your Location',
            country: 'Pakistan',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    getUserLocation();
  }, [user]);

  return { location, isLoading, error };
}

// Helper function to extract city from address string
export function extractCityFromAddress(address: string): string {
  // If address contains a comma, take the part after the last comma
  const parts = address.split(',').map(p => p.trim());
  return parts[parts.length - 1] || address;
}

export function cleanAddressString(raw?: string | null): string {
  if (!raw) return '';
  const cleaned = raw
    .replace(/\b[A-Z0-9]{4,}\+[A-Z0-9]{2,}\b,?\s*/gi, '')
    .replace(/\b-?\d+\.\d{3,}\b,?\s*/g, '')
    .replace(/^,\s*|\s*,\s*,/g, ', ')
    .replace(/^,\s*/, '')
    .trim();
  return cleaned || raw;
}

export function formatAddress(geo: Location.LocationGeocodedAddress): string {
  const parts = [
    geo.name,
    geo.street,
    geo.district || (geo.subregion && geo.subregion !== geo.city ? geo.subregion : null),
    geo.city,
  ].filter(Boolean) as string[];

  const seen = new Set<string>();
  const uniqueParts = parts.filter((part) => {
    const trimmed = String(part).trim();
    if (!trimmed) return false;
    // Skip raw Plus Codes (e.g., J3VF+58G) and raw decimal coordinates (e.g., 73.0733380)
    if (/^[A-Z0-9]{4,}\+[A-Z0-9]{2,}$/i.test(trimmed)) return false;
    if (/^-?\d+\.\d{3,}$/.test(trimmed)) return false;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  return cleanAddressString(uniqueParts.join(', '));
}

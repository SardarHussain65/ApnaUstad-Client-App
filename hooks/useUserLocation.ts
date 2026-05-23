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

export function useUserLocation() {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setLocation(await fallbackLocation());
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = currentLocation.coords;

        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const geo = reverseGeocode[0];
          setLocation({
            city: geo.city || 'Unknown',
            country: geo.country || 'Pakistan',
            address: formatAddress(geo) || `${geo.city || 'Current Location'}, ${geo.country || 'Pakistan'}`,
            latitude,
            longitude,
          });
        } else {
          setLocation({
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
          setLocation({
            city: extractCityFromAddress(user.address),
            country: 'Pakistan',
            address: user.address,
            latitude: user.location?.coordinates?.[1],
            longitude: user.location?.coordinates?.[0],
          });
        } else {
          setLocation({
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
function extractCityFromAddress(address: string): string {
  // If address contains a comma, take the part after the last comma
  const parts = address.split(',').map(p => p.trim());
  return parts[parts.length - 1] || address;
}

function formatAddress(geo: Location.LocationGeocodedAddress): string {
  return [
    geo.name,
    geo.street,
    geo.district,
    geo.city,
  ].filter(Boolean).join(', ');
}

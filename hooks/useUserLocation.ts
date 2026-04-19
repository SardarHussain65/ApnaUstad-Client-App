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

        // First, try to use address from user profile
        if (user?.address) {
          setLocation({
            address: user.address,
            city: extractCityFromAddress(user.address),
            country: 'Pakistan', // Default, could be extracted from address
            latitude: user.location?.coordinates[1],
            longitude: user.location?.coordinates[0],
          });
          return;
        }

        // If no address, try to get current location
        if (user?.location?.coordinates) {
          const [longitude, latitude] = user.location.coordinates;
          
          // Try to reverse geocode to get address
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });

          if (reverseGeocode && reverseGeocode.length > 0) {
            const geo = reverseGeocode[0];
            setLocation({
              city: geo.city || 'Unknown',
              country: geo.country || 'Pakistan',
              address: geo.name || `${geo.city}, ${geo.country}`,
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
          return;
        }

        // Last resort: request device location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setLocation({
            city: 'Your Location',
            country: 'Pakistan',
          });
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = currentLocation.coords;

        // Reverse geocode
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const geo = reverseGeocode[0];
          setLocation({
            city: geo.city || 'Unknown',
            country: geo.country || 'Pakistan',
            address: geo.name || `${geo.city}, ${geo.country}`,
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
        setLocation({
          city: 'Your Location',
          country: 'Pakistan',
        });
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

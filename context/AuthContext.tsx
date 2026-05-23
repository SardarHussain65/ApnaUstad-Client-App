import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../services/socketService';
import api from '../services/api';
import { getPushToken } from '../services/notificationService';
import { BASE_URL } from '../constants/Config';

export type UserRole = 'client' | 'worker' | null;

export interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  profileImage?: string;
  address?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
}

export interface WorkerProfile extends UserProfile {
  category: string;
  averageRating: number;
  hourlyRate: number;
  isAvailable: boolean;
  totalBookings: number;
}

interface AuthContextType {
  role: UserRole;
  user: UserProfile | WorkerProfile | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (token: string, refreshToken: string, role: UserRole, user: any) => Promise<void>;
  setRole: (role: UserRole) => void;
  updateUser: (user: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(null);
  const [user, setUserState] = useState<UserProfile | WorkerProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guard flag to prevent logout() from being called recursively.
  // The Axios 401 interceptor emits 'auth:logout', which would re-trigger logout()
  // while it is still running — causing an infinite API call loop.
  const isLoggingOutRef = useRef(false);

  // Keep a ref to the current token so logout() can read it synchronously
  // without going through AsyncStorage (which may already be cleared).
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [savedRole, savedToken, savedRefreshToken, savedUser] = await Promise.all([
          AsyncStorage.getItem('user_role'),
          AsyncStorage.getItem('user_token'),
          AsyncStorage.getItem('refresh_token'),
          AsyncStorage.getItem('user_data')
        ]);

        if (savedRole) setRoleState(savedRole as UserRole);
        if (savedToken) {
          setTokenState(savedToken);
          socketService.connect(savedToken);
        }
        if (savedRefreshToken) setRefreshTokenState(savedRefreshToken);
        if (savedUser) setUserState(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('auth:logout', () => {
      // If logout() is already running, the interceptor's emit must not restart it.
      if (isLoggingOutRef.current) return;
      logout();
    });

    return () => subscription.remove();
  }, []);

  const setAuth = async (token: string, refreshToken: string, role: UserRole, user: any) => {
    try {
      // Validate tokens before saving
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid access token');
      }
      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new Error('Invalid refresh token');
      }

      // ⚠️  IMPORTANT: Write to AsyncStorage FIRST before updating React state.
      // The usePushNotifications hook's effect fires synchronously when state changes.
      // Its API call uses an interceptor that reads the token from AsyncStorage.
      // If we update state before the write completes, the interceptor picks up the
      // OLD token → backend decodes old JWT → push token gets saved under the wrong userId.
      const storageOps = [
        AsyncStorage.setItem('user_token', token),
        AsyncStorage.setItem('refresh_token', refreshToken),
        AsyncStorage.setItem('user_role', role || '')
      ];

      if (user) {
        storageOps.push(AsyncStorage.setItem('user_data', JSON.stringify(user)));
      }

      await Promise.all(storageOps);

      // Now it is safe to update React state — AsyncStorage already has the new token.
      setTokenState(token);
      setRefreshTokenState(refreshToken);
      setRoleState(role);
      setUserState(user);

      socketService.connect(token);
      console.log('Auth state saved successfully');
    } catch (error) {
      console.error('Error saving auth state:', error);
      // Reset state if save failed
      setTokenState(null);
      setRefreshTokenState(null);
      throw error;
    }
  };

  const updateUser = async (user: any) => {
    try {
      setUserState(user);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  const logout = async () => {
    // Prevent concurrent / recursive logout calls.
    // Without this guard the Axios 401 interceptor (triggered by the remove-token
    // request below) emits 'auth:logout' and calls logout() again endlessly.
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      // Deactivate this device's push token BEFORE clearing local state.
      // Use native fetch (not the Axios instance) so the 401 interceptor cannot
      // intercept this call and re-trigger the logout cycle.
      const currentToken = tokenRef.current;
      if (currentToken) {
        try {
          const pushToken = await getPushToken();
          if (pushToken) {
            await fetch(`${BASE_URL}/api/v1/notifications/remove-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentToken}`,
              },
              body: JSON.stringify({ pushToken }),
            });
          }
        } catch (tokenErr) {
          // Non-fatal: even if this fails the local session is still cleared
          console.warn('Could not deactivate push token on logout:', tokenErr);
        }
      }

      setTokenState(null);
      setRefreshTokenState(null);
      setRoleState(null);
      setUserState(null);
      socketService.disconnect();
      await Promise.all([
        AsyncStorage.removeItem('user_token'),
        AsyncStorage.removeItem('refresh_token'),
        AsyncStorage.removeItem('user_role'),
        AsyncStorage.removeItem('user_data')
      ]);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ role, user, token, refreshToken, isLoading, setAuth, setRole: setRoleState, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


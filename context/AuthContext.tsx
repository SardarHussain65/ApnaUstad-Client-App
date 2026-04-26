import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../services/socketService';

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
      logout();
    });

    return () => subscription.remove();
  }, []);

  const setAuth = async (token: string, refreshToken: string, role: UserRole, user: any) => {
    try {
      setTokenState(token);
      setRefreshTokenState(refreshToken);
      setRoleState(role);
      setUserState(user);

      socketService.connect(token);

      await Promise.all([
        AsyncStorage.setItem('user_token', token),
        AsyncStorage.setItem('refresh_token', refreshToken),
        AsyncStorage.setItem('user_role', role || ''),
        user ? AsyncStorage.setItem('user_data', JSON.stringify(user)) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error saving auth state:', error);
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
    try {
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

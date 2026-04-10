import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserRole = 'client' | 'worker' | null;

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => Promise<void>;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load role from storage on mount
    const loadRole = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('user_role');
        if (savedRole === 'client' || savedRole === 'worker') {
          setRoleState(savedRole);
        }
      } catch (error) {
        console.error('Error loading role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRole();
  }, []);

  const setRole = async (newRole: UserRole) => {
    try {
      setRoleState(newRole);
      if (newRole) {
        await AsyncStorage.setItem('user_role', newRole);
      } else {
        await AsyncStorage.removeItem('user_role');
      }
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const logout = async () => {
    try {
      setRoleState(null);
      await AsyncStorage.removeItem('user_role');
      // Add other logout logic here (e.g. Firebase signout)
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ role, setRole, isLoading, logout }}>
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

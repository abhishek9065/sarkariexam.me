'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logout as apiLogout } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await getMe();
        if (res?.data?.user) {
          setUser(res.data.user);
        }
      } catch (e) {
        console.error('Auth verification failed', e);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    setShowAuthModal(false);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.error('Logout error', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, showAuthModal, setShowAuthModal }}>
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

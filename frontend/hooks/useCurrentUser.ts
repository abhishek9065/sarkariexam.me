'use client';

import { useCallback, useEffect, useState } from 'react';
import { resolvePublicApiBase } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

function readCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBase = resolvePublicApiBase();

  const checkUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBase}/auth/me`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const { data } = await response.json();
        setUser(data.user);
        setError(null);
      } else {
        setUser(null);
        setError(null); // Not logged in is not an error
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const logout = async () => {
    try {
      let csrfToken = readCookieValue('csrf_token');

      if (!csrfToken) {
        const csrfResponse = await fetch(`${apiBase}/auth/csrf`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (csrfResponse.ok) {
          const payload = await csrfResponse.json().catch(() => null);
          csrfToken = payload?.data?.csrfToken ?? readCookieValue('csrf_token');
        }
      }

      const response = await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Failed to logout:', err);
      setError(err instanceof Error ? err.message : 'Failed to logout');
    }
  };

  return { 
    user, 
    isLoading, 
    error, 
    isAdmin: user?.role === 'admin',
    isLoggedIn: !!user,
    logout,
    refetch: checkUser
  };
}

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, getAuthToken, setAuthToken } from '@/lib/api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  roles: string[];
  isCollectionPublic?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, isCollectionPublic?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  claimAdmin: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient<{ data: User }>('/auth/me');
      setUser(response.data);
    } catch {
      // Try refresh
      try {
        const refreshRes = await apiClient<{ data: { user: User; accessToken: string } }>('/auth/refresh', {
          method: 'POST',
        });
        setAuthToken(refreshRes.data.accessToken);
        setUser(refreshRes.data.user);
      } catch {
        setAuthToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient<{ data: { user: User; accessToken: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.data.accessToken);
    queryClient.clear();
    setUser(response.data.user);
  };

  const register = async (name: string, email: string, password: string, isCollectionPublic = true) => {
    const response = await apiClient<{ data: { user: User; accessToken: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, isCollectionPublic }),
    });
    setAuthToken(response.data.accessToken);
    queryClient.clear();
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Falha na chamada de logout no servidor:', err);
    } finally {
      setAuthToken(null);
      queryClient.clear();
      setUser(null);
    }
  };

  const claimAdmin = async () => {
    await apiClient('/admin/claim-admin', { method: 'POST' });
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        claimAdmin,
        refreshUser: fetchCurrentUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

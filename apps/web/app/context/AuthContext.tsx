'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
  setTokenAndFetchUser: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = Cookies.get('token') || localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (authToken: string, userData: User) => {
    setToken(authToken);
    setUser(userData);
    Cookies.set('token', authToken, { expires: 7 });
    localStorage.setItem('token', authToken);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    });
    saveSession(response.data.accessToken, response.data.user);
    router.push('/');
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await api.post<{ accessToken: string; user: User }>('/auth/signup', {
      name,
      email,
      password,
    });
    saveSession(response.data.accessToken, response.data.user);
    router.push('/');
  };

  const loginWithGoogle = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${backendUrl}/auth/google`;
  };

  const setTokenAndFetchUser = async (authToken: string) => {
    setToken(authToken);
    Cookies.set('token', authToken, { expires: 7 });
    localStorage.setItem('token', authToken);
    await fetchCurrentUser(authToken);
    router.push('/');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    Cookies.remove('token');
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        setTokenAndFetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

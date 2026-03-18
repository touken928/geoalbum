import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { apiClient } from '../services/api';
import { useAuthStorage } from '../hooks/useAuthStorage';
import { AuthContext } from './authContext';

interface AuthProviderProps {
  children: ReactNode;
}

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    const currentTime = Date.now() / 1000;
    return typeof payload.exp === 'number' ? payload.exp < currentTime : true;
  } catch {
    return true;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getAuthData, setAuthData, clearAuthData } = useAuthStorage();

  useEffect(() => {
    const authData = getAuthData();
    if (authData && !isTokenExpired(authData.token)) {
      setToken(authData.token);
      setUser(authData.user);
      apiClient.setToken(authData.token);
    } else if (authData) {
      clearAuthData();
    }
    setIsLoading(false);
  }, [getAuthData, clearAuthData]);

  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      if (isTokenExpired(token)) {
        setToken(null);
        setUser(null);
        apiClient.setToken(null);
        clearAuthData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [token, clearAuthData]);

  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.login({ username, password });
      setToken(response.token);
      setUser(response.user);
      apiClient.setToken(response.token);
      setAuthData(response.token, response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.register({ username, password });
      setToken(response.token);
      setUser(response.user);
      apiClient.setToken(response.token);
      setAuthData(response.token, response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    apiClient.setToken(null);
    clearAuthData();
  };

  const value: AuthContextType = useMemo(
    () => ({
      user,
      token,
      login,
      register,
      logout,
      isAuthenticated: !!token && !!user,
      isLoading,
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


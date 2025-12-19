import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { apiClient } from '../services/api';
import { useAuthStorage } from '../hooks/useAuthStorage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getAuthData, setAuthData, clearAuthData } = useAuthStorage();

  // Function to check if JWT token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return true; // Consider invalid tokens as expired
    }
  };

  useEffect(() => {
    // Check for existing token on app initialization
    const authData = getAuthData();

    if (authData) {
      try {
        // Check if token is expired
        if (isTokenExpired(authData.token)) {
          console.log('Stored token is expired, clearing auth data');
          clearAuthData();
        } else {
          setToken(authData.token);
          setUser(authData.user);
          apiClient.setToken(authData.token);
        }
      } catch (error) {
        console.error('Error processing stored auth data:', error);
        clearAuthData();
      }
    }
    
    setIsLoading(false);
  }, [getAuthData, clearAuthData]);

  // Set up periodic token validation
  useEffect(() => {
    if (!token) return;

    const checkTokenValidity = () => {
      if (isTokenExpired(token)) {
        handleTokenExpiration();
      }
    };

    // Check token validity every 5 minutes
    const intervalId = setInterval(checkTokenValidity, 5 * 60 * 1000);

    // Cleanup interval on unmount or token change
    return () => clearInterval(intervalId);
  }, [token]);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiClient.login({ username, password });
      
      setToken(response.token);
      setUser(response.user);
      apiClient.setToken(response.token);
      
      // Store both token and user data for auto-login
      setAuthData(response.token, response.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiClient.register({ username, password });
      
      setToken(response.token);
      setUser(response.user);
      apiClient.setToken(response.token);
      
      // Store both token and user data for auto-login
      setAuthData(response.token, response.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    apiClient.setToken(null);
    
    // Clear stored data
    clearAuthData();
  };

  // Function to handle automatic logout when token expires
  const handleTokenExpiration = (): void => {
    console.log('Token expired, logging out user');
    logout();
  };

  const isAuthenticated = !!token && !!user;

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Additional custom hooks for specific authentication needs
export const useAuthUser = () => {
  const { user } = useAuth();
  return user;
};

export const useAuthToken = () => {
  const { token } = useAuth();
  return token;
};

export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};
import { useCallback } from 'react';
import type { User } from '../types';

/**
 * Custom hook for managing authentication data in localStorage
 */
export const useAuthStorage = () => {
  const setAuthData = useCallback((token: string, user: User) => {
    try {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }, []);

  const getAuthData = useCallback(() => {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      
      if (!token || !userStr) {
        return null;
      }

      const user = JSON.parse(userStr);
      return { token, user };
    } catch (error) {
      console.error('Error retrieving auth data:', error);
      return null;
    }
  }, []);

  const clearAuthData = useCallback(() => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }, []);

  const hasAuthData = useCallback(() => {
    return !!(localStorage.getItem('auth_token') && localStorage.getItem('auth_user'));
  }, []);

  return {
    setAuthData,
    getAuthData,
    clearAuthData,
    hasAuthData,
  };
};
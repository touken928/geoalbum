import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  timestamp: Date;
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number; // in milliseconds
}

interface ErrorContextType {
  errors: AppError[];
  addError: (message: string, type?: AppError['type'], options?: Partial<AppError>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((
    message: string,
    type: AppError['type'] = 'error',
    options: Partial<AppError> = {}
  ) => {
    const error: AppError = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date(),
      dismissible: true,
      autoHide: type === 'success' || type === 'info',
      duration: type === 'success' ? 3000 : type === 'info' ? 5000 : undefined,
      ...options,
    };

    setErrors(prev => [...prev, error]);

    // Auto-hide if specified
    if (error.autoHide && error.duration) {
      setTimeout(() => {
        removeError(error.id);
      }, error.duration);
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError, clearErrors }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
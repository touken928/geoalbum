import React, { useCallback, useMemo, useState } from 'react';
import { ErrorContext, type AppError, type ErrorProviderProps } from './errorContext';

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const addError = useCallback((
    message: string,
    type: AppError['type'] = 'error',
    options: Partial<AppError> = {}
  ) => {
    const error: AppError = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      message,
      type,
      timestamp: new Date(),
      dismissible: true,
      autoHide: type === 'success' || type === 'info',
      duration: type === 'success' ? 3000 : type === 'info' ? 5000 : undefined,
      ...options,
    };

    setErrors(prev => [...prev, error]);

    if (error.autoHide && error.duration) {
      window.setTimeout(() => {
        removeError(error.id);
      }, error.duration);
    }
  }, [removeError]);

  const value = useMemo(
    () => ({ errors, addError, removeError, clearErrors }),
    [errors, addError, removeError, clearErrors]
  );

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};


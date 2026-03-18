import { createContext } from 'react';
import type { ReactNode } from 'react';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  timestamp: Date;
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number;
}

export interface ErrorContextType {
  errors: AppError[];
  addError: (message: string, type?: AppError['type'], options?: Partial<AppError>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

export const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export interface ErrorProviderProps {
  children: ReactNode;
}


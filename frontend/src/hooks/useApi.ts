import { useState, useEffect, useCallback } from 'react';
import { useError } from '../contexts/ErrorContext';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  showErrorToast?: boolean;
}

/**
 * Custom hook for API calls with loading and error states
 */
export const useApi = <T>(
  apiFunction: () => Promise<T>,
  options: UseApiOptions = { immediate: true, showErrorToast: true }
) => {
  const { addError } = useError();
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiFunction();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发生了未知错误';
      setState({ data: null, loading: false, error: errorMessage });
      
      // Show error toast if enabled
      if (options.showErrorToast) {
        addError(errorMessage, 'error');
      }
      
      throw error;
    }
  }, [apiFunction, addError, options.showErrorToast]);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [execute, options.immediate]);

  return {
    ...state,
    execute,
    refetch: execute,
  };
};

interface UseMutationOptions {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

/**
 * Custom hook for API mutations (POST, PUT, DELETE)
 */
export const useMutation = <TData, TVariables = void>(
  mutationFunction: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions = { showErrorToast: true, showSuccessToast: false }
) => {
  const { addError } = useError();
  const [state, setState] = useState<UseApiState<TData>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await mutationFunction(variables);
      setState({ data: result, loading: false, error: null });
      
      // Show success toast if enabled
      if (options.showSuccessToast) {
        addError(options.successMessage || '操作成功', 'success');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发生了未知错误';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      // Show error toast if enabled
      if (options.showErrorToast) {
        addError(errorMessage, 'error');
      }
      
      throw error;
    }
  }, [mutationFunction, addError, options.showErrorToast, options.showSuccessToast, options.successMessage]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
};
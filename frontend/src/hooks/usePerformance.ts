import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface UsePerformanceOptions {
  logToConsole?: boolean;
  threshold?: number; // Log warning if operation takes longer than this (ms)
}

/**
 * Hook for measuring and monitoring performance of operations
 */
export const usePerformance = (
  operationName: string,
  options: UsePerformanceOptions = {}
) => {
  const { logToConsole = import.meta.env.DEV, threshold = 2000 } = options;
  const metricsRef = useRef<Map<string, PerformanceMetrics>>(new Map());

  const startMeasure = useCallback((measureId: string = 'default') => {
    const startTime = performance.now();
    metricsRef.current.set(measureId, { startTime });
    
    if (logToConsole) {
      console.time(`${operationName}:${measureId}`);
    }
  }, [operationName, logToConsole]);

  const endMeasure = useCallback((measureId: string = 'default') => {
    const metrics = metricsRef.current.get(measureId);
    if (!metrics) {
      console.warn(`No start measurement found for ${operationName}:${measureId}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metrics.startTime;
    
    metricsRef.current.set(measureId, {
      ...metrics,
      endTime,
      duration
    });

    if (logToConsole) {
      console.timeEnd(`${operationName}:${measureId}`);
      
      if (duration > threshold) {
        console.warn(
          `⚠️ Performance warning: ${operationName}:${measureId} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    }

    return duration;
  }, [operationName, logToConsole, threshold]);

  const getMeasure = useCallback((measureId: string = 'default') => {
    return metricsRef.current.get(measureId);
  }, []);

  const clearMeasures = useCallback(() => {
    metricsRef.current.clear();
  }, []);

  return {
    startMeasure,
    endMeasure,
    getMeasure,
    clearMeasures
  };
};

/**
 * Hook for measuring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCountRef = useRef(0);
  const { startMeasure, endMeasure } = usePerformance(`Render:${componentName}`);

  useEffect(() => {
    renderCountRef.current += 1;
    const renderId = `render-${renderCountRef.current}`;
    
    startMeasure(renderId);
    
    // Measure after render is complete
    const timeoutId = setTimeout(() => {
      endMeasure(renderId);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  });

  return {
    renderCount: renderCountRef.current
  };
};

/**
 * Hook for measuring API call performance
 */
export const useApiPerformance = () => {
  const { startMeasure, endMeasure } = usePerformance('API');

  const measureApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    callName: string
  ): Promise<T> => {
    startMeasure(callName);
    
    try {
      const result = await apiCall();
      endMeasure(callName);
      return result;
    } catch (error) {
      endMeasure(callName);
      throw error;
    }
  }, [startMeasure, endMeasure]);

  return { measureApiCall };
};

/**
 * Hook for measuring image loading performance
 */
export const useImagePerformance = () => {
  const { startMeasure, endMeasure } = usePerformance('ImageLoad');

  const measureImageLoad = useCallback((src: string, imageId?: string) => {
    const measureId = imageId || src.split('/').pop() || 'unknown';
    
    startMeasure(measureId);
    
    const img = new Image();
    
    return new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        endMeasure(measureId);
        resolve(img);
      };
      
      img.onerror = () => {
        endMeasure(measureId);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }, [startMeasure, endMeasure]);

  return { measureImageLoad };
};
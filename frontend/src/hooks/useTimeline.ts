import { useState, useCallback, useMemo } from 'react';
import type { Album, TimeRange, TimeGranularity } from '../types';

interface UseTimelineReturn {
  selectedRange: TimeRange;
  granularity: TimeGranularity;
  setSelectedRange: (range: TimeRange) => void;
  setGranularity: (granularity: TimeGranularity) => void;
  getFilteredAlbums: (albums: Album[]) => Album[];
  getFullTimeRange: (albums: Album[]) => TimeRange;
  resetToFullRange: (albums: Album[]) => void;
}

export const useTimeline = (initialGranularity: TimeGranularity = 'month'): UseTimelineReturn => {
  const [granularity, setGranularity] = useState<TimeGranularity>(initialGranularity);
  
  // Default to last month
  const getDefaultRange = (): TimeRange => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);
    return { startDate, endDate };
  };
  
  const [selectedRange, setSelectedRange] = useState<TimeRange>(getDefaultRange());

  // Get the full time range from albums
  const getFullTimeRange = useCallback((albums: Album[]): TimeRange => {
    if (albums.length === 0) {
      const now = new Date();
      return { startDate: now, endDate: now };
    }

    const dates = albums.map(album => new Date(album.created_at));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add some padding to the range
    const padding = (maxDate.getTime() - minDate.getTime()) * 0.05; // 5% padding
    const paddedStart = new Date(minDate.getTime() - padding);
    const paddedEnd = new Date(maxDate.getTime() + padding);

    return { startDate: paddedStart, endDate: paddedEnd };
  }, []);

  // Filter albums based on selected time range
  const getFilteredAlbums = useCallback((albums: Album[]): Album[] => {
    return albums.filter(album => {
      const albumDate = new Date(album.created_at);
      return albumDate >= selectedRange.startDate && albumDate <= selectedRange.endDate;
    });
  }, [selectedRange]);

  // Reset to full range
  const resetToFullRange = useCallback((albums: Album[]) => {
    const fullRange = getFullTimeRange(albums);
    setSelectedRange(fullRange);
  }, [getFullTimeRange]);

  // Memoized range validation
  const validatedRange = useMemo(() => {
    // Ensure start date is before end date
    if (selectedRange.startDate > selectedRange.endDate) {
      return {
        startDate: selectedRange.endDate,
        endDate: selectedRange.startDate,
      };
    }
    return selectedRange;
  }, [selectedRange]);

  // Handle range change with validation
  const handleRangeChange = useCallback((range: TimeRange) => {
    // Validate and normalize the range
    const normalizedRange = {
      startDate: new Date(range.startDate),
      endDate: new Date(range.endDate),
    };

    // Ensure start is before end
    if (normalizedRange.startDate > normalizedRange.endDate) {
      [normalizedRange.startDate, normalizedRange.endDate] = [normalizedRange.endDate, normalizedRange.startDate];
    }

    setSelectedRange(normalizedRange);
  }, []);

  // Handle granularity change
  const handleGranularityChange = useCallback((newGranularity: TimeGranularity) => {
    setGranularity(newGranularity);
  }, []);

  return {
    selectedRange: validatedRange,
    granularity,
    setSelectedRange: handleRangeChange,
    setGranularity: handleGranularityChange,
    getFilteredAlbums,
    getFullTimeRange,
    resetToFullRange,
  };
};

export default useTimeline;
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Album, TimeRange, TimeGranularity } from '../types';

interface TimelineProps {
  albums: Album[];
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  granularity: TimeGranularity;
  onGranularityChange: (granularity: TimeGranularity) => void;
  className?: string;
}

interface TimelineData {
  minDate: Date;
  maxDate: Date;
  albumsByPeriod: Map<string, Album[]>;
  periods: string[];
}

const Timeline: React.FC<TimelineProps> = ({
  albums,
  selectedRange,
  onRangeChange,
  granularity,
  onGranularityChange,
  className = '',
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; startDate: Date; endDate: Date } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // Calculate timeline data based on albums and granularity
  const timelineData = useMemo((): TimelineData => {
    if (albums.length === 0) {
      const now = new Date();
      return {
        minDate: now,
        maxDate: now,
        albumsByPeriod: new Map(),
        periods: [],
      };
    }

    // Find date range
    const dates = albums.map(album => new Date(album.created_at));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Group albums by time period
    const albumsByPeriod = new Map<string, Album[]>();
    const periods: string[] = [];

    // Generate periods based on granularity
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      let periodKey: string;
      let nextPeriod: Date;

      switch (granularity) {
        case 'year':
          periodKey = current.getFullYear().toString();
          nextPeriod = new Date(current.getFullYear() + 1, 0, 1);
          break;
        case 'month':
          periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          nextPeriod = new Date(current.getFullYear(), current.getMonth() + 1, 1);
          break;
        case 'day':
          periodKey = current.toISOString().split('T')[0];
          nextPeriod = new Date(current.getTime() + 24 * 60 * 60 * 1000);
          break;
        default:
          periodKey = current.getFullYear().toString();
          nextPeriod = new Date(current.getFullYear() + 1, 0, 1);
      }

      periods.push(periodKey);
      albumsByPeriod.set(periodKey, []);
      current.setTime(nextPeriod.getTime());
    }

    // Assign albums to periods
    albums.forEach(album => {
      const albumDate = new Date(album.created_at);
      let periodKey: string;

      switch (granularity) {
        case 'year':
          periodKey = albumDate.getFullYear().toString();
          break;
        case 'month':
          periodKey = `${albumDate.getFullYear()}-${String(albumDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'day':
          periodKey = albumDate.toISOString().split('T')[0];
          break;
        default:
          periodKey = albumDate.getFullYear().toString();
      }

      const periodAlbums = albumsByPeriod.get(periodKey) || [];
      periodAlbums.push(album);
      albumsByPeriod.set(periodKey, periodAlbums);
    });

    return { minDate, maxDate, albumsByPeriod, periods };
  }, [albums, granularity]);

  // Convert date to timeline position (0-1)
  const dateToPosition = useCallback((date: Date): number => {
    const { minDate, maxDate } = timelineData;
    const totalTime = maxDate.getTime() - minDate.getTime();
    if (totalTime === 0) return 0;
    return Math.max(0, Math.min(1, (date.getTime() - minDate.getTime()) / totalTime));
  }, [timelineData]);

  // Convert timeline position (0-1) to date
  const positionToDate = useCallback((position: number): Date => {
    const { minDate, maxDate } = timelineData;
    const totalTime = maxDate.getTime() - minDate.getTime();
    return new Date(minDate.getTime() + position * totalTime);
  }, [timelineData]);

  // Calculate selected range positions
  const selectedStartPosition = dateToPosition(selectedRange.startDate);
  const selectedEndPosition = dateToPosition(selectedRange.endDate);

  // Handle mouse down for dragging or selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    e.preventDefault();

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x / rect.width;

    // Check if clicking on drag handles
    const startHandlePos = selectedStartPosition * rect.width;
    const endHandlePos = selectedEndPosition * rect.width;
    const handleTolerance = 8; // pixels

    if (Math.abs(x - startHandlePos) <= handleTolerance) {
      // Dragging start handle
      setIsDragging(true);
      setDragStart({
        x,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
      });
      return;
    }

    if (Math.abs(x - endHandlePos) <= handleTolerance) {
      // Dragging end handle
      setIsDragging(true);
      setDragStart({
        x,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
      });
      return;
    }

    if (e.shiftKey) {
      // Start range selection
      setIsSelecting(true);
      setSelectionStart(x);
    } else {
      // Check if clicking within selected range for dragging
      const clickPosition = position;
      if (clickPosition >= selectedStartPosition && clickPosition <= selectedEndPosition) {
        // Start dragging the entire range
        setIsDragging(true);
        setDragStart({
          x,
          startDate: selectedRange.startDate,
          endDate: selectedRange.endDate,
        });
      } else {
        // Start new range selection
        setIsSelecting(true);
        setSelectionStart(x);
      }
    }
  }, [selectedRange, selectedStartPosition, selectedEndPosition, dateToPosition]);

  // Handle mouse move for dragging or selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (isSelecting && selectionStart !== null) {
      // Update selection range
      const startX = Math.min(selectionStart, x);
      const endX = Math.max(selectionStart, x);
      const startPosition = startX / rect.width;
      const endPosition = endX / rect.width;

      const newStartDate = positionToDate(startPosition);
      const newEndDate = positionToDate(endPosition);

      onRangeChange({ startDate: newStartDate, endDate: newEndDate });
    } else if (isDragging && dragStart) {
      // Update drag position
      const deltaX = x - dragStart.x;
      const deltaPosition = deltaX / rect.width;
      const { minDate, maxDate } = timelineData;
      const totalTime = maxDate.getTime() - minDate.getTime();
      const deltaTime = deltaPosition * totalTime;

      const newStartDate = new Date(dragStart.startDate.getTime() + deltaTime);

      // Clamp to timeline bounds
      const rangeDuration = dragStart.endDate.getTime() - dragStart.startDate.getTime();
      const clampedStartDate = new Date(Math.max(minDate.getTime(), Math.min(maxDate.getTime() - rangeDuration, newStartDate.getTime())));
      const clampedEndDate = new Date(clampedStartDate.getTime() + rangeDuration);

      onRangeChange({ startDate: clampedStartDate, endDate: clampedEndDate });
    }
  }, [isDragging, isSelecting, dragStart, selectionStart, onRangeChange, positionToDate, timelineData]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsSelecting(false);
    setDragStart(null);
    setSelectionStart(null);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging || isSelecting) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (timelineRef.current) {
          const syntheticEvent = {
            clientX: e.clientX,
          } as React.MouseEvent;
          handleMouseMove(syntheticEvent);
        }
      };

      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, isSelecting, handleMouseMove, handleMouseUp]);

  // Handle period click
  const handlePeriodClick = useCallback((period: string) => {
    let startDate: Date;
    let endDate: Date;

    switch (granularity) {
      case 'year':
        const year = parseInt(period);
        startDate = new Date(year, 0, 1);
        endDate = new Date(year + 1, 0, 1);
        break;
      case 'month':
        const [yearStr, monthStr] = period.split('-');
        const monthYear = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;
        startDate = new Date(monthYear, month, 1);
        endDate = new Date(monthYear, month + 1, 1);
        break;
      case 'day':
        startDate = new Date(period);
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    onRangeChange({ startDate, endDate });
  }, [granularity, onRangeChange]);

  // Format period label
  const formatPeriodLabel = useCallback((period: string): string => {
    switch (granularity) {
      case 'year':
        return period;
      case 'month':
        const [year, month] = period.split('-');
        return `${year}/${month}`;
      case 'day':
        const date = new Date(period);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      default:
        return period;
    }
  }, [granularity]);

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      {/* Granularity controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">时间粒度:</span>
          <div className="flex space-x-1">
            {(['year', 'month', 'day'] as TimeGranularity[]).map((g) => (
              <button
                key={g}
                onClick={() => onGranularityChange(g)}
                className={`px-3 py-1 text-xs rounded ${
                  granularity === g
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g === 'year' ? '年' : g === 'month' ? '月' : '日'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>
              选中范围: {selectedRange.startDate.toLocaleDateString('zh-CN')} - {selectedRange.endDate.toLocaleDateString('zh-CN')}
            </span>
            <span>
              显示相册: {albums.filter(album => {
                const albumDate = new Date(album.created_at);
                return albumDate >= selectedRange.startDate && albumDate <= selectedRange.endDate;
              }).length} / {albums.length}
            </span>
          </div>
          <button
            onClick={() => {
              const fullRange = {
                startDate: timelineData.minDate,
                endDate: timelineData.maxDate,
              };
              onRangeChange(fullRange);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
          >
            重置范围
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div
          ref={timelineRef}
          className="relative h-16 bg-gray-50 rounded-lg border cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Timeline periods */}
          <div className="absolute inset-0 flex">
            {timelineData.periods.map((period) => {
              const albumCount = timelineData.albumsByPeriod.get(period)?.length || 0;
              const width = `${100 / timelineData.periods.length}%`;
              
              return (
                <div
                  key={period}
                  className="flex-shrink-0 border-r border-gray-200 last:border-r-0 hover:bg-gray-100 transition-colors"
                  style={{ width }}
                  onClick={() => handlePeriodClick(period)}
                >
                  <div className="h-full flex flex-col justify-between p-1">
                    <div className="text-xs text-gray-600 text-center">
                      {formatPeriodLabel(period)}
                    </div>
                    <div className="flex-1 flex items-end justify-center">
                      {albumCount > 0 && (
                        <div
                          className="bg-blue-400 rounded-sm min-w-[2px]"
                          style={{
                            height: `${Math.min(100, (albumCount / Math.max(...Array.from(timelineData.albumsByPeriod.values()).map(albums => albums.length))) * 100)}%`,
                            width: Math.max(2, Math.min(20, albumCount * 2)) + 'px'
                          }}
                        />
                      )}
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                      {albumCount > 0 ? albumCount : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected range overlay */}
          <div
            className="absolute top-0 bottom-0 bg-blue-200 bg-opacity-50 border-l-2 border-r-2 border-blue-400 pointer-events-none"
            style={{
              left: `${selectedStartPosition * 100}%`,
              width: `${(selectedEndPosition - selectedStartPosition) * 100}%`,
            }}
          />

          {/* Drag handles */}
          <div
            className="absolute top-0 bottom-0 w-2 bg-blue-500 cursor-ew-resize opacity-75 hover:opacity-100"
            style={{ left: `${selectedStartPosition * 100}%`, marginLeft: '-4px' }}
          />
          <div
            className="absolute top-0 bottom-0 w-2 bg-blue-500 cursor-ew-resize opacity-75 hover:opacity-100"
            style={{ left: `${selectedEndPosition * 100}%`, marginLeft: '-4px' }}
          />
        </div>

        {/* Instructions */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          点击时间段快速跳转 • 拖拽选中范围移动 • Shift+拖拽选择新范围
        </div>
      </div>
    </div>
  );
};

export default Timeline;
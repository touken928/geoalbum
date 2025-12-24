import React from 'react';
import { Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TimeRange } from '../types';

interface DateRangeFilterProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  selectedRange,
  onRangeChange,
  onReset,
  totalCount,
  filteredCount,
}) => {
  const { t } = useLanguage();
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 10);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      onRangeChange({
        ...selectedRange,
        startDate: newDate,
      });
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      // Set to end of day
      newDate.setHours(23, 59, 59, 999);
      onRangeChange({
        ...selectedRange,
        endDate: newDate,
      });
    }
  };

  return (
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-gray-600">{t('date.startDate')}:</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="date"
          value={formatDateForInput(selectedRange.startDate)}
          onChange={handleStartDateChange}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={formatDateForInput(selectedRange.endDate)}
          onChange={handleEndDateChange}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={onReset}
          className="px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
        >
          {t('date.reset')}
        </button>
      </div>

      <div className="text-gray-500">
        {t('date.showing')} {filteredCount} {t('date.of')} {totalCount} {t('date.albums')}
      </div>
    </div>
  );
};

export default DateRangeFilter;

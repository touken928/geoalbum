import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface CoordinatesDisplayProps {
  lat: number | null;
  lng: number | null;
  className?: string;
}

const CoordinatesDisplay: React.FC<CoordinatesDisplayProps> = ({ lat, lng, className = '' }) => {
  const { t } = useLanguage();

  if (lat === null || lng === null) {
    return null;
  }

  return (
    <div className={`bg-white bg-opacity-90 px-3 py-1.5 rounded shadow-sm text-xs font-mono ${className}`}>
      <span className="text-gray-600">{t('map.coordinates')}: </span>
      <span className="text-gray-900">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </span>
    </div>
  );
};

export default CoordinatesDisplay;

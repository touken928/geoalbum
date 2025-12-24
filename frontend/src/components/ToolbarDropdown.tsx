import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { type MapLayer } from './LayerControl';
import { useLanguage } from '../contexts/LanguageContext';

interface ToolbarDropdownProps {
  currentLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  isCreateMode: boolean;
  onToggleCreateMode: () => void;
  showPaths: boolean;
  onToggleShowPaths: () => void;
  className?: string;
}

const ToolbarDropdown: React.FC<ToolbarDropdownProps> = ({
  currentLayer,
  onLayerChange,
  isCreateMode,
  onToggleCreateMode,
  showPaths,
  onToggleShowPaths,
  className = '',
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLayerToggle = () => {
    onLayerChange(currentLayer === 'vector' ? 'satellite' : 'vector');
    // Don't close if in create mode
    if (!isCreateMode) {
      setIsOpen(false);
    }
  };

  const handlePathsToggle = () => {
    onToggleShowPaths();
    // Don't close if in create mode
    if (!isCreateMode) {
      setIsOpen(false);
    }
  };

  const handleCreateToggle = () => {
    onToggleCreateMode();
    // Only close if canceling create mode
    if (isCreateMode) {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 bg-white"
        title={t('toolbar.tools')}
      >
        <span className="text-gray-700">{t('toolbar.tools')}</span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20 min-w-[160px]">
          {/* Create Album */}
          <button
            onClick={handleCreateToggle}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
              isCreateMode
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{isCreateMode ? t('header.cancelCreate') : t('header.createAlbum')}</span>
            {isCreateMode && <span className="text-red-500">●</span>}
          </button>

          {/* Layer Toggle */}
          <button
            onClick={handleLayerToggle}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            {currentLayer === 'vector' ? t('layer.satellite') : t('layer.vector')}
          </button>

          {/* Show Paths */}
          <button
            onClick={handlePathsToggle}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors border-t border-gray-100 flex items-center justify-between ${
              showPaths
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{t('header.showPaths')}</span>
            {showPaths && <span className="text-blue-500">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolbarDropdown;

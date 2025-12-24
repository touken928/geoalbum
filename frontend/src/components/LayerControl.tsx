import React from 'react';
import { Layers } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type MapLayer = 'vector' | 'satellite';

interface LayerControlProps {
  currentLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  className?: string;
}

const LayerControl: React.FC<LayerControlProps> = ({ currentLayer, onLayerChange, className = '' }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 bg-white"
        title={t('layer.vector')}
      >
        <Layers className="w-4 h-4 text-gray-600" />
        <span className="text-gray-700">
          {currentLayer === 'vector' ? t('layer.vector') : t('layer.satellite')}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded shadow-lg overflow-hidden z-20 min-w-[120px]">
            <button
              onClick={() => {
                onLayerChange('vector');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                currentLayer === 'vector' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
              }`}
            >
              {t('layer.vector')}
            </button>
            <button
              onClick={() => {
                onLayerChange('satellite');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors border-t ${
                currentLayer === 'satellite' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
              }`}
            >
              {t('layer.satellite')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LayerControl;

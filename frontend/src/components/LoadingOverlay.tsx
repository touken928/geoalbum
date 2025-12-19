import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  backdrop?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  message = '加载中...',
  backdrop = true 
}) => {
  if (!isVisible) return null;

  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      ${backdrop ? 'bg-black bg-opacity-50' : ''}
    `}>
      <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center space-y-4 min-w-[200px]">
        <LoadingSpinner size="lg" />
        <p className="text-gray-700 text-center">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
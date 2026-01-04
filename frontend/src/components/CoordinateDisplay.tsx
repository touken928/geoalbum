import React from 'react';

interface CoordinateDisplayProps {
  coordinates: [number, number];
}

const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({ 
  coordinates
}) => {
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        pointerEvents: 'none',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '12px',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <span 
        style={{ 
          color: 'rgb(0, 0, 0)',
          display: 'inline-block',
          fontWeight: 'normal',
          textDecoration: 'none',
          textTransform: 'none',
          letterSpacing: 'normal',
        }}
      >
        {coordinates[0].toFixed(6)}°, {coordinates[1].toFixed(6)}°
      </span>
    </div>
  );
};

export default CoordinateDisplay;
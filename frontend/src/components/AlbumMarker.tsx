import React from 'react';
import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Album } from '../types';

interface AlbumMarkerProps {
  album: Album;
  onClick: (album: Album) => void;
}

// Create custom marker icon with album info
const createAlbumIcon = (album: Album, isMobile: boolean = false): DivIcon => {
  const photoCount = album.photo_count || 0;
  const hasPhotos = photoCount > 0;
  const bgColor = hasPhotos ? '#3b82f6' : '#6b7280';
  const shadowColor = hasPhotos ? 'rgba(59, 130, 246, 0.4)' : 'rgba(107, 114, 128, 0.4)';
  
  // Larger size for mobile devices
  const size = isMobile ? 48 : 36;
  const iconSize = isMobile ? 24 : 18;
  const badgeSize = isMobile ? 22 : 18;
  const badgeFontSize = isMobile ? 12 : 10;
  
  return new DivIcon({
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${bgColor};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 10px ${shadowColor};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
            <path d="M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9l-4 5h12l-3-4-2.03 2.71L10 13zm7-4.5c0-.83-.67-1.5-1.5-1.5S14 7.67 14 8.5s.67 1.5 1.5 1.5S17 9.33 17 8.5zM20 2h-7v2h7v7h2V4c0-1.1-.9-2-2-2zm0 18h-7v2h7c1.1 0 2-.9 2-2v-7h-2v7zM4 13H2v7c0 1.1.9 2 2 2h7v-2H4v-7z"/>
          </svg>
        </div>
        ${photoCount > 0 ? `
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ef4444;
            color: white;
            font-size: ${badgeFontSize}px;
            font-weight: bold;
            min-width: ${badgeSize}px;
            height: ${badgeSize}px;
            border-radius: ${badgeSize / 2}px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 ${isMobile ? 5 : 4}px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">${photoCount}</div>
        ` : ''}
      </div>
    `,
    className: 'custom-album-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const AlbumMarker: React.FC<AlbumMarkerProps> = ({ album, onClick }) => {
  // Detect mobile device
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const customIcon = createAlbumIcon(album, isMobile);

  return (
    <Marker
      position={[album.latitude, album.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onClick(album),
      }}
    />
  );
};

export default AlbumMarker;
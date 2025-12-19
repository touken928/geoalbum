import React from 'react';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { Path, TimeRange } from '../types';

interface PathRendererProps {
  paths: Path[];
  showPaths: boolean;
  selectedTimeRange?: TimeRange;
}

// Calculate the bearing (angle) between two points
const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

// Get points along a line for arrow placement
const getArrowPositions = (
  lat1: number, lng1: number, 
  lat2: number, lng2: number, 
  minArrows: number = 2,
  maxArrows: number = 6
): [number, number][] => {
  const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  const numArrows = Math.min(maxArrows, Math.max(minArrows, Math.round(distance * 8)));
  
  const positions: [number, number][] = [];
  
  for (let i = 1; i <= numArrows; i++) {
    const t = i / (numArrows + 1);
    const lat = lat1 + (lat2 - lat1) * t;
    const lng = lng1 + (lng2 - lng1) * t;
    positions.push([lat, lng]);
  }
  
  return positions;
};

// Check if album is within time range
const isAlbumInTimeRange = (albumDate: string, timeRange?: TimeRange): boolean => {
  if (!timeRange) return true;
  const date = new Date(albumDate);
  return date >= timeRange.startDate && date <= timeRange.endDate;
};

const PathRenderer: React.FC<PathRendererProps> = ({ paths, showPaths, selectedTimeRange }) => {
  if (!showPaths || paths.length === 0) {
    return null;
  }

  return (
    <>
      {paths.map((path) => {
        // Only render if both albums have coordinates
        if (!path.from_album || !path.to_album) {
          return null;
        }

        // Only show path if BOTH endpoints are within the selected time range
        const fromInRange = isAlbumInTimeRange(path.from_album.created_at, selectedTimeRange);
        const toInRange = isAlbumInTimeRange(path.to_album.created_at, selectedTimeRange);
        
        if (!fromInRange || !toInRange) {
          return null;
        }

        const fromPos: [number, number] = [path.from_album.latitude, path.from_album.longitude];
        const toPos: [number, number] = [path.to_album.latitude, path.to_album.longitude];

        // Calculate bearing for arrow rotation
        const bearing = getBearing(
          path.from_album.latitude,
          path.from_album.longitude,
          path.to_album.latitude,
          path.to_album.longitude
        );

        // Get positions for multiple arrows along the path
        const arrowPositions = getArrowPositions(
          path.from_album.latitude,
          path.from_album.longitude,
          path.to_album.latitude,
          path.to_album.longitude
        );

        // Create arrow icon
        const createArrowIcon = (index: number, total: number) => {
          // Fade arrows from start to end
          const opacity = 0.5 + (index / total) * 0.5;
          return new L.DivIcon({
            html: `
              <div style="
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transform: rotate(${bearing - 90}deg);
                opacity: ${opacity};
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#3B82F6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            `,
            className: 'custom-arrow-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
        };

        return (
          <React.Fragment key={path.id}>
            {/* Path line */}
            <Polyline
              positions={[fromPos, toPos]}
              pathOptions={{
                color: '#3B82F6',
                weight: 3,
                opacity: 0.6,
                dashArray: '8, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            
            {/* Multiple arrows along the path */}
            {arrowPositions.map((position, index) => (
              <Marker
                key={`${path.id}-arrow-${index}`}
                position={position}
                icon={createArrowIcon(index, arrowPositions.length)}
                interactive={false}
              />
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default PathRenderer;

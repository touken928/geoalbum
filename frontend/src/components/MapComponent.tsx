import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, ScaleControl } from 'react-leaflet';
import { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './MapComponent.css';
import AlbumMarker from './AlbumMarker';
import PathRenderer from './PathRenderer';
import CoordinatesDisplay from './CoordinatesDisplay';
import type { MapComponentProps, Album } from '../types';
import type { MapLayer } from './LayerControl';



// Fix Leaflet default icon paths for bundlers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Configure default Leaflet icons
L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
});

// Component to handle map click and mouse move events
const MapEventHandler: React.FC<{
  onMapClick: (coordinates: [number, number]) => void;
  onMouseMove: (coordinates: [number, number]) => void;
}> = ({ onMapClick, onMouseMove }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onMapClick([lat, lng]);
    },
    mousemove: (e) => {
      const { lat, lng } = e.latlng;
      onMouseMove([lat, lng]);
    },
  });
  return null;
};

// Component to render all album markers with clustering
// Memoized to prevent re-rendering when parent state changes (e.g., mouse coordinates)
const AlbumMarkers = React.memo<{
  albums: Album[];
  onAlbumClick: (album: Album) => void;
}>(({ albums, onAlbumClick }) => {
  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={(cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
        
        return new L.DivIcon({
          html: `
            <div class="cluster-marker cluster-${size}">
              <div class="cluster-inner">
                <span class="cluster-count">${count}</span>
              </div>
            </div>
          `,
          className: 'custom-cluster-icon',
          iconSize: new L.Point(40, 40),
          iconAnchor: [20, 20],
        });
      }}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
      maxClusterRadius={(zoom: number) => {
        // Dynamic cluster radius based on zoom level
        // Higher zoom = smaller radius = less clustering
        if (zoom <= 5) return 80;
        if (zoom <= 10) return 60;
        if (zoom <= 13) return 40;
        return 20;
      }}
      disableClusteringAtZoom={15}
      spiderfyDistanceMultiplier={1.5}
      removeOutsideVisibleBounds={true}
      animate={true}
      animateAddingMarkers={true}
      spiderfyShapePositions={(count: number, centerPt: L.Point) => {
        // Custom spiderfy positioning for better visual distribution
        const positions: L.Point[] = [];
        const angleStep = (2 * Math.PI) / count;
        const radius = 25 + (count * 2); // Increase radius with more markers
        
        for (let i = 0; i < count; i++) {
          const angle = angleStep * i;
          const x = centerPt.x + Math.cos(angle) * radius;
          const y = centerPt.y + Math.sin(angle) * radius;
          positions.push(new L.Point(x, y));
        }
        
        return positions;
      }}
    >
      {albums.map((album) => (
        <AlbumMarker
          key={album.id}
          album={album}
          onClick={onAlbumClick}
        />
      ))}
    </MarkerClusterGroup>
  );
});

const MapComponent: React.FC<MapComponentProps> = ({
  albums,
  selectedTimeRange,
  onAlbumClick,
  onMapClick,
  showPaths,
  paths,
  isCreateMode = false,
  className = '',
  currentLayer = 'vector',
}) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [hasInitializedView, setHasInitializedView] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<[number, number] | null>(null);
  
  // Use ref to store mouse coordinates to avoid triggering re-renders
  const mouseCoordsRef = useRef<[number, number] | null>(null);
  const updateTimerRef = useRef<number | null>(null);

  // Filter albums based on selected time range
  const filteredAlbums = React.useMemo(() => {
    if (!selectedTimeRange) return albums;
    
    return albums.filter((album) => {
      const albumDate = new Date(album.created_at);
      return albumDate >= selectedTimeRange.startDate && albumDate <= selectedTimeRange.endDate;
    });
  }, [albums, selectedTimeRange]);

  // Calculate map bounds based on albums
  const mapBounds = React.useMemo(() => {
    if (filteredAlbums.length === 0) {
      // Default to world view if no albums
      return undefined;
    }

    const lats = filteredAlbums.map(album => album.latitude);
    const lngs = filteredAlbums.map(album => album.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]];
  }, [filteredAlbums]);

  // Only fit map to bounds on initial load, not on every change
  useEffect(() => {
    if (mapRef.current && mapBounds && !hasInitializedView) {
      mapRef.current.fitBounds(mapBounds, { padding: [20, 20] });
      setHasInitializedView(true);
    }
  }, [mapBounds, hasInitializedView]);

  // Default center and zoom for empty state
  const defaultCenter: [number, number] = [39.9042, 116.4074]; // Beijing
  const defaultZoom = 5;

  // World bounds to restrict map panning
  const maxBounds: [[number, number], [number, number]] = [
    [-85, -180], // Southwest corner
    [85, 180],   // Northeast corner
  ];

  // Handle mouse move to update coordinates with throttling
  // Only update state every 100ms to avoid excessive re-renders
  const handleMouseMove = React.useCallback((coordinates: [number, number]) => {
    mouseCoordsRef.current = coordinates;
    
    // Clear existing timer
    if (updateTimerRef.current !== null) {
      return;
    }
    
    // Set new timer to update state
    updateTimerRef.current = window.setTimeout(() => {
      setMouseCoords(mouseCoordsRef.current);
      updateTimerRef.current = null;
    }, 100);
  }, []);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current !== null) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Get tile layer URL based on current layer
  const getTileLayerUrl = (layer: MapLayer): string => {
    if (layer === 'satellite') {
      return 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';
    }
    return 'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
  };

  return (
    <div className={`${className}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        minZoom={3}
      >
        {/* Base tile layer - Gaode (AMap) */}
        <TileLayer
          key={currentLayer}
          attribution='&copy; 高德地图'
          url={getTileLayerUrl(currentLayer)}
          maxZoom={18}
          minZoom={3}
        />
        
        {/* Scale control */}
        <ScaleControl position="bottomleft" imperial={false} />
        
        {/* Map event handlers */}
        <MapEventHandler 
          onMapClick={onMapClick}
          onMouseMove={handleMouseMove}
        />
        
        {/* Album markers */}
        <AlbumMarkers albums={filteredAlbums} onAlbumClick={onAlbumClick} />
        
        {/* Path visualization */}
        <PathRenderer paths={paths} showPaths={showPaths} selectedTimeRange={selectedTimeRange} />
      </MapContainer>
      
      {/* Create mode hint */}
      {isCreateMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-sm">点击地图选择相册位置</div>
          </div>
        </div>
      )}
      
      {/* Hint overlay when no albums in selected range */}
      {filteredAlbums.length === 0 && !isCreateMode && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-md z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-gray-600 text-sm">所选时间区间内无相册</div>
          </div>
        </div>
      )}

      {/* Coordinates display */}
      <CoordinatesDisplay
        lat={mouseCoords?.[0] ?? null}
        lng={mouseCoords?.[1] ?? null}
        className="absolute bottom-4 right-4 z-10 pointer-events-none"
      />
    </div>
  );
};

export default MapComponent;
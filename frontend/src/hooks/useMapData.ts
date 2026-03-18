import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import { useApiPerformance } from './usePerformance';
import type { Album, AlbumCluster, BBox, Path } from '../types';

interface UseMapDataReturn {
  albums: Album[];
  clusters: AlbumCluster[];
  paths: Path[];
  isLoading: boolean;
  error: string | null;
  setViewport: (bbox: BBox, cameraHeight: number) => void;
  refetchAlbums: () => Promise<void>;
  refetchPaths: () => Promise<void>;
  createAlbum: (title: string, description: string, latitude: number, longitude: number, createdAt?: Date) => Promise<Album>;
  updateAlbumInList: (updatedAlbum: Album) => void;
  deleteAlbumFromList: (albumId: string) => void;
  clearError: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const normalizeBBox = (bbox: BBox): BBox => ({
  west: clamp(bbox.west, -180, 180),
  east: clamp(bbox.east, -180, 180),
  south: clamp(bbox.south, -90, 90),
  north: clamp(bbox.north, -90, 90),
});

const isValidBBox = (b: BBox) => b.east > b.west && b.north > b.south;

const shouldUseClustersForHeight = (height: number) => height > 1_500_000;

const gridForHeight = (height: number) => {
  if (height > 8_000_000) return 24;
  if (height > 4_000_000) return 32;
  if (height > 2_000_000) return 48;
  return 64;
};

export const useMapData = (): UseMapDataReturn => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [clusters, setClusters] = useState<AlbumCluster[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewportKey, setViewportKey] = useState<string>('');
  const { measureApiCall } = useApiPerformance();
  const viewportRef = useRef<{ bbox: BBox; height: number } | null>(null);

  const fetchViewportAlbumsOrClusters = useCallback(async () => {
    const vp = viewportRef.current;
    if (!vp) {
      setAlbums([]);
      setClusters([]);
      return;
    }

    const bbox = normalizeBBox(vp.bbox);
    if (!isValidBBox(bbox)) {
      setAlbums([]);
      setClusters([]);
      return;
    }

    try {
      setError(null);

      if (shouldUseClustersForHeight(vp.height)) {
        const grid = gridForHeight(vp.height);
        const clustersData = await measureApiCall(
          () => apiClient.getAlbumClusters(bbox, grid),
          'getAlbumClusters'
        );
        setClusters(clustersData);
        setAlbums([]);
      } else {
        const albumsData = await measureApiCall(
          () => apiClient.getAlbumsViewport(bbox, 20000),
          'getAlbumsViewport'
        );
        setAlbums(albumsData);
        setClusters([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch albums';
      setError(errorMessage);
      console.error('Error fetching viewport albums:', err);
      setAlbums([]);
      setClusters([]);
    }
  }, [measureApiCall]);

  const setViewport = useCallback((bbox: BBox, cameraHeight: number) => {
    const normalized = normalizeBBox(bbox);
    const key = `${normalized.west.toFixed(6)},${normalized.south.toFixed(6)},${normalized.east.toFixed(6)},${normalized.north.toFixed(6)}|${Math.round(cameraHeight)}`;
    viewportRef.current = { bbox: normalized, height: cameraHeight };

    // Avoid spamming re-renders when camera is animating
    setViewportKey(prev => (prev === key ? prev : key));
  }, []);

  // Fetch albums (viewport-based)
  const fetchAlbums = useCallback(async () => {
    await fetchViewportAlbumsOrClusters();
  }, [fetchViewportAlbumsOrClusters]);

  // Fetch paths from API
  const fetchPaths = useCallback(async () => {
    try {
      setError(null);
      const pathsData = await measureApiCall(
        () => apiClient.getPaths(),
        'getPaths'
      );
      setPaths(pathsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch paths';
      setError(errorMessage);
      console.error('Error fetching paths:', err);
    }
  }, [measureApiCall]);

  // Create new album
  const createAlbum = useCallback(async (
    title: string,
    description: string,
    latitude: number,
    longitude: number,
    createdAt?: Date
  ): Promise<Album> => {
    try {
      setError(null);
      const newAlbum = await measureApiCall(
        () => apiClient.createAlbum({
          title,
          description,
          latitude,
          longitude,
          created_at: (createdAt || new Date()).toISOString(),
        }),
        'createAlbum'
      );
      
      // Add the new album to the current list
      setAlbums(prev => [...prev, newAlbum]);
      
      return newAlbum;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create album';
      setError(errorMessage);
      console.error('Error creating album:', err);
      throw err;
    }
  }, [measureApiCall]);

  // Refetch functions for external use
  const refetchAlbums = useCallback(async () => {
    setIsLoading(true);
    await fetchAlbums();
    setIsLoading(false);
  }, [fetchAlbums]);

  const refetchPaths = useCallback(async () => {
    await fetchPaths();
  }, [fetchPaths]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      // Albums require viewport; paths can load immediately.
      await fetchPaths();
      setIsLoading(false);
    };

    loadInitialData();
  }, [fetchPaths]);

  // Pull viewport data whenever viewportKey changes (debounced).
  useEffect(() => {
    if (!viewportRef.current) return;

    const t = window.setTimeout(() => {
      fetchViewportAlbumsOrClusters();
    }, 200);

    return () => window.clearTimeout(t);
  }, [fetchViewportAlbumsOrClusters, viewportKey]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update album in the local list (for optimistic updates after edit)
  const updateAlbumInList = useCallback((updatedAlbum: Album) => {
    setAlbums(prev => prev.map(album => 
      album.id === updatedAlbum.id ? updatedAlbum : album
    ));
  }, []);

  // Delete album from the local list
  const deleteAlbumFromList = useCallback((albumId: string) => {
    setAlbums(prev => prev.filter(album => album.id !== albumId));
  }, []);

  return {
    albums,
    clusters,
    paths,
    isLoading,
    error,
    setViewport,
    refetchAlbums,
    refetchPaths,
    createAlbum,
    updateAlbumInList,
    deleteAlbumFromList,
    clearError,
  };
};

export default useMapData;
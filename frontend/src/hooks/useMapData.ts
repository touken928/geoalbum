import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import { useApiPerformance } from './usePerformance';
import type { Album, Path } from '../types';

interface UseMapDataReturn {
  albums: Album[];
  paths: Path[];
  isLoading: boolean;
  error: string | null;
  refetchAlbums: () => Promise<void>;
  refetchPaths: () => Promise<void>;
  createAlbum: (title: string, description: string, latitude: number, longitude: number, createdAt?: Date) => Promise<Album>;
  updateAlbumInList: (updatedAlbum: Album) => void;
  deleteAlbumFromList: (albumId: string) => void;
  clearError: () => void;
}

export const useMapData = (): UseMapDataReturn => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { measureApiCall } = useApiPerformance();

  // Fetch albums from API
  const fetchAlbums = useCallback(async () => {
    try {
      setError(null);
      // Always fetch all albums, filtering is done in MapPage via useTimeline
      const albumsData = await measureApiCall(
        () => apiClient.getAlbums(),
        'getAlbums'
      );
      
      // Enhance albums with photo count if not provided
      const enhancedAlbums = await Promise.all(
        albumsData.map(async (album) => {
          if (album.photo_count === undefined) {
            try {
              const photos = await apiClient.getAlbumPhotos(album.id);
              return { ...album, photo_count: photos.length };
            } catch (photoErr) {
              console.warn(`Failed to fetch photo count for album ${album.id}:`, photoErr);
              return { ...album, photo_count: 0 };
            }
          }
          return album;
        })
      );
      
      setAlbums(enhancedAlbums);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch albums';
      setError(errorMessage);
      console.error('Error fetching albums:', err);
    }
  }, [measureApiCall]);

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
      await Promise.all([fetchAlbums(), fetchPaths()]);
      setIsLoading(false);
    };

    loadInitialData();
  }, [fetchAlbums, fetchPaths]);

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
    paths,
    isLoading,
    error,
    refetchAlbums,
    refetchPaths,
    createAlbum,
    updateAlbumInList,
    deleteAlbumFromList,
    clearError,
  };
};

export default useMapData;
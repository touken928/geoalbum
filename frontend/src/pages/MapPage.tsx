import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MapComponent from '../components/MapComponent';
import DateRangeFilter from '../components/DateRangeFilter';
import AlbumPanel from '../components/AlbumPanel';
import LoadingOverlay from '../components/LoadingOverlay';
import CreateAlbumModal from '../components/CreateAlbumModal';
import { useMapData } from '../hooks/useMapData';
import { useTimeline } from '../hooks/useTimeline';
import { apiClient } from '../services/api';
import type { Album, TimeRange } from '../types';

const MapPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [showPaths, setShowPaths] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isAlbumPanelOpen, setIsAlbumPanelOpen] = useState(false);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumCoords, setNewAlbumCoords] = useState<[number, number] | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false); // New state for create mode

  // Timeline state management
  const {
    selectedRange,
    setSelectedRange,
    getFilteredAlbums,
    resetToFullRange,
  } = useTimeline('month');

  // Load all albums without time filtering for timeline
  const { albums: allAlbums, paths, isLoading, error, createAlbum, updateAlbumInList, deleteAlbumFromList, clearError, refetchPaths, refetchAlbums } = useMapData();

  // Get filtered albums for map display based on timeline selection
  const albums = getFilteredAlbums(allAlbums);

  // No need to reset range on load - useTimeline already defaults to last month

  // Handle date range changes
  const handleDateRangeChange = useCallback((range: TimeRange) => {
    setSelectedRange(range);
  }, [setSelectedRange]);

  // Handle reset to full range
  const handleResetRange = useCallback(() => {
    resetToFullRange(allAlbums);
  }, [resetToFullRange, allAlbums]);

  // Handle album marker click
  const handleAlbumClick = useCallback((album: Album) => {
    setSelectedAlbum(album);
    setIsAlbumPanelOpen(true);
    console.log('Album clicked:', album);
  }, []);

  // Handle map click for creating new album (only when in create mode)
  const handleMapClick = useCallback((coordinates: [number, number]) => {
    if (!isCreateMode) return; // Only create album when in create mode
    
    setNewAlbumCoords(coordinates);
    setIsCreatingAlbum(true);
    setIsCreateMode(false); // Exit create mode after clicking
    console.log('Map clicked at coordinates:', coordinates);
  }, [isCreateMode]);

  // Toggle create mode
  const toggleCreateMode = useCallback(() => {
    setIsCreateMode(prev => !prev);
  }, []);

  // Handle album creation with optional custom date
  const handleCreateAlbum = useCallback(async (title: string, description: string, createdAt?: Date) => {
    if (!newAlbumCoords) return;

    try {
      const [latitude, longitude] = newAlbumCoords;
      await createAlbum(title, description, latitude, longitude, createdAt);
      setIsCreatingAlbum(false);
      setNewAlbumCoords(null);
    } catch (err) {
      console.error('Failed to create album:', err);
    }
  }, [newAlbumCoords, createAlbum]);

  // Handle album panel actions
  const handleAlbumPanelClose = useCallback(() => {
    setIsAlbumPanelOpen(false);
    setSelectedAlbum(null);
  }, []);

  const handleAlbumEdit = useCallback((updatedAlbum: Album) => {
    setSelectedAlbum(updatedAlbum);
    // Update the album in the list to reflect changes
    updateAlbumInList(updatedAlbum);
  }, [updateAlbumInList]);

  const handlePhotoUpload = useCallback(async (files: File[]) => {
    if (!selectedAlbum) return;
    
    try {
      await apiClient.uploadPhotos(selectedAlbum.id, files);
      // Refresh albums to update photo count on map markers
      await refetchAlbums();
    } catch (err) {
      console.error('Failed to upload photos:', err);
    }
  }, [selectedAlbum, refetchAlbums]);

  const handleSetNextDestination = useCallback(async (destinationId: string) => {
    if (!selectedAlbum) return;
    
    try {
      if (destinationId) {
        // Create or update path
        await apiClient.setNextDestination(selectedAlbum.id, destinationId);
      } else {
        // Remove path
        await apiClient.removeNextDestination(selectedAlbum.id);
      }
      
      // Refresh paths to show updated visualization
      await refetchPaths();
      console.log('Next destination updated:', selectedAlbum.id, '->', destinationId);
    } catch (err) {
      console.error('Failed to update next destination:', err);
    }
  }, [selectedAlbum, refetchPaths]);

  // Handle album deletion
  const handleAlbumDeleted = useCallback((albumId: string) => {
    deleteAlbumFromList(albumId);
    setSelectedAlbum(null);
    setIsAlbumPanelOpen(false);
  }, [deleteAlbumFromList]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">GeoAlbum</h1>
              <span className="ml-2 text-sm text-gray-500">地理相册</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleCreateMode}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isCreateMode
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isCreateMode ? '取消创建' : '创建相册'}
              </button>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showPaths}
                  onChange={(e) => setShowPaths(e.target.checked)}
                  className="mr-1"
                />
                显示路径
              </label>
              <span className="text-sm text-gray-700">
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                退出
              </button>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <div className="py-2 border-t border-gray-100">
            <DateRangeFilter
              selectedRange={selectedRange}
              onRangeChange={handleDateRangeChange}
              onReset={handleResetRange}
              totalCount={allAlbums.length}
              filteredCount={albums.length}
            />
          </div>
        </div>
      </header>

      {/* Main content area with map and timeline */}
      <main className="flex-1 flex flex-col">
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
            <div className="flex items-center justify-between">
              <span>错误: {error}</span>
              <button
                onClick={clearError}
                className="ml-4 text-red-500 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Map area - takes all remaining space */}
        <div className="flex-1 relative">
          <MapComponent
            albums={albums}
            selectedTimeRange={selectedRange}
            onAlbumClick={handleAlbumClick}
            onMapClick={handleMapClick}
            showPaths={showPaths}
            paths={paths}
            isCreateMode={isCreateMode}
            className="absolute inset-0"
          />
          
          {/* Loading overlay */}
          <LoadingOverlay 
            isVisible={isLoading} 
            message="加载地图数据中..." 
            backdrop={false}
          />
        </div>



        {/* Album creation modal */}
        {isCreatingAlbum && newAlbumCoords && (
          <CreateAlbumModal
            coordinates={newAlbumCoords}
            onClose={() => {
              setIsCreatingAlbum(false);
              setNewAlbumCoords(null);
            }}
            onCreate={handleCreateAlbum}
          />
        )}

        {/* Album Panel */}
        <AlbumPanel
          album={selectedAlbum}
          isOpen={isAlbumPanelOpen}
          onClose={handleAlbumPanelClose}
          onEdit={handleAlbumEdit}
          onPhotoUpload={handlePhotoUpload}
          onSetNextDestination={handleSetNextDestination}
          allAlbums={allAlbums}
          onAlbumDeleted={handleAlbumDeleted}
          onDataChanged={refetchAlbums}
        />
      </main>
    </div>
  );
};

export default MapPage;
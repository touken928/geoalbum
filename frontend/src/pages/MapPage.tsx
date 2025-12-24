import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MapComponent from '../components/MapComponent';
import DateRangeFilter from '../components/DateRangeFilter';
import AlbumPanel from '../components/AlbumPanel';
import LoadingOverlay from '../components/LoadingOverlay';
import CreateAlbumModal from '../components/CreateAlbumModal';
import SearchBox from '../components/SearchBox';
import ToolbarDropdown from '../components/ToolbarDropdown';
import { type MapLayer } from '../components/LayerControl';
import { useMapData } from '../hooks/useMapData';
import { useTimeline } from '../hooks/useTimeline';
import { apiClient } from '../services/api';
import type { Album, TimeRange } from '../types';

const MapPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showPaths, setShowPaths] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isAlbumPanelOpen, setIsAlbumPanelOpen] = useState(false);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumCoords, setNewAlbumCoords] = useState<[number, number] | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false); // New state for create mode
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('vector');

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

  // Handle search result selection - zoom to album
  const handleSearchSelect = useCallback((album: Album) => {
    setSelectedAlbum(album);
    setIsAlbumPanelOpen(true);
    // The map will automatically show the album marker
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
        <div className="px-2 sm:px-4 lg:px-8">
          {/* First row - Title and user info */}
          <div className="flex justify-between items-center py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">{t('app.title')}</h1>
              
              {/* GitHub link - hidden on mobile */}
              <a
                href="https://github.com/touken928"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block text-gray-600 hover:text-gray-900 transition-colors"
                title="GitHub"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* User info - abbreviated on mobile */}
              <span className="text-xs sm:text-sm text-gray-600 px-1 sm:px-2 max-w-[80px] sm:max-w-none truncate">
                {user?.username}
              </span>
              
              {/* Language toggle */}
              <button
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title={language === 'zh' ? 'Switch to English' : '切换到中文'}
              >
                {language === 'zh' ? 'EN' : '中文'}
              </button>
              
              {/* Logout button */}
              <button
                onClick={logout}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                {t('header.logout')}
              </button>
            </div>
          </div>
          
          {/* Second row - Date Range Filter and Search */}
          <div className="py-2 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex-shrink-0 overflow-x-auto">
              <DateRangeFilter
                selectedRange={selectedRange}
                onRangeChange={handleDateRangeChange}
                onReset={handleResetRange}
                totalCount={allAlbums.length}
                filteredCount={albums.length}
              />
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search box - full width on mobile */}
              <SearchBox
                albums={allAlbums}
                onAlbumSelect={handleSearchSelect}
                className="flex-1 sm:w-64"
              />
              
              {/* Toolbar dropdown */}
              <ToolbarDropdown
                currentLayer={currentLayer}
                onLayerChange={setCurrentLayer}
                isCreateMode={isCreateMode}
                onToggleCreateMode={toggleCreateMode}
                showPaths={showPaths}
                onToggleShowPaths={() => setShowPaths(!showPaths)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content area with map and timeline */}
      <main className="flex-1 flex flex-col">
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
            <div className="flex items-center justify-between">
              <span>{t('common.error')}: {error}</span>
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
            currentLayer={currentLayer}
            className="absolute inset-0"
          />
          
          {/* Loading overlay */}
          <LoadingOverlay 
            isVisible={isLoading} 
            message={t('map.loading')}
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
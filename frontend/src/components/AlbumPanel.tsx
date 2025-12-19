import React, { useState, useEffect } from 'react';
import { X, Edit3, Upload, ChevronLeft, ChevronRight, MapPin, Calendar, Camera, Route, Trash2 } from 'lucide-react';
import type { Photo, AlbumPanelProps, Album } from '../types';
import { apiClient } from '../services/api';
import PhotoUpload from './PhotoUpload';
import NextDestinationSelector from './NextDestinationSelector';
import LazyImage from './LazyImage';
import LoadingSpinner from './LoadingSpinner';

interface ExtendedAlbumPanelProps extends AlbumPanelProps {
  allAlbums?: Album[];
  onAlbumDeleted?: (albumId: string) => void;
  onDataChanged?: () => void; // Callback to notify parent when data changes (e.g., photo upload)
}

const AlbumPanel: React.FC<ExtendedAlbumPanelProps> = ({
  album,
  isOpen,
  onClose,
  onEdit,
  onPhotoUpload: _onPhotoUpload,
  onSetNextDestination,
  allAlbums = [],
  onAlbumDeleted,
  onDataChanged,
  className = '',
}) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showNextDestinationSelector, setShowNextDestinationSelector] = useState(false);
  const [nextDestination, setNextDestination] = useState<Album | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);

  // Load photos and next destination when album changes
  useEffect(() => {
    if (album && isOpen) {
      loadPhotos();
      loadNextDestination();
      setEditTitle(album.title);
      setEditDescription(album.description);
      setCurrentPhotoIndex(0);
      setIsEditing(false);
      setError(null);
    }
  }, [album, isOpen]);

  const loadNextDestination = async () => {
    if (!album) return;
    
    try {
      const destination = await apiClient.getNextDestination(album.id);
      setNextDestination(destination);
    } catch (err) {
      console.error('Failed to load next destination:', err);
      setNextDestination(null);
    }
  };

  const loadPhotos = async () => {
    if (!album) return;
    
    try {
      setIsLoading(true);
      const albumPhotos = await apiClient.getAlbumPhotos(album.id);
      setPhotos(albumPhotos.sort((a, b) => a.display_order - b.display_order));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载照片失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!album) return;

    try {
      setIsLoading(true);
      const updatedAlbum = await apiClient.updateAlbum(album.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      
      onEdit(updatedAlbum);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (album) {
      setEditTitle(album.title);
      setEditDescription(album.description);
    }
    setIsEditing(false);
  };

  const handlePhotoNavigation = (direction: 'prev' | 'next') => {
    if (photos.length === 0) return;
    
    if (direction === 'prev') {
      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    } else {
      setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  };

  const handleUploadComplete = async () => {
    // Reload photos after successful upload
    setShowPhotoUpload(false);
    await loadPhotos();
    // Notify parent to refresh album data (for photo count update on map)
    onDataChanged?.();
  };

  const handleDestinationSet = (destinationAlbum: Album) => {
    setNextDestination(destinationAlbum);
    onSetNextDestination(destinationAlbum.id);
    setShowNextDestinationSelector(false);
  };

  const handleDestinationRemoved = () => {
    setNextDestination(null);
    onSetNextDestination('');
    setShowNextDestinationSelector(false);
  };

  // Delete photo handler
  const handleDeletePhoto = async (photo: Photo) => {
    try {
      setIsLoading(true);
      await apiClient.deletePhoto(photo.id);
      // Remove photo from list
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      // Adjust current index if needed
      if (currentPhotoIndex >= photos.length - 1) {
        setCurrentPhotoIndex(Math.max(0, photos.length - 2));
      }
      setPhotoToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除照片失败');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete album handler with password verification
  const handleDeleteAlbum = async () => {
    if (!album) return;
    
    // Simple password verification (in production, this should be server-side)
    if (deletePassword !== 'delete') {
      setDeleteError('密码错误，请输入 "delete" 确认删除');
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.deleteAlbum(album.id);
      setShowDeleteConfirm(false);
      setDeletePassword('');
      onAlbumDeleted?.(album.id);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '删除相册失败');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isOpen || !album) {
    return null;
  }

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <div className={`fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-blue-500" />
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                placeholder="相册标题"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{album.title}</h2>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={isLoading}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  保存
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="编辑相册"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  title="删除相册"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-80px)]">
          {/* Photo Display Area */}
          <div className="flex-1 relative bg-gray-100">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-2">
                  <LoadingSpinner size="lg" />
                  <div className="text-gray-500">加载照片中...</div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-500 text-center">
                  <div>{error}</div>
                  <button
                    onClick={loadPhotos}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    重试
                  </button>
                </div>
              </div>
            )}
            
            {!isLoading && !error && photos.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <div>暂无照片</div>
                  <div className="text-sm mt-1">点击上传按钮添加照片</div>
                </div>
              </div>
            )}
            
            {currentPhoto && (
              <>
                <LazyImage
                  src={currentPhoto.url}
                  alt={currentPhoto.filename}
                  className="w-full h-full"
                />
                
                {/* Photo Navigation */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => handlePhotoNavigation('prev')}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    
                    <button
                      onClick={() => handlePhotoNavigation('next')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    {/* Photo Counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black bg-opacity-50 text-white rounded-full text-sm">
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Info Panel */}
          <div className="w-full lg:w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 flex-1 overflow-y-auto">
              {/* Album Info */}
              <div className="mb-6">
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(album.created_at)}
                </div>
                
                <div className="text-sm text-gray-500 mb-3">
                  坐标: {album.latitude.toFixed(6)}, {album.longitude.toFixed(6)}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">描述</h3>
                  {isEditing ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full h-24 p-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none resize-none"
                      placeholder="添加相册描述..."
                    />
                  ) : (
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {album.description || '暂无描述'}
                    </p>
                  )}
                </div>
              </div>

              {/* Next Destination */}
              {nextDestination && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">下一站</h3>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Route className="w-4 h-4 text-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium text-blue-900">{nextDestination.title}</div>
                        <div className="text-xs text-blue-600">
                          {formatDate(nextDestination.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Thumbnails */}
              {photos.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    照片 ({photos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={photo.id} className="relative group">
                        <button
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`aspect-square rounded overflow-hidden border-2 w-full ${
                            index === currentPhotoIndex
                              ? 'border-blue-500'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <LazyImage
                            src={photo.url}
                            alt={photo.filename}
                            className="w-full h-full"
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoToDelete(photo);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="删除照片"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2"
              >
                <Upload className="w-4 h-4" />
                <span>上传照片</span>
              </button>
              
              <button
                onClick={() => setShowNextDestinationSelector(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                <Route className="w-4 h-4" />
                <span>{nextDestination ? '修改下一站' : '设置下一站'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Album Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认删除相册</h3>
            <p className="text-gray-600 mb-4">
              删除相册将同时删除所有照片，此操作不可恢复。请输入 <strong>delete</strong> 确认删除。
            </p>
            <input
              type="text"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              placeholder="输入 delete 确认"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {deleteError && (
              <p className="text-red-500 text-sm mb-4">{deleteError}</p>
            )}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleDeleteAlbum}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认删除照片</h3>
            <p className="text-gray-600 mb-4">
              确定要删除这张照片吗？此操作不可恢复。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={() => handleDeletePhoto(photoToDelete)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoUpload && album && (
        <PhotoUpload
          albumId={album.id}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowPhotoUpload(false)}
          className="z-[60]"
        />
      )}

      {/* Next Destination Selector Modal */}
      {showNextDestinationSelector && album && (
        <NextDestinationSelector
          currentAlbum={album}
          allAlbums={allAlbums}
          isOpen={showNextDestinationSelector}
          onClose={() => setShowNextDestinationSelector(false)}
          onDestinationSet={handleDestinationSet}
          onDestinationRemoved={handleDestinationRemoved}
        />
      )}
    </div>
  );
};

export default AlbumPanel;
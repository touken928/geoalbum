import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Search, Trash2 } from 'lucide-react';
import type { Album } from '../types';
import { apiClient } from '../services/api';
import ModalContainer from './ModalContainer';

interface NextDestinationSelectorProps {
  currentAlbum: Album;
  allAlbums: Album[];
  isOpen: boolean;
  onClose: () => void;
  onDestinationSet: (destinationAlbum: Album) => void;
  onDestinationRemoved: () => void;
}

const NextDestinationSelector: React.FC<NextDestinationSelectorProps> = ({
  currentAlbum,
  allAlbums,
  isOpen,
  onClose,
  onDestinationSet,
  onDestinationRemoved,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDestination, setCurrentDestination] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current next destination when component opens
  useEffect(() => {
    if (isOpen) {
      loadCurrentDestination();
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen, currentAlbum.id]);

  const loadCurrentDestination = async () => {
    try {
      setIsLoading(true);
      const destination = await apiClient.getNextDestination(currentAlbum.id);
      setCurrentDestination(destination);
    } catch (err) {
      console.error('Failed to load current destination:', err);
      setCurrentDestination(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter albums excluding the current album and search by title
  const filteredAlbums = allAlbums
    .filter(album => 
      album.id !== currentAlbum.id && 
      album.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleSetDestination = async (destinationAlbum: Album) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.setNextDestination(currentAlbum.id, destinationAlbum.id);
      setCurrentDestination(destinationAlbum);
      onDestinationSet(destinationAlbum);
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置下一站失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDestination = async () => {
    if (!currentDestination) return;

    try {
      setIsLoading(true);
      setError(null);
      await apiClient.removeNextDestination(currentAlbum.id);
      setCurrentDestination(null);
      onDestinationRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除下一站失败');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ModalContainer 
      isOpen={isOpen} 
      onClose={onClose} 
      variant="selector"
      size="lg"
      maxHeight="max-h-[75vh]"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">设置下一站</h2>
              <p className="text-sm text-gray-600">为 "{currentAlbum.title}" 选择下一个目的地</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Destination */}
        {currentDestination && (
          <div className="p-4 bg-blue-50/80 border-b border-gray-200/60 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <h3 className="font-medium text-gray-900">当前下一站</h3>
                  <p className="text-sm text-gray-700">{currentDestination.title}</p>
                  <p className="text-xs text-gray-500">{formatDate(currentDestination.created_at)}</p>
                </div>
              </div>
              <button
                onClick={handleRemoveDestination}
                disabled={isLoading}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100/60 rounded-lg disabled:opacity-50 transition-colors"
                title="移除下一站"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50/80 border-b border-gray-200/60 flex-shrink-0">
            <div className="text-red-700 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-gray-200/60 bg-white/60 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索相册..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300/60 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white/80 backdrop-blur-sm transition-all"
            />
          </div>
        </div>

        {/* Album List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>加载中...</span>
              </div>
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                {searchTerm ? '未找到匹配的相册' : '没有其他相册可选择'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200/50">
              {filteredAlbums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleSetDestination(album)}
                  disabled={isLoading}
                  className="w-full p-4 text-left hover:bg-gray-50/60 disabled:opacity-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {album.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {album.description || '无描述'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(album.created_at)}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {album.latitude.toFixed(4)}, {album.longitude.toFixed(4)}
                        </div>
                        {album.photo_count !== undefined && (
                          <div>
                            {album.photo_count} 张照片
                          </div>
                        )}
                      </div>
                    </div>
                    {currentDestination?.id === album.id && (
                      <div className="ml-4 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white/80 border border-gray-300/60 rounded-lg hover:bg-gray-50/80 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

export default NextDestinationSelector;
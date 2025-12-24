import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { Album } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SearchBoxProps {
  albums: Album[];
  onAlbumSelect: (album: Album) => void;
  className?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ albums, onAlbumSelect, className = '' }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Album[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fuzzy search function
  const fuzzySearch = (searchQuery: string, albums: Album[]): Album[] => {
    if (!searchQuery.trim()) return [];
    
    const lowerQuery = searchQuery.toLowerCase();
    
    return albums
      .filter(album => {
        const titleMatch = album.title.toLowerCase().includes(lowerQuery);
        const descMatch = album.description.toLowerCase().includes(lowerQuery);
        return titleMatch || descMatch;
      })
      .sort((a, b) => {
        // Prioritize title matches over description matches
        const aTitleMatch = a.title.toLowerCase().includes(lowerQuery);
        const bTitleMatch = b.title.toLowerCase().includes(lowerQuery);
        
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        
        // Sort by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 10); // Limit to 10 results
  };

  // Update search results when query changes
  useEffect(() => {
    const searchResults = fuzzySearch(query, albums);
    // Use a microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      setResults(searchResults);
      setIsOpen(query.trim().length > 0);
    });
  }, [query, albums]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (album: Album) => {
    onAlbumSelect(album);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
          {results.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-500 border-b">
                {results.length} {t('search.results')}
              </div>
              {results.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleSelect(album)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{album.title}</div>
                  {album.description && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {album.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{new Date(album.created_at).toLocaleDateString()}</span>
                    {album.photo_count !== undefined && album.photo_count > 0 && (
                      <span>• {album.photo_count} {t('album.photos')}</span>
                    )}
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              {t('search.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;

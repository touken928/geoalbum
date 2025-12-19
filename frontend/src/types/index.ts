// Core data types for the GeoAlbum system

export interface User {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  user_id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  photo_count?: number;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  album_id: string;
  filename: string;
  url: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  uploaded_at: string;
}

export interface Path {
  id: string;
  user_id: string;
  from_album_id: string;
  to_album_id: string;
  created_at: string;
  from_album?: Album;
  to_album?: Album;
}

// API request/response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateAlbumRequest {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface UpdateAlbumRequest {
  title?: string;
  description?: string;
}

export interface CreatePathRequest {
  from_album_id: string;
  to_album_id: string;
}

// UI state types
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export type TimeGranularity = 'year' | 'month' | 'day';

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

// API error response type
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Authentication context types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Map component props
export interface MapComponentProps {
  albums: Album[];
  selectedTimeRange?: TimeRange;
  onAlbumClick: (album: Album) => void;
  onMapClick: (coordinates: [number, number]) => void;
  showPaths: boolean;
  paths: Path[];
  isCreateMode?: boolean;
  className?: string;
}

// Timeline component props
export interface TimelineProps {
  albums: Album[];
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  granularity: TimeGranularity;
  onGranularityChange: (granularity: TimeGranularity) => void;
  className?: string;
}

// Album panel props
export interface AlbumPanelProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (album: Album) => void;
  onPhotoUpload: (files: File[]) => void;
  onSetNextDestination: (destinationId: string) => void;
  allAlbums?: Album[];
  className?: string;
}
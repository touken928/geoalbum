import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Album, Path } from '../types';

// Mock all leaflet-related modules
vi.mock('leaflet', () => ({
  default: {
    DivIcon: vi.fn().mockImplementation(() => ({})),
    Point: vi.fn().mockImplementation((x, y) => ({ x, y })),
  },
  DivIcon: vi.fn().mockImplementation(() => ({})),
  Point: vi.fn().mockImplementation((x, y) => ({ x, y })),
}));

vi.mock('leaflet.markercluster', () => ({}));

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMapEvents: vi.fn(() => null),
}));

// Mock react-leaflet-cluster
vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker-cluster-group">{children}</div>
  ),
}));

// Mock AlbumMarker component
vi.mock('./AlbumMarker', () => ({
  default: ({ album }: { album: Album }) => (
    <div data-testid={`album-marker-${album.id}`}>{album.title}</div>
  ),
}));

// Import the component after mocks
const MapComponent = await import('./MapComponent').then(m => m.default);

const mockAlbums: Album[] = [
  {
    id: '1',
    user_id: 'user1',
    title: 'Test Album 1',
    description: 'Test description 1',
    latitude: 39.9042,
    longitude: 116.4074,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    photo_count: 5,
  },
  {
    id: '2',
    user_id: 'user1',
    title: 'Test Album 2',
    description: 'Test description 2',
    latitude: 40.0042,
    longitude: 116.5074,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    photo_count: 3,
  },
];

const mockPaths: Path[] = [];

const defaultProps = {
  albums: mockAlbums,
  onAlbumClick: vi.fn(),
  onMapClick: vi.fn(),
  showPaths: false,
  paths: mockPaths,
};

describe('MapComponent', () => {
  it('renders map container with clustering', () => {
    render(<MapComponent {...defaultProps} />);
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('marker-cluster-group')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('renders album markers within cluster group', () => {
    render(<MapComponent {...defaultProps} />);
    
    expect(screen.getByTestId('album-marker-1')).toBeInTheDocument();
    expect(screen.getByTestId('album-marker-2')).toBeInTheDocument();
    expect(screen.getByText('Test Album 1')).toBeInTheDocument();
    expect(screen.getByText('Test Album 2')).toBeInTheDocument();
  });

  it('displays zoom level indicator', () => {
    render(<MapComponent {...defaultProps} />);
    
    expect(screen.getByText(/缩放级别:/)).toBeInTheDocument();
    expect(screen.getByText(/聚合模式|无聚合/)).toBeInTheDocument();
  });

  it('shows empty state when no albums', () => {
    render(<MapComponent {...defaultProps} albums={[]} />);
    
    expect(screen.getByText('暂无相册')).toBeInTheDocument();
    expect(screen.getByText('点击地图上的任意位置创建第一个相册')).toBeInTheDocument();
  });

  it('filters albums by time range', () => {
    const timeRange = {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-01T23:59:59'),
    };

    render(<MapComponent {...defaultProps} selectedTimeRange={timeRange} />);
    
    // Only the first album should be visible (within time range)
    expect(screen.getByTestId('album-marker-1')).toBeInTheDocument();
    // The second album should not be rendered (outside time range)
    expect(screen.queryByTestId('album-marker-2')).not.toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorProvider } from '../contexts/ErrorContext';
import type { Album, Photo, Path } from '../types';

// Mock API responses
const mockUser = {
  id: 'user1',
  username: 'testuser',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockAlbums: Album[] = [
  {
    id: 'album1',
    user_id: 'user1',
    title: 'Test Album 1',
    description: 'First test album',
    latitude: 39.9042,
    longitude: 116.4074,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    photo_count: 2,
  },
  {
    id: 'album2',
    user_id: 'user1',
    title: 'Test Album 2',
    description: 'Second test album',
    latitude: 40.0042,
    longitude: 116.5074,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    photo_count: 1,
  },
];

const mockPhotos: Photo[] = [
  {
    id: 'photo1',
    album_id: 'album1',
    filename: 'test1.jpg',
    url: '/api/photos/photo1/file',
    file_size: 1024,
    mime_type: 'image/jpeg',
    display_order: 0,
    uploaded_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'photo2',
    album_id: 'album1',
    filename: 'test2.jpg',
    url: '/api/photos/photo2/file',
    file_size: 2048,
    mime_type: 'image/jpeg',
    display_order: 1,
    uploaded_at: '2023-01-01T01:00:00Z',
  },
];

const mockPaths: Path[] = [
  {
    id: 'path1',
    user_id: 'user1',
    from_album_id: 'album1',
    to_album_id: 'album2',
    created_at: '2023-01-02T00:00:00Z',
    from_album: mockAlbums[0],
    to_album: mockAlbums[1],
  },
];

// Mock fetch API
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock Leaflet and related components
vi.mock('leaflet', () => ({
  default: {
    DivIcon: vi.fn().mockImplementation(() => ({})),
    Point: vi.fn().mockImplementation((x, y) => ({ x, y })),
    map: vi.fn().mockReturnValue({
      setView: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getZoom: vi.fn().mockReturnValue(10),
      getBounds: vi.fn().mockReturnValue({
        getNorthEast: vi.fn().mockReturnValue({ lat: 40, lng: 117 }),
        getSouthWest: vi.fn().mockReturnValue({ lat: 39, lng: 116 }),
      }),
    }),
  },
  DivIcon: vi.fn().mockImplementation(() => ({})),
  Point: vi.fn().mockImplementation((x, y) => ({ x, y })),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, whenReady }: any) => {
    React.useEffect(() => {
      if (whenReady) {
        whenReady();
      }
    }, [whenReady]);
    return <div data-testid="map-container">{children}</div>;
  },
  TileLayer: () => <div data-testid="tile-layer" />,
  useMapEvents: vi.fn(() => null),
  useMap: vi.fn(() => ({
    setView: vi.fn(),
    getZoom: vi.fn().mockReturnValue(10),
    getBounds: vi.fn().mockReturnValue({
      getNorthEast: vi.fn().mockReturnValue({ lat: 40, lng: 117 }),
      getSouthWest: vi.fn().mockReturnValue({ lat: 39, lng: 116 }),
    }),
  })),
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker-cluster-group">{children}</div>
  ),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ErrorProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorProvider>
  </BrowserRouter>
);

describe('Complete User Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Default successful responses
    mockFetch.mockImplementation((url: string, options?: any) => {
      const method = options?.method || 'GET';
      
      if (url.includes('/api/auth/login') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            token: 'mock-jwt-token',
            user: mockUser,
          }),
        });
      }
      
      if (url.includes('/api/auth/register') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            token: 'mock-jwt-token',
            user: mockUser,
          }),
        });
      }
      
      if (url.includes('/api/albums') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAlbums),
        });
      }
      
      if (url.includes('/api/albums') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            ...mockAlbums[0],
            id: 'new-album-id',
          }),
        });
      }
      
      if (url.includes('/api/albums/album1/photos') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockPhotos),
        });
      }
      
      if (url.includes('/api/paths') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockPaths),
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Complete user authentication and map workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Should start at login page
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();

    // Fill in login form
    await user.type(screen.getByPlaceholderText('用户名'), 'testuser');
    await user.type(screen.getByPlaceholderText('密码'), 'password123');

    // Submit login
    await user.click(screen.getByRole('button', { name: '登录' }));

    // Wait for authentication and redirect to map
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            username: 'testuser',
            password: 'password123',
          }),
        })
      );
    });

    // Should store token in localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));

    // Should redirect to map page and load albums
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Should fetch albums
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/albums'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token',
          }),
        })
      );
    });
  });

  it('Album creation workflow', async () => {
    const user = userEvent.setup();
    
    // Mock authenticated state
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Wait for map to load
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Simulate map click to create album
    const mapContainer = screen.getByTestId('map-container');
    
    await act(async () => {
      fireEvent.click(mapContainer);
    });

    // Should show album creation form
    await waitFor(() => {
      expect(screen.getByText('创建相册')).toBeInTheDocument();
    });

    // Fill in album details
    const titleInput = screen.getByPlaceholderText('相册标题');
    const descriptionInput = screen.getByPlaceholderText('相册描述');

    await user.type(titleInput, 'New Test Album');
    await user.type(descriptionInput, 'This is a new test album');

    // Submit album creation
    await user.click(screen.getByRole('button', { name: '创建' }));

    // Should call API to create album
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/albums'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token',
          }),
          body: expect.stringContaining('New Test Album'),
        })
      );
    });
  });

  it('Photo upload workflow', async () => {
    const user = userEvent.setup();
    
    // Mock authenticated state
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    // Mock successful photo upload
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/albums/album1/photos') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            id: 'new-photo-id',
            album_id: 'album1',
            filename: 'test-upload.jpg',
            url: '/api/photos/new-photo-id/file',
            file_size: 1024,
            mime_type: 'image/jpeg',
            display_order: 0,
            uploaded_at: new Date().toISOString(),
          }),
        });
      }
      
      // Default responses for other calls
      if (url.includes('/api/albums') && options?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAlbums),
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Wait for map to load
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Click on an album marker to open album panel
    const albumMarker = screen.getByTestId('album-marker-album1');
    await user.click(albumMarker);

    // Should open album panel
    await waitFor(() => {
      expect(screen.getByText('Test Album 1')).toBeInTheDocument();
    });

    // Find photo upload area
    const uploadArea = screen.getByText('点击或拖拽上传照片');
    expect(uploadArea).toBeInTheDocument();

    // Create a mock file
    const file = new File(['test image content'], 'test-upload.jpg', {
      type: 'image/jpeg',
    });

    // Find file input and upload file
    const fileInput = screen.getByLabelText('上传照片');
    
    await act(async () => {
      await user.upload(fileInput, file);
    });

    // Should call API to upload photo
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/albums/album1/photos'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token',
          }),
        })
      );
    });
  });

  it('Time range filtering workflow', async () => {
    // Mock authenticated state
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Wait for map and timeline to load
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
    });

    // Should show both albums initially
    expect(screen.getByTestId('album-marker-album1')).toBeInTheDocument();
    expect(screen.getByTestId('album-marker-album2')).toBeInTheDocument();

    // Interact with timeline to filter by date
    const timeline = screen.getByTestId('timeline-container');
    
    // Simulate timeline drag to select date range
    await act(async () => {
      fireEvent.mouseDown(timeline, { clientX: 100 });
      fireEvent.mouseMove(timeline, { clientX: 200 });
      fireEvent.mouseUp(timeline, { clientX: 200 });
    });

    // Should filter albums based on time range
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/albums\?.*start_date.*end_date/),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token',
          }),
        })
      );
    });
  });

  it('Path visualization workflow', async () => {
    const user = userEvent.setup();
    
    // Mock authenticated state
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Wait for map to load
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Should fetch paths
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/paths'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token',
          }),
        })
      );
    });

    // Find and toggle path visibility
    const pathToggle = screen.getByLabelText('显示路径');
    expect(pathToggle).toBeInTheDocument();

    await user.click(pathToggle);

    // Should show path renderer
    await waitFor(() => {
      expect(screen.getByTestId('path-renderer')).toBeInTheDocument();
    });
  });

  it('Error handling and recovery', async () => {
    const user = userEvent.setup();
    
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Try to login with network error
    await user.type(screen.getByPlaceholderText('用户名'), 'testuser');
    await user.type(screen.getByPlaceholderText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/网络错误|登录失败/)).toBeInTheDocument();
    });

    // Reset mock to successful response
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/auth/login') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            token: 'mock-jwt-token',
            user: mockUser,
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });
    });

    // Retry login should work
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
    });
  });

  it('Performance monitoring', async () => {
    // Mock authenticated state
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    // Create large dataset for performance testing
    const largeAlbumSet = Array.from({ length: 100 }, (_, i) => ({
      ...mockAlbums[0],
      id: `album${i}`,
      title: `Performance Test Album ${i}`,
      latitude: 39.9042 + (i * 0.001),
      longitude: 116.4074 + (i * 0.001),
    }));

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/albums')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(largeAlbumSet),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });
    });

    const startTime = performance.now();

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Wait for map to load with large dataset
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    }, { timeout: 5000 });

    const loadTime = performance.now() - startTime;

    // Performance requirement: should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);

    // Should handle large dataset without crashing
    expect(screen.getByTestId('marker-cluster-group')).toBeInTheDocument();
  });

  it('Data consistency and state management', async () => {
    const user = userEvent.setup();
    
    // Mock authenticated state
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    let albumsData = [...mockAlbums];

    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/albums') && options?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(albumsData),
        });
      }
      
      if (url.includes('/api/albums') && options?.method === 'POST') {
        const newAlbum = {
          ...mockAlbums[0],
          id: 'new-album-id',
          title: 'New Album',
        };
        albumsData.push(newAlbum);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(newAlbum),
        });
      }
      
      if (url.includes('/api/albums/album1') && options?.method === 'DELETE') {
        albumsData = albumsData.filter(album => album.id !== 'album1');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ message: 'Album deleted' }),
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Should show initial albums
    expect(screen.getByTestId('album-marker-album1')).toBeInTheDocument();
    expect(screen.getByTestId('album-marker-album2')).toBeInTheDocument();

    // Create new album
    const mapContainer = screen.getByTestId('map-container');
    await act(async () => {
      fireEvent.click(mapContainer);
    });

    await waitFor(() => {
      expect(screen.getByText('创建相册')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('相册标题'), 'New Album');
    await user.click(screen.getByRole('button', { name: '创建' }));

    // Should update state and show new album
    await waitFor(() => {
      expect(screen.getByTestId('album-marker-new-album-id')).toBeInTheDocument();
    });

    // Delete album
    await user.click(screen.getByTestId('album-marker-album1'));
    
    await waitFor(() => {
      expect(screen.getByText('删除相册')).toBeInTheDocument();
    });

    await user.click(screen.getByText('删除相册'));

    // Should remove album from state
    await waitFor(() => {
      expect(screen.queryByTestId('album-marker-album1')).not.toBeInTheDocument();
    });

    // Should still show other albums
    expect(screen.getByTestId('album-marker-album2')).toBeInTheDocument();
    expect(screen.getByTestId('album-marker-new-album-id')).toBeInTheDocument();
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  it('Map rendering performance with large datasets', async () => {
    const largeDataset = Array.from({ length: 500 }, (_, i) => ({
      ...mockAlbums[0],
      id: `perf-album-${i}`,
      title: `Performance Album ${i}`,
      latitude: 39.9042 + (i * 0.001),
      longitude: 116.4074 + (i * 0.001),
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(largeDataset),
    });

    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    const startTime = performance.now();

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    }, { timeout: 3000 });

    const renderTime = performance.now() - startTime;

    // Should render within performance requirements
    expect(renderTime).toBeLessThan(2000); // 2 seconds max
    
    console.log(`Rendered ${largeDataset.length} albums in ${renderTime.toFixed(2)}ms`);
  });

  it('Time range filtering performance', async () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
    });

    const timeline = screen.getByTestId('timeline-container');
    
    const startTime = performance.now();

    // Simulate rapid timeline interactions
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        fireEvent.mouseDown(timeline, { clientX: 100 + i * 10 });
        fireEvent.mouseMove(timeline, { clientX: 200 + i * 10 });
        fireEvent.mouseUp(timeline, { clientX: 200 + i * 10 });
      });
    }

    const filterTime = performance.now() - startTime;

    // Should complete filtering within performance requirements
    expect(filterTime).toBeLessThan(500); // 500ms max for multiple operations
    
    console.log(`Completed 10 time range filters in ${filterTime.toFixed(2)}ms`);
  });
});
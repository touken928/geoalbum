import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorProvider } from '../contexts/ErrorContext';

// Mock API responses
const mockUser = {
  id: 'user1',
  username: 'testuser',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

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

// Mock Cesium
vi.mock('cesium', () => ({
  Ion: {
    defaultAccessToken: '',
  },
  Viewer: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    entities: {
      add: vi.fn(),
      remove: vi.fn(),
      removeAll: vi.fn(),
      values: [],
    },
    imageryLayers: {
      add: vi.fn(),
      remove: vi.fn(),
      removeAll: vi.fn(),
    },
    camera: {
      setView: vi.fn(),
      flyToBoundingSphere: vi.fn(),
      pickEllipsoid: vi.fn(),
    },
    scene: {
      canvas: document.createElement('canvas'),
      pick: vi.fn(),
      globe: {
        ellipsoid: {},
      },
    },
  })),
  UrlTemplateImageryProvider: vi.fn(),
  ImageryLayer: vi.fn(),
  ScreenSpaceEventHandler: vi.fn().mockImplementation(() => ({
    setInputAction: vi.fn(),
    destroy: vi.fn(),
  })),
  ScreenSpaceEventType: {
    LEFT_CLICK: 'LEFT_CLICK',
    MOUSE_MOVE: 'MOUSE_MOVE',
  },
  Cartesian3: {
    fromDegrees: vi.fn(),
  },
  Color: {
    WHITE: {},
    BLACK: {},
    BLUE: {
      withAlpha: vi.fn().mockReturnValue({}),
    },
  },
  VerticalOrigin: {
    BOTTOM: 'BOTTOM',
    CENTER: 'CENTER',
  },
  LabelStyle: {
    FILL_AND_OUTLINE: 'FILL_AND_OUTLINE',
  },
  Cartesian2: vi.fn(),
  NearFarScalar: vi.fn(),
  PolylineDashMaterialProperty: vi.fn(),
  Cartographic: {
    fromCartesian: vi.fn(),
  },
  Math: {
    toDegrees: vi.fn(),
  },
  BoundingSphere: {
    fromPoints: vi.fn(),
  },
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

describe('Basic Integration Tests', () => {
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
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      });
    });
  });

  it('renders login page by default', async () => {
    const { getByText } = render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    expect(getByText('登录')).toBeInTheDocument();
  });

  it('renders app without crashing', () => {
    const { getByText } = render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    
    expect(getByText('登录')).toBeInTheDocument();
  });
});
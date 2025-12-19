# GeoAlbum Frontend

This is the React + TypeScript frontend for the GeoAlbum geographic photo management system.

## Architecture Overview

The frontend is built with:
- **React 19.2.0** with functional components and hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Router DOM** for client-side routing
- **Leaflet + React-Leaflet** for map functionality (ready for integration)
- **Vite** for fast development and building

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── hooks/              # Custom React hooks
│   ├── useApi.ts
│   └── useLocalStorage.ts
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── MapPage.tsx
├── services/           # API and external services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── index.ts
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Key Features Implemented

### 1. Authentication System
- JWT-based authentication with automatic token management
- Login and registration pages with form validation
- Protected routes that redirect to login when not authenticated
- Persistent authentication state using localStorage

### 2. API Client
- Centralized API client with automatic token handling
- Type-safe API methods for all backend endpoints
- Error handling and response parsing
- Support for file uploads (multipart/form-data)

### 3. React Router Setup
- Client-side routing with React Router DOM
- Protected route wrapper component
- Automatic redirects for authenticated/unauthenticated users
- Fallback routing for unknown paths

### 4. TypeScript Configuration
- Strict TypeScript configuration with comprehensive type definitions
- Separate types for API requests/responses and UI state
- Type-safe hooks and components

### 5. Tailwind CSS Integration
- Utility-first CSS framework setup
- Custom styles for map components and UI elements
- Responsive design utilities
- Dark mode support ready

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend is configured to proxy API requests to `http://localhost:8080` during development. All API endpoints are prefixed with `/api/`.

### Authentication Flow
1. User submits login/register form
2. API client sends request to backend
3. On success, JWT token and user data are stored
4. Token is automatically included in subsequent API requests
5. On logout, token and user data are cleared

### Error Handling
- Network errors are caught and displayed to users
- API errors are parsed and shown with appropriate messages
- Authentication errors trigger automatic logout and redirect

## Next Steps

This frontend infrastructure is ready for the following components to be implemented:

1. **Map Component** - Interactive Leaflet map with album markers
2. **Timeline Component** - Time-based filtering and navigation
3. **Album Panel** - Album details and photo management
4. **Photo Upload** - Drag-and-drop photo upload interface
5. **Path Visualization** - Travel path rendering on map

## Development Notes

- The app uses React 19's new features and strict mode
- All components are functional components using hooks
- State management is handled through React Context and custom hooks
- The build system is optimized for modern browsers
- Hot module replacement is enabled for fast development
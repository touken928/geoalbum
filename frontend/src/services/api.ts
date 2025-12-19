import type {
  Album,
  Photo,
  Path,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateAlbumRequest,
  UpdateAlbumRequest,
  CreatePathRequest,
  ApiError,
  TimeRange
} from '../types';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: Error) => boolean;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryCondition: (error: Error) => {
      // Retry on network errors and 5xx server errors
      return error.message.includes('Network error') || 
             error.message.includes('fetch') ||
             error.message.includes('HTTP 5');
    }
  };

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOptions: Partial<RetryOptions> = {}
  ): Promise<T> {
    const finalRetryOptions = { ...this.defaultRetryOptions, ...retryOptions };
    let lastError: Error;

    for (let attempt = 0; attempt <= finalRetryOptions.maxRetries; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on the last attempt or if retry condition is not met
        if (attempt === finalRetryOptions.maxRetries || 
            !finalRetryOptions.retryCondition?.(lastError)) {
          throw lastError;
        }

        // Calculate delay and wait before retry
        const delay = this.calculateDelay(
          attempt, 
          finalRetryOptions.baseDelay, 
          finalRetryOptions.maxDelay
        );
        
        console.warn(`API request failed (attempt ${attempt + 1}/${finalRetryOptions.maxRetries + 1}), retrying in ${delay}ms:`, lastError.message);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add any additional headers from options
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.error.message || errorMessage;
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }

        // Create specific error types for different status codes
        if (response.status === 401) {
          throw new Error(`认证失败: ${errorMessage}`);
        } else if (response.status === 403) {
          throw new Error(`权限不足: ${errorMessage}`);
        } else if (response.status === 404) {
          throw new Error(`资源未找到: ${errorMessage}`);
        } else if (response.status >= 500) {
          throw new Error(`服务器错误: ${errorMessage}`);
        } else {
          throw new Error(errorMessage);
        }
      }

      // Handle empty responses (e.g., DELETE requests)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查您的网络连接');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Don't retry authentication requests
    const response = await this.request<{ success: boolean; data: AuthResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return response.data;
  }

  async register(credentials: RegisterRequest): Promise<AuthResponse> {
    // Don't retry registration requests
    const response = await this.request<{ success: boolean; data: AuthResponse }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return response.data;
  }

  // Album endpoints
  async getAlbums(timeRange?: TimeRange): Promise<Album[]> {
    let endpoint = '/albums';
    
    if (timeRange) {
      const params = new URLSearchParams();
      params.append('start_date', timeRange.startDate.toISOString());
      params.append('end_date', timeRange.endDate.toISOString());
      endpoint += `?${params.toString()}`;
    }

    const response = await this.requestWithRetry<{ success: boolean; data: { albums: Album[] } }>(endpoint);
    return response.data.albums || [];
  }

  async getAlbum(id: string): Promise<Album> {
    const response = await this.requestWithRetry<{ success: boolean; data: Album }>(`/albums/${id}`);
    return response.data;
  }

  async createAlbum(albumData: CreateAlbumRequest): Promise<Album> {
    // Don't retry create operations to avoid duplicates
    const response = await this.request<{ success: boolean; data: Album }>('/albums', {
      method: 'POST',
      body: JSON.stringify(albumData),
    });
    return response.data;
  }

  async updateAlbum(id: string, albumData: UpdateAlbumRequest): Promise<Album> {
    const response = await this.request<{ success: boolean; data: Album }>(`/albums/${id}`, {
      method: 'PUT',
      body: JSON.stringify(albumData),
    });
    return response.data;
  }

  async deleteAlbum(id: string): Promise<void> {
    return this.request<void>(`/albums/${id}`, {
      method: 'DELETE',
    });
  }

  // Get the auth token for photo URLs
  getAuthToken(): string | null {
    return this.token;
  }

  // Build photo URL with auth token
  buildPhotoUrl(photoUrl: string): string {
    if (!this.token) return photoUrl;
    const separator = photoUrl.includes('?') ? '&' : '?';
    return `${photoUrl}${separator}token=${encodeURIComponent(this.token)}`;
  }

  // Photo endpoints
  async getAlbumPhotos(albumId: string): Promise<Photo[]> {
    const response = await this.requestWithRetry<{ photos: Photo[] }>(`/albums/${albumId}/photos`);
    const photos = response.photos || [];
    // Add auth token to photo URLs
    return photos.map(photo => ({
      ...photo,
      url: this.buildPhotoUrl(photo.url)
    }));
  }

  async uploadPhotos(albumId: string, files: File[]): Promise<Photo[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });

    // Use the multiple photos upload endpoint
    const response = await fetch(`${this.baseURL}/albums/${albumId}/photos/multiple`, {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const photos = result.photos || result.data?.photos || [];
    // Add auth token to photo URLs
    return photos.map((photo: Photo) => ({
      ...photo,
      url: this.buildPhotoUrl(photo.url)
    }));
  }

  async deletePhoto(photoId: string): Promise<void> {
    return this.request<void>(`/photos/${photoId}`, {
      method: 'DELETE',
    });
  }

  async updatePhotoOrder(photoId: string, order: number): Promise<Photo> {
    const response = await this.request<{ success: boolean; data: Photo }>(`/photos/${photoId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
    return response.data;
  }

  // Path endpoints
  async getPaths(): Promise<Path[]> {
    const response = await this.requestWithRetry<{ paths: Path[] }>('/paths');
    return response.paths || [];
  }

  async createPath(pathData: CreatePathRequest): Promise<Path> {
    const response = await this.request<{ success: boolean; data: Path }>('/paths', {
      method: 'POST',
      body: JSON.stringify(pathData),
    });
    return response.data;
  }

  async deletePath(pathId: string): Promise<void> {
    return this.request<void>(`/paths/${pathId}`, {
      method: 'DELETE',
    });
  }

  // Next destination endpoints
  async setNextDestination(albumId: string, destinationId: string): Promise<Path> {
    const response = await this.request<{ success: boolean; data: Path }>(`/albums/${albumId}/next-destination`, {
      method: 'POST',
      body: JSON.stringify({ to_album_id: destinationId }),
    });
    return response.data;
  }

  async getNextDestination(albumId: string): Promise<Album | null> {
    try {
      const response = await this.requestWithRetry<{ success: boolean; data: { next_destination: Album | null } }>(`/albums/${albumId}/next-destination`);
      return response.data.next_destination;
    } catch (error) {
      // Return null if no next destination exists
      return null;
    }
  }

  async removeNextDestination(albumId: string): Promise<void> {
    return this.request<void>(`/albums/${albumId}/next-destination`, {
      method: 'DELETE',
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { AnalysisResult, ApiResponse, UploadFormData } from '../types';

class ApiService {
  private api: AxiosInstance;
  private jsonApi: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Determine the appropriate base URL based on environment
    this.baseURL = this.determineBaseURL();
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT || '120000'), // Increased to 2 minutes
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Separate axios instance for JSON requests
    this.jsonApi = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT || '120000'),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log('API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log('API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );

    // JSON API interceptors
    this.jsonApi.interceptors.request.use(
      (config) => {
        console.log('JSON API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('JSON API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.jsonApi.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log('JSON API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('JSON API Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  private determineBaseURL(): string {
    // Priority order for API URL:
    // 1. Environment variable
    // 2. Development fallback
    // 3. Production fallback
    
    console.log('🔍 [API] Determining base URL...');
    
    const envURL = process.env.API_BASE_URL;
    if (envURL) {
      console.log('✅ [API] Using API URL from environment:', envURL);
      return envURL;
    }

    // Check if we're in development mode
    if (__DEV__) {
      console.log('🔧 [API] Development mode detected');
      // For development, try different common local IPs
      const localURLs = [
        'http://192.168.1.3:8000',
        'http://10.0.2.2:8000', // Android emulator
        'http://localhost:8000',
        'http://127.0.0.1:8000'
      ];
      
      console.log('📱 [API] Using local URL:', localURLs[0]);
      return localURLs[0];
    }

    // For production builds, use the correct IP address
    console.log('🚀 [API] Production build detected, using configured IP address.');
    const productionURL = 'http://192.168.1.3:8000';
    console.log('🌐 [API] Production URL:', productionURL);
    return productionURL;
  }

  // Health check endpoint
  async healthCheck(): Promise<ApiResponse> {
    try {
      console.log('🏥 [HEALTH] Starting health check...');
      console.log('🌐 [HEALTH] API Base URL:', this.baseURL);
      console.log('📡 [HEALTH] Making request to:', `${this.baseURL}/api/health`);
      
      const response = await this.api.get('/api/health');
      
      console.log('✅ [HEALTH] Health check successful!');
      console.log('📊 [HEALTH] Response status:', response.status);
      console.log('📄 [HEALTH] Response data:', response.data);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [HEALTH] Health check failed!');
      console.error('🚨 [HEALTH] Error type:', error.constructor.name);
      console.error('📡 [HEALTH] Error message:', error.message);
      console.error('🌐 [HEALTH] Request URL:', error.config?.url);
      console.error('📊 [HEALTH] Response status:', error.response?.status);
      console.error('📄 [HEALTH] Response data:', error.response?.data);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Upload video for analysis
  async uploadVideo(formData: UploadFormData): Promise<ApiResponse<AnalysisResult>> {
    try {
      // Create FormData for file upload
      const data = new FormData();
      
      // Add video file
      const videoFile = {
        uri: formData.video_uri,
        name: formData.video_name,
        type: formData.video_type,
      } as any;
      
      data.append('video', videoFile);
      data.append('player_type', formData.player_type);
      
      if (formData.player_type === 'batsman' && formData.batter_side) {
        data.append('batter_side', formData.batter_side);
      } else if (formData.player_type === 'bowler') {
        if (formData.bowler_side) {
          data.append('bowler_side', formData.bowler_side);
        }
        if (formData.bowler_type) {
          data.append('bowler_type', formData.bowler_type);
        }
      }

      const response = await this.api.post('/api/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload Progress:', progress + '%');
          }
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Upload Error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Get file info
  async getFileInfo(uri: string): Promise<{ size: number; type: string }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      
      return {
        size: fileInfo.size || 0,
        type: this.getMimeType(uri),
      };
    } catch (error) {
      console.error('File Info Error:', error);
      throw error;
    }
  }

  // Get MIME type from file extension
  private getMimeType(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      avi: 'video/avi',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      m4v: 'video/mp4',
      webm: 'video/webm',
    };
    
    return mimeTypes[extension || ''] || 'video/mp4';
  }

  // Validate video file
  validateVideoFile(uri: string, size: number): { isValid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedExtensions = ['mp4', 'avi', 'mov', 'mkv', 'm4v', 'webm'];
    
    const extension = uri.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: 'Invalid video format. Supported formats: MP4, AVI, MOV, MKV, M4V, WEBM',
      };
    }
    
    if (size > maxSize) {
      return {
        isValid: false,
        error: 'Video file too large. Maximum size: 100MB',
      };
    }
    
    return { isValid: true };
  }

  // Update base URL (for development)
  updateBaseURL(newURL: string) {
    this.baseURL = newURL;
    this.api.defaults.baseURL = newURL;
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL;
  }

  // Get analysis history
  async getAnalysisHistory(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/api/history');
      return {
        success: true,
        data: response.data.history || [],
      };
    } catch (error: any) {
      console.error('History Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Get specific analysis result
  async getAnalysisResult(filename: string): Promise<ApiResponse<AnalysisResult>> {
    try {
      const response = await this.api.get(`/api/results/${filename}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Get Result Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Generate training plan
  async generateTrainingPlan(filename: string, days: number = 7): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.post('/api/training-plan', {
        filename,
        days,
      });
      return {
        success: true,
        data: response.data.training_plan,
      };
    } catch (error: any) {
      console.error('Generate Training Plan Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Get training plan
  async getTrainingPlan(filename: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.get(`/api/training-plan/${filename}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      // 404 means no training plan exists yet, which is normal
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Training plan not found',
        };
      }
      console.error('Get Training Plan Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Authentication Methods
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<any>> {
    try {
      console.log('🔐 [LOGIN] Starting login process...');
      console.log('👤 [LOGIN] Username:', credentials.username);
      console.log('🌐 [LOGIN] API Base URL:', this.baseURL);
      console.log('📡 [LOGIN] Making request to:', `${this.baseURL}/api/auth/login`);
      
      const response = await this.jsonApi.post('/api/auth/login', credentials);
      
      console.log('✅ [LOGIN] Login successful!');
      console.log('📊 [LOGIN] Response status:', response.status);
      console.log('🔑 [LOGIN] Token received:', response.data.token ? 'Yes' : 'No');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [LOGIN] Login failed!');
      console.error('🚨 [LOGIN] Error type:', error.constructor.name);
      console.error('📡 [LOGIN] Error message:', error.message);
      console.error('🌐 [LOGIN] Request URL:', error.config?.url);
      console.error('📊 [LOGIN] Response status:', error.response?.status);
      console.error('📄 [LOGIN] Response data:', error.response?.data);
      console.error('🔧 [LOGIN] Error config:', {
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
        headers: error.config?.headers
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async register(userData: { username: string; email: string; password: string }): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.post('/api/auth/register', userData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Register Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async verifyToken(): Promise<ApiResponse<any>> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          error: 'No token found',
        };
      }

      const response = await this.jsonApi.get('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Token Verification Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async logout(): Promise<ApiResponse<any>> {
    try {
      console.log('=== LOGOUT PROCESS STARTED ===');
      
      const token = await this.getStoredToken();
      console.log('Stored token found:', token ? 'Yes' : 'No');
      
      if (token) {
        console.log('Calling backend logout endpoint...');
        await this.jsonApi.post('/api/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Backend logout call successful');
      } else {
        console.log('No token found, skipping backend call');
      }
      
      // Clear stored auth data
      console.log('Clearing auth data...');
      await this.clearAuthData();
      console.log('Auth data cleared successfully');
      
      return {
        success: true,
        data: { message: 'Logout successful' },
      };
    } catch (error: any) {
      console.error('Logout Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Clear auth data even if API call fails
      try {
        await this.clearAuthData();
        console.log('Auth data cleared after error');
      } catch (clearError) {
        console.error('Failed to clear auth data:', clearError);
      }
      
      return {
        success: true,
        data: { message: 'Logout successful' },
      };
    }
  }

  async deleteAccount(): Promise<ApiResponse<any>> {
    try {
      console.log('=== DELETE ACCOUNT PROCESS STARTED ===');
      
      const token = await this.getStoredToken();
      console.log('Stored token found:', token ? 'Yes' : 'No');
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
        };
      }
      
      console.log('Calling backend delete account endpoint...');
      const response = await this.jsonApi.post('/api/auth/delete-account', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Backend delete account call successful');
      
      // Clear stored auth data after successful deletion
      console.log('Clearing auth data after account deletion...');
      await this.clearAuthData();
      console.log('Auth data cleared successfully');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Delete Account Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Token Storage Methods
  async storeAuthData(token: string, user: any): Promise<void> {
    try {
      console.log('Storing auth data...');
      const authData = {
        token,
        user,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem('authData', JSON.stringify(authData));
      console.log('Auth data stored successfully');
      
      // Set default authorization header for future requests
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      this.jsonApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Authorization headers set');
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  }

  async getStoredToken(): Promise<string | null> {
    try {
      console.log('Getting stored token...');
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const parsed = JSON.parse(authData);
        console.log('Token retrieved successfully');
        return parsed.token;
      }
      console.log('No auth data found');
      return null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  async getStoredUser(): Promise<any | null> {
    try {
      console.log('Getting stored user...');
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const parsed = JSON.parse(authData);
        console.log('User data retrieved successfully');
        return parsed.user;
      }
      console.log('No user data found');
      return null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  async clearAuthData(): Promise<void> {
    try {
      console.log('Clearing auth data from AsyncStorage...');
      await AsyncStorage.removeItem('authData');
      console.log('AsyncStorage cleared successfully');
      
      // Clear authorization headers
      delete this.api.defaults.headers.common['Authorization'];
      delete this.jsonApi.defaults.headers.common['Authorization'];
      console.log('Authorization headers cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  }

  // Initialize auth headers on app start
  async initializeAuth(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        this.jsonApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  // Initialize API service and log configuration
  initialize(): void {
    console.log('🚀 [APP] Initializing API Service...');
    console.log('🌐 [APP] Base URL:', this.baseURL);
    console.log('🔧 [APP] Development mode:', __DEV__);
    console.log('📱 [APP] Platform:', Platform.OS);
    console.log('📦 [APP] API timeout:', this.api.defaults.timeout);
    
    // Test the API configuration
    this.healthCheck().then(response => {
      if (response.success) {
        console.log('✅ [APP] API health check passed');
      } else {
        console.log('❌ [APP] API health check failed:', response.error);
      }
    }).catch(error => {
      console.log('🚨 [APP] API health check error:', error.message);
    });
  }
}

export default new ApiService(); 
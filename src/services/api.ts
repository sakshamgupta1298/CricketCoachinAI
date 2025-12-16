import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { currentConfig } from '../../config';
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
      // Don't set Content-Type here - let FormData set it automatically with boundary
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      // React Native specific configuration
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      // Override default transformRequest to handle FormData properly
      transformRequest: [
        (data: any, headers: any) => {
          // Check if this is FormData - React Native FormData detection
          const isFormData = data instanceof FormData || 
                            (data && data.constructor && data.constructor.name === 'FormData');
          
          if (isFormData) {
            // Remove Content-Type - FormData will set it with boundary
            if (headers) {
              delete headers['Content-Type'];
              delete headers['content-type'];
            }
            // Return FormData as-is - don't serialize it
            return data;
          }
          
          // For non-FormData, use default axios serialization
          // This will handle JSON.stringify for objects
          if (typeof data === 'object' && !(data instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            return JSON.stringify(data);
          }
          
          return data;
        }
      ],
    });

    // Separate axios instance for JSON requests
    this.jsonApi = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT || '120000'),
      headers: {
        'Content-Type': 'application/json',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: (status) => status < 500,
    });

    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Automatically add Authorization header if not already present
        if (!config.headers['Authorization']) {
          const token = await this.getStoredToken();
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('🔑 [API_REQUEST] Added Authorization header from storage');
          }
        }
        
        // CRITICAL: If data is FormData, remove Content-Type header
        // FormData must set Content-Type itself with the proper boundary
        // React Native FormData detection - check multiple ways
        const isFormData = config.data && (
          config.data instanceof FormData || 
          (typeof FormData !== 'undefined' && config.data.constructor?.name === 'FormData') ||
          (config.data.constructor && config.data.constructor.name === 'FormData') ||
          (config.url && config.url.includes('/api/upload')) // Upload endpoint always uses FormData
        );
        
        if (isFormData) {
          console.log('📎 [API_REQUEST] FormData detected - removing Content-Type header');
          console.log('📎 [API_REQUEST] FormData check details:', {
            instanceof: config.data instanceof FormData,
            constructorName: config.data?.constructor?.name,
            url: config.url
          });
          
          // Remove Content-Type from all possible locations
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
          delete config.headers['Content-type'];
          delete config.headers['CONTENT-TYPE'];
          
          // Also remove from common headers if present
          if (config.headers.common) {
            delete config.headers.common['Content-Type'];
            delete config.headers.common['content-type'];
          }
          
          // Don't set Content-Type at all - let FormData handle it
          // But we need to ensure axios doesn't set it automatically
          // Note: Upload endpoint uses native fetch API, so this interceptor
          // mainly handles other endpoints that might use FormData
        }
        
        console.log('📤 [API_REQUEST] Making request:', config.method?.toUpperCase(), config.url);
        console.log('🔧 [API_REQUEST] Request config:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullURL: (config.baseURL || '') + (config.url || ''),
          timeout: config.timeout,
          hasAuth: !!config.headers['Authorization'],
          isFormData: config.data instanceof FormData || (typeof FormData !== 'undefined' && config.data?.constructor?.name === 'FormData'),
          headers: config.headers,
          data: config.data instanceof FormData ? 'FormData' : config.data
        });
        return config;
      },
      (error) => {
        console.error('❌ [API_REQUEST] Request interceptor error:', error);
        console.error('📋 [API_REQUEST] Error details:', JSON.stringify(error, null, 2));
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ [API_RESPONSE] Response received:', response.status, response.config.url);
        return response;
      },
      async (error) => {
        console.error('❌ [API_RESPONSE] Response interceptor error:', error);
        
        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          console.error('🔒 [API_RESPONSE] Authentication failed - clearing auth data');
          // Clear auth data on 401 error
          try {
            await this.clearAuthData();
            console.log('🧹 [API_RESPONSE] Auth data cleared due to 401 error');
          } catch (clearError) {
            console.error('❌ [API_RESPONSE] Failed to clear auth data:', clearError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    // JSON API request interceptor
    this.jsonApi.interceptors.request.use(
      async (config) => {
        // Automatically add Authorization header if not already present
        if (!config.headers['Authorization']) {
          const token = await this.getStoredToken();
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('🔑 [JSON_API_REQUEST] Added Authorization header from storage');
          }
        }
        
        console.log('📤 [JSON_API_REQUEST] Making JSON request:', config.method?.toUpperCase(), config.url);
        console.log('🔧 [JSON_API_REQUEST] Request config:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullURL: (config.baseURL || '') + (config.url || ''),
          timeout: config.timeout,
          hasAuth: !!config.headers['Authorization'],
          headers: config.headers,
          data: config.data
        });
        return config;
      },
      (error) => {
        console.error('❌ [JSON_API_REQUEST] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // JSON API response interceptor
    this.jsonApi.interceptors.response.use(
      (response) => {
        console.log('✅ [JSON_API_RESPONSE] JSON response received:', response.status, response.config.url);
        return response;
      },
      async (error) => {
        console.error('❌ [JSON_API_RESPONSE] Response interceptor error:', error, error.message);
        console.error('📋 [JSON_API_RESPONSE] Complete error object:', JSON.stringify(error, null, 2));
        console.error('🔍 [JSON_API_RESPONSE] Error stack trace:', error.stack);
        
        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          console.error('🔒 [JSON_API_RESPONSE] Authentication failed - clearing auth data');
          // Clear auth data on 401 error
          try {
            await this.clearAuthData();
            console.log('🧹 [JSON_API_RESPONSE] Auth data cleared due to 401 error');
          } catch (clearError) {
            console.error('❌ [JSON_API_RESPONSE] Failed to clear auth data:', clearError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private determineBaseURL(): string {
    // Use the configuration from config.js
    console.log('🔍 [API] Determining base URL...');
    console.log('🔧 [API] __DEV__:', __DEV__);
    console.log('📱 [API] Platform:', Platform.OS);
    
    // Use the currentConfig from config.js
    const configURL = currentConfig.API_BASE_URL;
    console.log('✅ [API] Using API URL from config:', configURL);
    
    // Add additional logging for debugging
    console.log('🌐 [API] Full URL will be:', configURL);
    console.log('📱 [API] Platform details:', {
      platform: Platform.OS,
      version: Platform.Version,
      isDev: __DEV__
    });
    
    return configURL;
  }

  // Health check endpoint
  async healthCheck(): Promise<ApiResponse> {
    try {
      console.log('🏥 [HEALTH] Starting health check...');
      console.log('🌐 [HEALTH] API Base URL:', this.baseURL);
      console.log('📡 [HEALTH] Making request to:', `${this.baseURL}/api/health`);
      console.log('🔧 [HEALTH] Request config:', {
        method: 'GET',
        url: '/api/health',
        baseURL: this.baseURL,
        timeout: this.api.defaults.timeout,
        headers: this.api.defaults.headers
      });
      
      const response = await this.api.get('/api/health');
      
      console.log('✅ [HEALTH] Health check successful!');
      console.log('📊 [HEALTH] Response status:', response.status);
      console.log('📄 [HEALTH] Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('📋 [HEALTH] Response data:', JSON.stringify(response.data, null, 2));
      
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
      
      // Log complete error details
      console.error('📋 [HEALTH] Complete error object:', JSON.stringify(error, null, 2));
      console.error('🔍 [HEALTH] Error stack trace:', error.stack);
      
      // Log network-specific details
      if (error.code) {
        console.error('🌐 [HEALTH] Network error code:', error.code);
      }
      if (error.errno) {
        console.error('🌐 [HEALTH] Network errno:', error.errno);
      }
      if (error.syscall) {
        console.error('🌐 [HEALTH] Network syscall:', error.syscall);
      }
      if (error.hostname) {
        console.error('🌐 [HEALTH] Network hostname:', error.hostname);
      }
      if (error.port) {
        console.error('🌐 [HEALTH] Network port:', error.port);
      }
      
      // Log request details
      console.error('📤 [HEALTH] Request details:', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
        timeout: error.config?.timeout,
        headers: error.config?.headers
      });
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Upload video for analysis with retry logic
  async uploadVideo(formData: UploadFormData, retryCount: number = 0): Promise<ApiResponse<AnalysisResult>> {
    const maxRetries = 2;
    
    try {
      // Ensure we have the authentication token
      const token = await this.getStoredToken();
      if (!token) {
        console.error('❌ [UPLOAD] No authentication token found');
        return {
          success: false,
          error: 'Authentication required. Please login first.',
        };
      }

      // Check connectivity before upload (only on first attempt)
      if (retryCount === 0) {
        console.log('🔍 [UPLOAD] Checking connectivity before upload...');
        const healthCheck = await this.healthCheck();
        if (!healthCheck.success) {
          console.error('❌ [UPLOAD] Connectivity check failed:', healthCheck.error);
          return {
            success: false,
            error: 'Cannot connect to server. Please check your internet connection and try again.',
          };
        }
        console.log('✅ [UPLOAD] Connectivity check passed');
      }

      // Verify token is still valid before upload
      console.log('🔍 [UPLOAD] Verifying token before upload...');
      const tokenVerification = await this.verifyToken();
      if (!tokenVerification.success) {
        console.error('❌ [UPLOAD] Token verification failed:', tokenVerification.error);
        // Clear invalid auth data
        await this.clearAuthData();
        return {
          success: false,
          error: 'Your session has expired. Please login again.',
        };
      }
      console.log('✅ [UPLOAD] Token verified successfully');

      // Create FormData for file upload
      // IMPORTANT: Use the global FormData from React Native, not a polyfill
      const data = new FormData();
      
      // Verify FormData is available
      if (typeof FormData === 'undefined') {
        console.error('❌ [UPLOAD] FormData is not available!');
        return {
          success: false,
          error: 'FormData is not supported in this environment',
        };
      }
      
      // Add video file - React Native FormData format
      // For React Native, we need to use the file URI directly
      // The format should be compatible with React Native's FormData implementation
      const videoFile = {
        uri: formData.video_uri,
        name: formData.video_name || 'video.mp4',
        type: formData.video_type || 'video/mp4',
      } as any;
      
      console.log('📎 [UPLOAD] FormData file object:', {
        uri: formData.video_uri,
        name: videoFile.name,
        type: videoFile.type,
        size: formData.video_size
      });
      console.log('📎 [UPLOAD] FormData instance check:', data instanceof FormData);
      console.log('📎 [UPLOAD] FormData constructor:', data.constructor?.name);
      
      // Append fields to FormData
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
        } else {
          console.warn('⚠️ [UPLOAD] bowler_type not provided, backend will use default');
        }
      }
      
      // Log FormData contents for debugging
      console.log('📋 [UPLOAD] FormData fields:', {
        player_type: formData.player_type,
        batter_side: formData.batter_side,
        bowler_side: formData.bowler_side,
        bowler_type: formData.bowler_type,
        has_video: !!videoFile
      });

      console.log('📤 [UPLOAD] Making upload request (attempt ' + (retryCount + 1) + ')');
      console.log('🔧 [UPLOAD] Request config:', {
        baseURL: this.baseURL,
        url: '/api/upload',
        fullURL: `${this.baseURL}/api/upload`,
        timeout: 600000,
        hasAuth: !!token,
      });
      console.log('⏱️ [UPLOAD] Timeout set to 10 minutes');

      // For React Native, we need to ensure FormData is sent correctly
      // CRITICAL: Do NOT set Content-Type header - FormData will set it automatically with boundary
      // We need to explicitly prevent axios from setting Content-Type
      const headers: any = {
        'Authorization': `Bearer ${token}`,
      };
      
      // Explicitly do NOT set Content-Type - FormData must set it with boundary
      // Setting it to undefined or deleting it might not work, so we'll handle it in transformRequest
      
      console.log('📤 [UPLOAD] Making request with FormData');
      console.log('📤 [UPLOAD] FormData type check:', data instanceof FormData);
      console.log('📤 [UPLOAD] FormData constructor name:', data.constructor?.name);
      console.log('📤 [UPLOAD] Using native fetch API for FormData upload');
      
      // Use native fetch API for FormData uploads - it handles FormData correctly
      // axios has issues with React Native FormData and Content-Type headers
      const uploadUrl = `${this.baseURL}/api/upload`;
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
      
      try {
        const fetchResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // DO NOT set Content-Type - fetch will set it automatically with boundary for FormData
          },
          body: data, // FormData - fetch handles this correctly
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is ok
        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Upload failed with status ${fetchResponse.status}`);
        }
        
        const responseData = await fetchResponse.json();
        
        console.log('✅ [UPLOAD] Upload successful via fetch API');
        return {
          success: true,
          data: responseData,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Upload timed out after 10 minutes');
        }
        
        throw error;
      }
    } catch (error: any) {
      console.error('❌ [UPLOAD] Upload Error (attempt ' + (retryCount + 1) + '):', error);
      console.error('📋 [UPLOAD] Error details:', JSON.stringify({
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          headers: error.config?.headers,
        },
        request: {
          data: error.request?.data ? 'FormData present' : 'No data',
        }
      }, null, 2));
      
      // Log the actual error response if available
      if (error.response) {
        console.error('📄 [UPLOAD] Response status:', error.response.status);
        console.error('📄 [UPLOAD] Response headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('📄 [UPLOAD] Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Log request details for debugging
      if (error.config) {
        console.error('📤 [UPLOAD] Request URL:', error.config.baseURL + error.config.url);
        console.error('📤 [UPLOAD] Request method:', error.config.method);
        console.error('📤 [UPLOAD] Request headers:', JSON.stringify(error.config.headers, null, 2));
      }
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please login again.',
        };
      }
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Upload timed out. The video is being processed in the background. Please check your results later.',
        };
      }
      
      // Handle network errors with retry logic
      if ((error.message.includes('Network Error') || error.code === 'ERR_NETWORK') && retryCount < maxRetries) {
        console.log(`🔄 [UPLOAD] Retrying upload (${retryCount + 1}/${maxRetries})...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return this.uploadVideo(formData, retryCount + 1);
      }
      
      // Final network error after retries
      if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
        return {
          success: false,
          error: 'Network connection failed. Please check your internet connection and try again.',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Upload failed. Please try again.',
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

  // Clear analysis history
  async clearAnalysisHistory(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete('/api/history/clear');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Clear History Error:', error);
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
      console.log('📋 [LOGIN] Request payload:', JSON.stringify(credentials, null, 2));
      console.log('🔧 [LOGIN] Request config:', {
        method: 'POST',
        url: '/api/auth/login',
        baseURL: this.baseURL,
        timeout: this.jsonApi.defaults.timeout,
        headers: this.jsonApi.defaults.headers
      });
      
      const response = await this.jsonApi.post('/api/auth/login', credentials);
      
      console.log('✅ [LOGIN] Login successful!');
      console.log('📊 [LOGIN] Response status:', response.status);
      console.log('📄 [LOGIN] Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('🔑 [LOGIN] Token received:', response.data.token ? 'Yes' : 'No');
      console.log('📋 [LOGIN] Response data:', JSON.stringify(response.data, null, 2));
      
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
        headers: error.config?.headers,
        url: error.config?.url,
        data: error.config?.data
      });
      
      // Log complete error details
      console.error('📋 [LOGIN] Complete error object:', JSON.stringify(error, null, 2));
      console.error('🔍 [LOGIN] Error stack trace:', error.stack);
      
      // Log network-specific details
      if (error.code) {
        console.error('🌐 [LOGIN] Network error code:', error.code);
      }
      if (error.errno) {
        console.error('🌐 [LOGIN] Network errno:', error.errno);
      }
      if (error.syscall) {
        console.error('🌐 [LOGIN] Network syscall:', error.syscall);
      }
      if (error.hostname) {
        console.error('🌐 [LOGIN] Network hostname:', error.hostname);
      }
      if (error.port) {
        console.error('🌐 [LOGIN] Network port:', error.port);
      }
      
      // Log request details
      console.error('📤 [LOGIN] Request details:', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
        timeout: error.config?.timeout,
        headers: error.config?.headers,
        data: error.config?.data
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
    
    // Test network connectivity
    this.testConnectivity().then(response => {
      if (response.success) {
        console.log('✅ [APP] Network connectivity test passed');
      } else {
        console.log('❌ [APP] Network connectivity test failed:', response.error);
        console.log('⚠️ [APP] This might indicate a network configuration issue');
      }
    }).catch(error => {
      console.log('🚨 [APP] Network connectivity test error:', error.message);
    });
  }

  // Test network connectivity
  async testConnectivity(): Promise<ApiResponse> {
    try {
      console.log('🌐 [CONNECTIVITY] Testing network connectivity...');
      console.log('📡 [CONNECTIVITY] Target URL:', this.baseURL);
      console.log('🔧 [CONNECTIVITY] Request config:', {
        method: 'GET',
        url: '/api/health',
        baseURL: this.baseURL,
        timeout: 10000,
        headers: this.api.defaults.headers
      });
      
      const response = await this.api.get('/api/health', {
        timeout: 10000, // 10 second timeout
      });
      
      console.log('✅ [CONNECTIVITY] Network test successful!');
      console.log('📊 [CONNECTIVITY] Response status:', response.status);
      console.log('📄 [CONNECTIVITY] Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('📋 [CONNECTIVITY] Response data:', JSON.stringify(response.data, null, 2));
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [CONNECTIVITY] Network test failed!');
      console.error('🚨 [CONNECTIVITY] Error type:', error.constructor.name);
      console.error('📡 [CONNECTIVITY] Error message:', error.message);
      console.error('🌐 [CONNECTIVITY] Request URL:', error.config?.url);
      console.error('📊 [CONNECTIVITY] Response status:', error.response?.status);
      console.error('📄 [CONNECTIVITY] Response data:', error.response?.data);
      
      // Log complete error details
      console.error('📋 [CONNECTIVITY] Complete error object:', JSON.stringify(error, null, 2));
      console.error('🔍 [CONNECTIVITY] Error stack trace:', error.stack);
      
      // Log network-specific details
      if (error.code) {
        console.error('🌐 [CONNECTIVITY] Network error code:', error.code);
      }
      if (error.errno) {
        console.error('🌐 [CONNECTIVITY] Network errno:', error.errno);
      }
      if (error.syscall) {
        console.error('🌐 [CONNECTIVITY] Network syscall:', error.syscall);
      }
      if (error.hostname) {
        console.error('🌐 [CONNECTIVITY] Network hostname:', error.hostname);
      }
      if (error.port) {
        console.error('🌐 [CONNECTIVITY] Network port:', error.port);
      }
      
      // Log request details
      console.error('📤 [CONNECTIVITY] Request details:', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
        timeout: error.config?.timeout,
        headers: error.config?.headers
      });
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

export default new ApiService(); 
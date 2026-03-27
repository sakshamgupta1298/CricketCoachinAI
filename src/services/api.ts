import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { currentConfig } from '../../config';
import { AnalysisResult, ApiResponse, JobStatusResponse, UploadFormData, UploadJobResponse } from '../types';

class ApiService {
  private api: AxiosInstance;
  private jsonApi: AxiosInstance;
  private baseURL: string;
  private onUnauthorizedCallback: (() => void) | null = null;

  /** Call when auth is invalid/expired so the app can log the user out (e.g. dispatch LOGOUT). */
  setOnUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback;
  }

  private notifyUnauthorized(): void {
    this.onUnauthorizedCallback?.();
  }

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
      async (response) => {
        console.log('✅ [API_RESPONSE] Response received:', response.status, response.config.url);
        
        // Refresh token expiration on successful authenticated requests
        if (response.status === 200 && response.config.headers['Authorization']) {
          await this.refreshTokenExpiration();
        }
        
        return response;
      },
      async (error) => {
        console.error('❌ [API_RESPONSE] Response interceptor error:', error);
        
        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          console.error('🔒 [API_RESPONSE] Authentication failed - clearing auth data');
          try {
            await this.clearAuthData();
            console.log('🧹 [API_RESPONSE] Auth data cleared due to 401 error');
            this.notifyUnauthorized();
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
      async (response) => {
        console.log('✅ [JSON_API_RESPONSE] JSON response received:', response.status, response.config.url);
        
        // Refresh token expiration on successful authenticated requests
        if (response.status === 200 && response.config.headers['Authorization']) {
          await this.refreshTokenExpiration();
        }
        
        return response;
      },
      async (error) => {
        console.error('❌ [JSON_API_RESPONSE] Response interceptor error:', error, error.message);
        console.error('📋 [JSON_API_RESPONSE] Complete error object:', JSON.stringify(error, null, 2));
        console.error('🔍 [JSON_API_RESPONSE] Error stack trace:', error.stack);
        
        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          console.error('🔒 [JSON_API_RESPONSE] Authentication failed - clearing auth data');
          try {
            await this.clearAuthData();
            console.log('🧹 [JSON_API_RESPONSE] Auth data cleared due to 401 error');
            this.notifyUnauthorized();
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
  async uploadVideo(formData: UploadFormData, retryCount: number = 0): Promise<ApiResponse<UploadJobResponse>> {
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
        // Clear invalid auth data and log user out
        await this.clearAuthData();
        this.notifyUnauthorized();
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

      // Optional: attach Expo push token so backend can notify when analysis is ready
      const expoPushToken = await this.getStoredPushToken();
      if (expoPushToken) {
        console.log('🔔 [UPLOAD] Attaching Expo push token to upload:', expoPushToken);
        data.append('expo_push_token', expoPushToken);
      } else {
        console.log('🔕 [UPLOAD] No Expo push token found in storage (notifications may be disabled)');
      }
      
      if (formData.player_type === 'batsman' && formData.batter_side) {
        data.append('batter_side', formData.batter_side);
        // Include shot_type if provided (optional - if not provided, backend will auto-detect)
        if (formData.shot_type) {
          data.append('shot_type', formData.shot_type);
        }
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
        shot_type: formData.shot_type, // Log shot_type if provided
        has_video: !!videoFile
      });

      console.log('📤 [UPLOAD] Making upload request (attempt ' + (retryCount + 1) + ')');
      console.log('🔧 [UPLOAD] Request config:', {
        baseURL: this.baseURL,
        url: '/api/upload',
        fullURL: `${this.baseURL}/api/upload`,
        timeout: 180000, // 3 minutes - backend returns job_id immediately
        hasAuth: !!token,
      });
      console.log('⏱️ [UPLOAD] Timeout: 3 minutes (backend returns job_id immediately after file save)');

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
      // Reduced timeout: backend returns job_id immediately after saving file (not waiting for analysis)
      // 3 minutes should be enough for file upload even for large videos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes (enough for file upload)
      
      try {
        console.log('🌐 [UPLOAD] Starting fetch request to:', uploadUrl);
        console.log('⏱️ [UPLOAD] Timeout: 3 minutes (backend returns job_id immediately after file save)');
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
        
        console.log('📡 [UPLOAD] Fetch response received:', {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          ok: fetchResponse.ok,
          headers: Object.fromEntries(fetchResponse.headers.entries())
        });
        
        // Check if response is ok
        if (!fetchResponse.ok) {
          let errorMessage = `Upload failed with status ${fetchResponse.status}`;
          try {
            const errorText = await fetchResponse.text();
            console.error('❌ [UPLOAD] Error response text:', errorText);
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || errorMessage;
              console.error('❌ [UPLOAD] Error response JSON:', errorData);
            } catch (parseError) {
              // If not JSON, use the text as error message
              errorMessage = errorText || errorMessage;
            }
          } catch (textError) {
            console.error('❌ [UPLOAD] Failed to read error response:', textError);
          }
          throw new Error(errorMessage);
        }
        
        // Parse successful response (job enqueue response)
        let responseData;
        try {
          const responseText = await fetchResponse.text();
          console.log('📄 [UPLOAD] Response text length:', responseText.length);
          responseData = JSON.parse(responseText);
          console.log('✅ [UPLOAD] Response parsed successfully');
        } catch (parseError) {
          console.error('❌ [UPLOAD] Failed to parse response as JSON:', parseError);
          throw new Error('Invalid response format from server');
        }
        
        console.log('✅ [UPLOAD] Upload successful via fetch API (job enqueued)');
        return {
          success: true,
          data: responseData,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        console.error('❌ [UPLOAD] Fetch error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        });
        
        if (error.name === 'AbortError') {
          // If upload timed out, the file might still have been uploaded and job created
          // The app will poll for status, so this is recoverable
          throw new Error('Upload timed out. If the file was uploaded, check your results later.');
        }
        
        // Handle network errors
        if (error.message.includes('Network request failed') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
          throw new Error('Network connection failed. Please check your internet connection and try again.');
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
      
      // Axios validateStatus allows 4xx responses through (no throw),
      // so we must treat non-200 as failure to avoid returning [] on 401.
      if (response.status !== 200) {
        return {
          success: false,
          error: response.data?.error || response.data?.message || `Failed to load history (${response.status})`,
        };
      }

      const history = response.data?.history;
      return {
        success: true,
        data: Array.isArray(history) ? history : [],
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

  // Get analysis result by filename (backward compatibility)
  async getAnalysisResult(filename: string): Promise<ApiResponse<AnalysisResult>> {
    try {
      const response = await this.api.get(`/api/results/by-filename/${filename}`);
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

  // Get job status/result by job_id (async analysis)
  async getJobResult(jobId: string): Promise<ApiResponse<JobStatusResponse>> {
    try {
      const response = await this.api.get(`/api/results/${jobId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Get Job Result Error:', error);
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

  // Compare two videos
  async compareVideos(filename1: string, filename2: string): Promise<ApiResponse<any>> {
    try {
      console.log('🔍 [COMPARE] Comparing videos:', filename1, 'vs', filename2);
      const response = await this.jsonApi.post('/api/compare', {
        filename1,
        filename2,
      }, {
        timeout: 180000, // 3 minutes timeout for comparison
      });
      // Backend returns { success: true, comparison: {...} }
      // Extract the comparison object directly
      const comparisonData = response.data?.comparison || response.data;
      return {
        success: true,
        data: comparisonData,
      };
    } catch (error: any) {
      console.error('Compare Videos Error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 502) {
        return {
          success: false,
          error: 'Server error: The comparison service is temporarily unavailable. Please try again in a few moments.',
        };
      }
      
      if (error.response?.status === 504 || error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Comparison request timed out. This may happen with complex analyses. Please try again.',
        };
      }
      
      if (error.response?.status === 500) {
        return {
          success: false,
          error: error.response?.data?.error || 'Server error during comparison. Please try again.',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to compare videos. Please check your connection and try again.',
      };
    }
  }

  async processBallSpeedFrame(payload: {
    session_id: string;
    image_base64: string;
    meters_per_pixel?: number;
    pitch_pixel_length?: number;
    /** Used server-side for dt; avoids network jitter (prefer frame_interval_ms or camera_fps). */
    frame_interval_ms?: number;
    camera_fps?: number;
    confidence?: number;
    yolo_stride?: number;
    class_id?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.post('/api/ball-speed/frame', payload, {
        timeout: 20000,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Ball Speed Frame Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to process ball speed frame.',
      };
    }
  }

  async getBallSpeedStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.get('/api/ball-speed/status', {
        timeout: 10000,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Ball Speed Status Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch ball speed status.',
      };
    }
  }

  async startBallSpeedSession(sessionId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.post('/api/ball-speed/session/start', { session_id: sessionId }, {
        timeout: 10000,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Start Ball Speed Session Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to start ball speed session.',
      };
    }
  }

  async endBallSpeedSession(sessionId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.delete(`/api/ball-speed/session/${sessionId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('End Ball Speed Session Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to end ball speed session.',
      };
    }
  }

  async finalizeBallSpeedSession(
    sessionId: string,
    payload: { meters_per_pixel?: number; pitch_pixel_length?: number; frame_interval_ms?: number; camera_fps?: number }
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.jsonApi.post(`/api/ball-speed/session/${sessionId}/finalize`, payload, {
        timeout: 20000,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Finalize Ball Speed Session Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to finalize ball speed session.',
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
      
      // Check response status - handle 401/400 errors properly
      if (response.status === 401 || response.status === 400) {
        console.error('❌ [LOGIN] Login failed - Invalid credentials');
        console.error('📊 [LOGIN] Response status:', response.status);
        console.error('📄 [LOGIN] Response data:', response.data);
        
        const errorMessage = response.data?.error || 'Invalid username or password. Please check your credentials or sign up if you don\'t have an account.';
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // Check if response has success flag and token
      if (!response.data?.token || !response.data?.success) {
        console.error('❌ [LOGIN] Login failed - No token or success flag in response');
        console.error('📄 [LOGIN] Response data:', response.data);
        return {
          success: false,
          error: response.data?.error || 'Login failed. Please try again or sign up if you don\'t have an account.',
        };
      }
      
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
      
      // Determine error message based on error type
      let errorMessage = 'Network error. Please try again.';
      
      // Check if it's a network connectivity error
      if (!error.response) {
        // No response means network error (connection refused, timeout, DNS error, etc.)
        const errorCode = error.code || error.message || '';
        const errorMessageStr = error.message || '';
        const baseURL = error.config?.baseURL || this.baseURL;
        
        // Check for SSL/certificate errors first
        if (errorCode.includes('CERT') || errorCode.includes('SSL') || 
            errorCode.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
            errorCode.includes('SELF_SIGNED_CERT') ||
            errorMessageStr.includes('certificate') || 
            errorMessageStr.includes('SSL') ||
            errorMessageStr.includes('TLS')) {
          errorMessage = `SSL/Certificate error connecting to ${baseURL}. The server may not have a valid SSL certificate configured. Please verify HTTPS is properly set up on the server, or use HTTP if SSL is not configured.`;
        } else if (errorCode.includes('ECONNREFUSED') || errorCode.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = `Cannot connect to server at ${baseURL}. Please check if the backend is running and the URL is correct.`;
        } else if (errorCode.includes('ENOTFOUND') || errorCode.includes('ERR_NAME_NOT_RESOLVED')) {
          errorMessage = `Cannot resolve server address ${baseURL}. Please check your internet connection or verify the domain name is correct.`;
        } else if (errorCode.includes('ETIMEDOUT') || errorCode.includes('ERR_TIMED_OUT') || errorCode.includes('timeout')) {
          errorMessage = `Connection timeout. The server at ${baseURL} is not responding. Please check if the backend is running.`;
        } else if (errorCode.includes('ECONNABORTED')) {
          errorMessage = `Request timeout. The server took too long to respond.`;
        } else if (errorCode.includes('ERR_NETWORK') || errorCode.includes('Network Error') || errorMessageStr === 'Network Error') {
          // Generic network error - provide more helpful message
          if (baseURL.startsWith('https://')) {
            errorMessage = `HTTPS connection failed to ${baseURL}. This could mean:\n1. The server doesn't have HTTPS configured\n2. SSL certificate is invalid or expired\n3. Server is not accessible\n\nTry using HTTP instead if SSL is not configured: ${baseURL.replace('https://', 'http://')}`;
          } else {
            errorMessage = `Network error. Cannot reach server at ${baseURL}. Please check:\n1. Your internet connection\n2. The backend server is running\n3. The URL is correct`;
          }
        } else {
          errorMessage = `Network error: ${error.message || errorCode}. Cannot connect to ${baseURL}. Please check if the backend is running and accessible.`;
        }
      } else if (error.response?.status) {
        // Server responded with an error status
        errorMessage = error.response?.data?.error || error.message || `Server error (${error.response.status})`;
      } else {
        // Other errors
        errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async register(userData: { username: string; email: string; password: string }): Promise<ApiResponse<any>> {
    try {
      console.log('📝 [REGISTER] Starting registration process...');
      console.log('👤 [REGISTER] Username:', userData.username);
      console.log('📧 [REGISTER] Email:', userData.email);
      console.log('🌐 [REGISTER] API Base URL:', this.baseURL);
      console.log('📡 [REGISTER] Making request to:', `${this.baseURL}/api/auth/register`);
      
      const response = await this.jsonApi.post('/api/auth/register', userData);
      
      // Check response status - handle 400/409 errors properly
      if (response.status === 400 || response.status === 409) {
        console.error('❌ [REGISTER] Registration failed - Validation error');
        console.error('📊 [REGISTER] Response status:', response.status);
        console.error('📄 [REGISTER] Response data:', response.data);
        
        const errorMessage = response.data?.error || 'Registration failed. Please check your information and try again.';
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // Check if response has success flag and token
      if (!response.data?.token || !response.data?.success) {
        console.error('❌ [REGISTER] Registration failed - No token or success flag in response');
        console.error('📄 [REGISTER] Response data:', response.data);
        return {
          success: false,
          error: response.data?.error || 'Registration failed. Please try again.',
        };
      }
      
      console.log('✅ [REGISTER] Registration successful!');
      console.log('📊 [REGISTER] Response status:', response.status);
      console.log('🔑 [REGISTER] Token received:', response.data.token ? 'Yes' : 'No');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [REGISTER] Registration error:', error);
      console.error('📊 [REGISTER] Response status:', error.response?.status);
      console.error('📄 [REGISTER] Response data:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Registration failed. Please try again.',
      };
    }
  }

  async googleSignIn(googleData: { idToken: string; email: string; name: string; photo?: string }): Promise<ApiResponse<any>> {
    try {
      console.log('🔐 [GOOGLE_SIGNIN] Starting Google Sign-In process...');
      console.log('📧 [GOOGLE_SIGNIN] Email:', googleData.email);
      console.log('👤 [GOOGLE_SIGNIN] Name:', googleData.name);
      console.log('🌐 [GOOGLE_SIGNIN] API Base URL:', this.baseURL);
      console.log('📡 [GOOGLE_SIGNIN] Making request to:', `${this.baseURL}/api/auth/google-signin`);
      
      const response = await this.jsonApi.post('/api/auth/google-signin', {
        id_token: googleData.idToken,
        email: googleData.email,
        name: googleData.name,
        photo: googleData.photo,
      });
      
      // Check response status - handle 401/400 errors properly
      if (response.status === 401 || response.status === 400) {
        console.error('❌ [GOOGLE_SIGNIN] Google Sign-In failed');
        console.error('📊 [GOOGLE_SIGNIN] Response status:', response.status);
        console.error('📄 [GOOGLE_SIGNIN] Response data:', response.data);
        
        const errorMessage = response.data?.error || 'Google Sign-In failed. Please try again.';
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // Check if response has success flag and token
      if (!response.data?.token || !response.data?.success) {
        console.error('❌ [GOOGLE_SIGNIN] Google Sign-In failed - No token or success flag in response');
        console.error('📄 [GOOGLE_SIGNIN] Response data:', response.data);
        return {
          success: false,
          error: response.data?.error || 'Google Sign-In failed. Please try again.',
        };
      }
      
      console.log('✅ [GOOGLE_SIGNIN] Google Sign-In successful!');
      console.log('📊 [GOOGLE_SIGNIN] Response status:', response.status);
      console.log('🔑 [GOOGLE_SIGNIN] Token received:', response.data.token ? 'Yes' : 'No');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [GOOGLE_SIGNIN] Google Sign-In error:', error);
      console.error('📊 [GOOGLE_SIGNIN] Response status:', error.response?.status);
      console.error('📄 [GOOGLE_SIGNIN] Response data:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Google Sign-In failed. Please try again.',
      };
    }
  }

  async appleSignIn(appleData: { identityToken: string; user: string; email?: string | null; fullName?: string | null }): Promise<ApiResponse<any>> {
    try {
      console.log('🍎 [APPLE_SIGNIN] Starting Apple Sign-In process...');
      const response = await this.jsonApi.post('/api/auth/apple-signin', {
        identity_token: appleData.identityToken,
        user: appleData.user,
        email: appleData.email ?? null,
        full_name: appleData.fullName ?? null,
      });

      if (response.status === 401 || response.status === 400) {
        const errorMessage = response.data?.error || 'Apple Sign-In failed. Please try again.';
        return { success: false, error: errorMessage };
      }

      if (!response.data?.token || !response.data?.success) {
        return {
          success: false,
          error: response.data?.error || 'Apple Sign-In failed. Please try again.',
        };
      }

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ [APPLE_SIGNIN] Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Apple Sign-In failed. Please try again.',
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
      
      // If verification successful, refresh token expiration
      if (response.status !== 200) {
        return {
          success: false,
          error: response.data?.error || response.data?.message || `Token verification failed (${response.status})`,
        };
      }

      await this.refreshTokenExpiration();
      
      return { success: true, data: response.data };
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

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      console.log('=== CHANGE PASSWORD PROCESS STARTED ===');
      
      const token = await this.getStoredToken();
      console.log('Stored token found:', token ? 'Yes' : 'No');
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
        };
      }
      
      if (!oldPassword || !newPassword) {
        return {
          success: false,
          error: 'Old password and new password are required',
        };
      }
      
      if (newPassword.length < 6) {
        return {
          success: false,
          error: 'New password must be at least 6 characters long',
        };
      }
      
      console.log('Calling backend change password endpoint...');
      const response = await this.jsonApi.post('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Backend change password call successful');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Change Password Error:', error);
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

  async deleteAllVideos(): Promise<ApiResponse<any>> {
    try {
      console.log('=== DELETE ALL VIDEOS PROCESS STARTED ===');
      
      const token = await this.getStoredToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
        };
      }
      
      console.log('Calling backend delete all videos endpoint...');
      const response = await this.api.delete('/api/videos/delete-all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Backend delete all videos call successful');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Delete All Videos Error:', error);
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

  // Forgot Password Methods
  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    try {
      console.log('=== FORGOT PASSWORD PROCESS STARTED ===');
      console.log('Email:', email);
      
      if (!email) {
        return {
          success: false,
          error: 'Email is required',
        };
      }
      
      console.log('Calling backend forgot password endpoint...');
      const response = await this.jsonApi.post('/api/auth/forgot-password', {
        email,
      });
      
      console.log('Backend forgot password call successful');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Forgot Password Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send OTP. Please try again.',
      };
    }
  }

  async verifyOTP(email: string, otp: string): Promise<ApiResponse<any>> {
    try {
      console.log('=== VERIFY OTP PROCESS STARTED ===');
      console.log('Email:', email);
      
      if (!email || !otp) {
        return {
          success: false,
          error: 'Email and OTP are required',
        };
      }
      
      console.log('Calling backend verify OTP endpoint...');
      const response = await this.jsonApi.post('/api/auth/verify-otp', {
        email,
        otp,
      });
      
      console.log('Backend verify OTP call successful');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Verify OTP Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Invalid OTP. Please try again.',
      };
    }
  }

  async resetPassword(email: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      console.log('=== RESET PASSWORD PROCESS STARTED ===');
      console.log('Email:', email);
      
      if (!email || !newPassword) {
        return {
          success: false,
          error: 'Email and new password are required',
        };
      }
      
      if (newPassword.length < 6) {
        return {
          success: false,
          error: 'New password must be at least 6 characters long',
        };
      }
      
      console.log('Calling backend reset password endpoint...');
      const response = await this.jsonApi.post('/api/auth/reset-password', {
        email,
        new_password: newPassword,
      });
      
      console.log('Backend reset password call successful');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Reset Password Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to reset password. Please try again.',
      };
    }
  }

  // Forgot Username Methods
  async forgotUsername(email: string): Promise<ApiResponse<any>> {
    try {
      console.log('=== FORGOT USERNAME PROCESS STARTED ===');
      console.log('Email:', email);
      
      if (!email) {
        return {
          success: false,
          error: 'Email is required',
        };
      }
      
      console.log('Calling backend forgot username endpoint...');
      const response = await this.jsonApi.post('/api/auth/forgot-username', {
        email,
      });
      
      console.log('Backend forgot username call successful');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Forgot Username Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send OTP. Please try again.',
      };
    }
  }

  async verifyUsernameOTP(email: string, otp: string): Promise<ApiResponse<any>> {
    try {
      console.log('=== VERIFY USERNAME OTP PROCESS STARTED ===');
      console.log('Email:', email);
      
      if (!email || !otp) {
        return {
          success: false,
          error: 'Email and OTP are required',
        };
      }
      
      console.log('Calling backend verify username OTP endpoint...');
      const response = await this.jsonApi.post('/api/auth/verify-username-otp', {
        email,
        otp,
      });
      
      console.log('Backend verify username OTP call successful');
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Verify Username OTP Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Invalid OTP. Please try again.',
      };
    }
  }

  // Token Storage Methods
  // Token expiration: 7 days (in milliseconds)
  private readonly TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  async storeAuthData(token: string, user: any): Promise<void> {
    try {
      console.log('Storing auth data...');
      const now = Date.now();
      const authData = {
        token,
        user,
        timestamp: now,
        expiresAt: now + this.TOKEN_EXPIRATION_MS, // 7 days from now
      };
      
      await AsyncStorage.setItem('authData', JSON.stringify(authData));
      console.log('Auth data stored successfully');
      console.log(`Token expires at: ${new Date(authData.expiresAt).toISOString()}`);
      
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
        
        // Check if token has expired
        const now = Date.now();
        const expiresAt = parsed.expiresAt || (parsed.timestamp + this.TOKEN_EXPIRATION_MS);
        
        if (now >= expiresAt) {
          console.log('Token has expired, clearing auth data');
          await this.clearAuthData();
          this.notifyUnauthorized();
          return null;
        }
        
        console.log('Token retrieved successfully');
        console.log(`Token expires in: ${Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24))} days`);
        return parsed.token;
      }
      console.log('No auth data found');
      return null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  // Check if stored auth data is valid (not expired)
  async isAuthDataValid(): Promise<boolean> {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (!authData) {
        console.log('ℹ️ [AUTH][VALIDATE] No authData in AsyncStorage');
        return false;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(authData);
      } catch (e: any) {
        console.log('❌ [AUTH][VALIDATE] authData JSON.parse failed:', e?.message || e);
        return false;
      }

      const now = Date.now();
      const hasExpiresAt = typeof parsed?.expiresAt === 'number';
      const hasTimestamp = typeof parsed?.timestamp === 'number';

      if (!hasExpiresAt && !hasTimestamp) {
        console.log('❌ [AUTH][VALIDATE] Missing expiresAt and timestamp in authData. Keys:', Object.keys(parsed || {}));
        return false;
      }

      const expiresAt = hasExpiresAt ? parsed.expiresAt : (parsed.timestamp + this.TOKEN_EXPIRATION_MS);
      const isValid = now < expiresAt;

      console.log(
        `🔎 [AUTH][VALIDATE] isValid=${isValid} now=${new Date(now).toISOString()} expiresAt=${new Date(expiresAt).toISOString()} ` +
          `msRemaining=${expiresAt - now}`
      );

      return isValid;
    } catch (error) {
      console.error('Error checking auth data validity:', error);
      return false;
    }
  }

  // Get stored auth data (token + user) if valid
  async getStoredAuthData(): Promise<{ token: string; user: any } | null> {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (!authData) {
        return null;
      }
      
      const parsed = JSON.parse(authData);
      const now = Date.now();
      const expiresAt = parsed.expiresAt || (parsed.timestamp + this.TOKEN_EXPIRATION_MS);
      
      if (now >= expiresAt) {
        console.log('Auth data has expired, clearing...');
        await this.clearAuthData();
        this.notifyUnauthorized();
        return null;
      }
      
      return {
        token: parsed.token,
        user: parsed.user,
      };
    } catch (error) {
      console.error('Error getting stored auth data:', error);
      return null;
    }
  }

  // Refresh token expiration (extend by 7 days from now)
  async refreshTokenExpiration(): Promise<void> {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (!authData) {
        return;
      }
      
      const parsed = JSON.parse(authData);
      const now = Date.now();
      
      // Only refresh if token is still valid
      const expiresAt = parsed.expiresAt || (parsed.timestamp + this.TOKEN_EXPIRATION_MS);
      if (now >= expiresAt) {
        console.log('Token already expired, cannot refresh');
        await this.clearAuthData();
        this.notifyUnauthorized();
        return;
      }
      
      // Extend expiration by 7 days from now
      parsed.expiresAt = now + this.TOKEN_EXPIRATION_MS;
      parsed.timestamp = now; // Update timestamp
      
      await AsyncStorage.setItem('authData', JSON.stringify(parsed));
      console.log('Token expiration refreshed');
      console.log(`New expiration: ${new Date(parsed.expiresAt).toISOString()}`);
    } catch (error) {
      console.error('Error refreshing token expiration:', error);
    }
  }

  async getStoredUser(): Promise<any | null> {
    try {
      console.log('Getting stored user...');
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const parsed = JSON.parse(authData);
        
        // Check if token has expired
        const now = Date.now();
        const expiresAt = parsed.expiresAt || (parsed.timestamp + this.TOKEN_EXPIRATION_MS);
        
        if (now >= expiresAt) {
          console.log('Token has expired, clearing auth data');
          await this.clearAuthData();
          this.notifyUnauthorized();
          return null;
        }
        
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

  // Push token storage (Expo Go notifications)
  async storePushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('expoPushToken', token);
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  async getStoredPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('expoPushToken');
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Initialize auth headers on app start
  async initializeAuth(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (token) {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        this.jsonApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ [AUTH] Auth headers initialized from stored token');
      } else {
        console.log('ℹ️ [AUTH] No valid token found');
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
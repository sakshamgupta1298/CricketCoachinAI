import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import apiService from './api';
import { AnalysisResult, UploadFormData } from '../types';

export interface BackgroundUploadState {
  uploadId: string;
  formData: UploadFormData;
  startTime: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  result?: AnalysisResult;
  error?: string;
}

const UPLOAD_STATE_KEY = 'background_upload_state';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_UPLOAD_TIME = 600000; // 10 minutes

class BackgroundUploadService {
  private uploadState: BackgroundUploadState | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private uploadPromise: Promise<AnalysisResult> | null = null;
  private resolveUpload: ((result: AnalysisResult) => void) | null = null;
  private rejectUpload: ((error: Error) => void) | null = null;

  constructor() {
    this.initializeAppStateListener();
    this.loadPersistedState();
  }

  /**
   * Initialize AppState listener to resume checking when app comes to foreground
   */
  private initializeAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Handle app state changes (foreground/background)
   */
  private handleAppStateChange(nextAppState: AppStateStatus) {
    if (!this.uploadState) return;

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App going to background - switch to polling mode immediately
      // This ensures upload continues even if fetch gets cancelled
      if (this.uploadState.status === 'uploading') {
        console.log('📱 [BACKGROUND_UPLOAD] App going to background, switching to polling mode...');
        this.uploadState.status = 'processing';
        this.persistState();
        this.startPolling();
      }
    } else if (nextAppState === 'active') {
      // App came to foreground, resume checking if upload is in progress
      if (this.uploadState.status === 'uploading' || this.uploadState.status === 'processing') {
        console.log('🔄 [BACKGROUND_UPLOAD] App resumed, checking upload status...');
        this.startPolling();
      }
    }
  }

  /**
   * Load persisted upload state from AsyncStorage
   */
  private async loadPersistedState() {
    try {
      const stored = await AsyncStorage.getItem(UPLOAD_STATE_KEY);
      if (stored) {
        this.uploadState = JSON.parse(stored);
        console.log('📦 [BACKGROUND_UPLOAD] Loaded persisted upload state:', this.uploadState?.uploadId);
        
        // Resume checking if upload was in progress
        if (this.uploadState && 
            (this.uploadState.status === 'uploading' || this.uploadState.status === 'processing')) {
          const elapsed = Date.now() - this.uploadState.startTime;
          if (elapsed < MAX_UPLOAD_TIME) {
            console.log('🔄 [BACKGROUND_UPLOAD] Resuming upload check...');
            this.startPolling();
          } else {
            console.log('⏱️ [BACKGROUND_UPLOAD] Upload timeout exceeded, marking as failed');
            await this.markAsFailed('Upload timeout exceeded');
          }
        }
      }
    } catch (error) {
      console.error('❌ [BACKGROUND_UPLOAD] Error loading persisted state:', error);
    }
  }

  /**
   * Persist upload state to AsyncStorage
   */
  private async persistState() {
    try {
      if (this.uploadState) {
        await AsyncStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(this.uploadState));
      } else {
        await AsyncStorage.removeItem(UPLOAD_STATE_KEY);
      }
    } catch (error) {
      console.error('❌ [BACKGROUND_UPLOAD] Error persisting state:', error);
    }
  }

  /**
   * Start a background upload
   */
  async startUpload(formData: UploadFormData): Promise<AnalysisResult> {
    // If there's an existing upload with the same formData, return its promise
    if (this.uploadState && 
        this.uploadState.formData.video_uri === formData.video_uri &&
        (this.uploadState.status === 'uploading' || this.uploadState.status === 'processing')) {
      console.log('🔄 [BACKGROUND_UPLOAD] Upload already in progress, returning existing promise');
      if (this.uploadPromise) {
        return this.uploadPromise;
      }
    }

    // Cancel any existing upload
    if (this.uploadState) {
      console.log('⚠️ [BACKGROUND_UPLOAD] Cancelling existing upload');
      this.cancelUpload();
    }

    // Create new upload state
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.uploadState = {
      uploadId,
      formData,
      startTime: Date.now(),
      status: 'uploading',
    };

    await this.persistState();

    // Create promise that will be resolved when upload completes
    this.uploadPromise = new Promise<AnalysisResult>((resolve, reject) => {
      this.resolveUpload = resolve;
      this.rejectUpload = reject;
    });

    // Start the upload process
    this.performUpload();

    return this.uploadPromise;
  }

  /**
   * Wait for current upload to complete (if one exists)
   */
  async waitForUpload(): Promise<AnalysisResult | null> {
    if (!this.uploadState) {
      return null;
    }

    if (this.uploadState.status === 'completed' && this.uploadState.result) {
      return this.uploadState.result;
    }

    if (this.uploadState.status === 'failed') {
      throw new Error(this.uploadState.error || 'Upload failed');
    }

    // If promise doesn't exist (e.g., app was restarted), create a new one
    // and start polling if needed
    if (!this.uploadPromise) {
      console.log('🔄 [BACKGROUND_UPLOAD] Recreating promise for existing upload');
      this.uploadPromise = new Promise<AnalysisResult>((resolve, reject) => {
        this.resolveUpload = resolve;
        this.rejectUpload = reject;
      });

      // If status is processing, start polling
      if (this.uploadState.status === 'processing') {
        this.startPolling();
      }
    }

    // Wait for the promise
    return this.uploadPromise;
  }

  /**
   * Perform the actual upload
   */
  private async performUpload() {
    if (!this.uploadState) return;

    try {
      console.log('📤 [BACKGROUND_UPLOAD] Starting upload...');
      console.log('📱 [BACKGROUND_UPLOAD] Upload will continue even if app goes to background');
      
      // Update status
      this.uploadState.status = 'uploading';
      await this.persistState();

      try {
        // Attempt direct upload
        // Note: If app goes to background, AppState handler will switch to polling mode
        const response = await apiService.uploadVideo(this.uploadState.formData);
        
        // Stop polling if it was started (app might have gone to background)
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
        
        // Check if we're still in uploading state (not already completed via polling)
        if (this.uploadState && this.uploadState.status === 'uploading') {
          if (response.success && response.data) {
            // Upload successful via direct response
            this.uploadState.status = 'completed';
            this.uploadState.result = response.data;
            await this.persistState();

            console.log('✅ [BACKGROUND_UPLOAD] Upload completed successfully via direct response');
            
            // Resolve the promise
            if (this.resolveUpload) {
              this.resolveUpload(response.data);
            }

            // Clean up after a short delay
            setTimeout(() => {
              this.cleanup();
            }, 2000);
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } else if (this.uploadState && this.uploadState.status === 'completed') {
          // Polling already completed it, nothing to do
          console.log('✅ [BACKGROUND_UPLOAD] Upload already completed via polling');
        }
        // If status is 'processing', polling is handling it
      } catch (error: any) {
        // If upload promise fails, check if we should switch to polling
        if (this.uploadState && this.uploadState.status === 'uploading') {
          console.error('❌ [BACKGROUND_UPLOAD] Upload error:', error);
          console.error('📋 [BACKGROUND_UPLOAD] Error details:', error.message);
          
          // Check if it's a timeout or network error - switch to polling
          if (error.message?.includes('timeout') || 
              error.message?.includes('timed out') ||
              error.message?.includes('ECONNABORTED') ||
              error.message?.includes('Network request failed') ||
              error.message?.includes('Failed to fetch') ||
              error.message?.includes('AbortError')) {
            console.log('🔄 [BACKGROUND_UPLOAD] Network issue detected, switching to polling...');
            this.uploadState.status = 'processing';
            await this.persistState();
            this.startPolling();
          } else {
            // Real error, mark as failed
            await this.markAsFailed(error.message || 'Upload failed');
          }
        } else if (this.uploadState && this.uploadState.status === 'processing') {
          // Already switched to polling (probably via AppState handler), it will handle completion
          console.log('📱 [BACKGROUND_UPLOAD] Upload promise failed but polling will continue...');
        }
      }
    } catch (error: any) {
      console.error('❌ [BACKGROUND_UPLOAD] Unexpected error:', error);
      await this.markAsFailed(error.message || 'Upload failed');
    }
  }

  /**
   * Start polling for upload status
   */
  private startPolling() {
    // Clear existing interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // Update status to processing if still uploading
    if (this.uploadState && this.uploadState.status === 'uploading') {
      this.uploadState.status = 'processing';
      this.persistState();
    }

    // Start polling
    this.pollInterval = setInterval(async () => {
      await this.checkUploadStatus();
    }, POLL_INTERVAL);

    // Also check immediately
    this.checkUploadStatus();
  }

  /**
   * Check upload status by polling the backend
   */
  private async checkUploadStatus() {
    if (!this.uploadState) return;

    const elapsed = Date.now() - this.uploadState.startTime;
    
    // Check timeout
    if (elapsed > MAX_UPLOAD_TIME) {
      console.log('⏱️ [BACKGROUND_UPLOAD] Maximum upload time exceeded');
      await this.markAsFailed('Upload timeout exceeded');
      return;
    }

    try {
      // Try to get result by filename if available
      // Note: This is a fallback mechanism in case the direct upload response was missed
      // The backend processes synchronously, so this is mainly for edge cases
      const filename = this.uploadState.formData.video_name;
      
      if (filename) {
        console.log('🔍 [BACKGROUND_UPLOAD] Polling for result:', filename);
        const resultResponse = await apiService.getAnalysisResult(filename);
        
        if (resultResponse.success && resultResponse.data) {
          // Result found!
          console.log('✅ [BACKGROUND_UPLOAD] Upload completed, result found via polling');
          this.uploadState.status = 'completed';
          this.uploadState.result = resultResponse.data;
          await this.persistState();

          // Resolve the promise if not already resolved
          if (this.resolveUpload) {
            this.resolveUpload(resultResponse.data);
          }

          // Clean up after a short delay
          setTimeout(() => {
            this.cleanup();
          }, 2000);
        } else {
          console.log('⏳ [BACKGROUND_UPLOAD] Result not ready yet, will continue polling...');
        }
      }
    } catch (error: any) {
      // Error checking status - continue polling unless it's a 404 (not found)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log('⏳ [BACKGROUND_UPLOAD] Result not found yet (404), will continue polling...');
      } else {
        console.log('🔄 [BACKGROUND_UPLOAD] Status check failed, will retry:', error.message);
      }
    }
  }

  /**
   * Mark upload as failed
   */
  private async markAsFailed(error: string) {
    if (!this.uploadState) return;

    console.log('❌ [BACKGROUND_UPLOAD] Marking upload as failed:', error);
    
    this.uploadState.status = 'failed';
    this.uploadState.error = error;
    await this.persistState();

    // Reject the promise
    if (this.rejectUpload) {
      this.rejectUpload(new Error(error));
    }

    // Clean up
    this.cleanup();
  }

  /**
   * Cancel current upload
   */
  cancelUpload() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.rejectUpload) {
      this.rejectUpload(new Error('Upload cancelled'));
    }

    this.cleanup();
  }

  /**
   * Clean up resources
   */
  private cleanup() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.uploadState = null;
    this.uploadPromise = null;
    this.resolveUpload = null;
    this.rejectUpload = null;

    // Clear persisted state after a delay to allow UI to read it
    setTimeout(async () => {
      await AsyncStorage.removeItem(UPLOAD_STATE_KEY);
    }, 5000);
  }

  /**
   * Get current upload state
   */
  getUploadState(): BackgroundUploadState | null {
    return this.uploadState;
  }

  /**
   * Check if there's an active upload
   */
  hasActiveUpload(): boolean {
    return this.uploadState !== null && 
           (this.uploadState.status === 'uploading' || this.uploadState.status === 'processing');
  }

  /**
   * Cleanup on service destruction
   */
  destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.cancelUpload();
  }
}

// Export singleton instance
export default new BackgroundUploadService();


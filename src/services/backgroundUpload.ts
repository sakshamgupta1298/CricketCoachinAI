import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import apiService from './api';
import { AnalysisResult, UploadFormData } from '../types';

export interface BackgroundUploadState {
  jobId?: string;
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
  private lastAppState: AppStateStatus = AppState.currentState;

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
      // IMPORTANT:
      // In React Native/Expo, when the app is backgrounded the JS runtime is commonly suspended.
      // That means timers (setInterval) and most JS-driven networking will NOT reliably run.
      // So we should *not* start polling here; instead we persist state and resume polling on foreground.
      this.lastAppState = nextAppState;
      console.log('📱 [BACKGROUND_UPLOAD] App backgrounded; persisting upload state and pausing active polling.');
      this.persistState();
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    } else if (nextAppState === 'active') {
      // App came to foreground, resume checking if upload is in progress
      if (this.uploadState.status === 'uploading' || this.uploadState.status === 'processing') {
        console.log('🔄 [BACKGROUND_UPLOAD] App resumed, checking upload status...');
        this.lastAppState = nextAppState;
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

    // Start the upload + enqueue process
    this.performUploadAndEnqueue();

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
  private async performUploadAndEnqueue() {
    if (!this.uploadState) return;

    try {
      console.log('📤 [BACKGROUND_UPLOAD] Starting upload (will enqueue async backend job)...');
      console.log('📱 [BACKGROUND_UPLOAD] Note: uploads are not guaranteed to complete if the app is backgrounded.');
      
      // Update status
      this.uploadState.status = 'uploading';
      await this.persistState();

      try {
        // Upload + enqueue job
        const response = await apiService.uploadVideo(this.uploadState.formData);

        if (!this.uploadState) return;

        if (response.success && response.data?.job_id) {
          this.uploadState.jobId = response.data.job_id;
          this.uploadState.status = 'processing';
          await this.persistState();

          console.log('✅ [BACKGROUND_UPLOAD] Upload finished, job enqueued:', response.data.job_id);

          // Start polling for the job result (only while app is active)
          this.startPolling();
        } else {
          throw new Error(response.error || 'Upload failed');
        }
      } catch (error: any) {
        console.error('❌ [BACKGROUND_UPLOAD] Upload/enqueue error:', error);
        console.error('📋 [BACKGROUND_UPLOAD] Error details:', error.message);
        await this.markAsFailed(error.message || 'Upload failed');
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

    // If app isn't active, don't start a timer. It won't run reliably anyway.
    if (this.lastAppState !== 'active') {
      console.log('⏸️ [BACKGROUND_UPLOAD] Not starting polling because app is not active:', this.lastAppState);
      return;
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
      const jobId = this.uploadState.jobId;
      if (!jobId) {
        console.log('⏳ [BACKGROUND_UPLOAD] No jobId yet; waiting...');
        return;
      }

      console.log('🔍 [BACKGROUND_UPLOAD] Polling for job result:', jobId);
      const jobResponse = await apiService.getJobResult(jobId);

      if (jobResponse.success && jobResponse.data) {
        const status = jobResponse.data.status;
        if (status === 'completed' && jobResponse.data.result) {
          console.log('✅ [BACKGROUND_UPLOAD] Job completed, result received');
          this.uploadState.status = 'completed';
          this.uploadState.result = jobResponse.data.result;
          await this.persistState();

          if (this.resolveUpload) {
            this.resolveUpload(jobResponse.data.result);
          }

          setTimeout(() => {
            this.cleanup();
          }, 2000);
          return;
        }

        if (status === 'failed') {
          await this.markAsFailed(jobResponse.data.error || 'Analysis failed');
          return;
        }

        console.log('⏳ [BACKGROUND_UPLOAD] Job not ready yet, status:', status);
      } else {
        console.log('🔄 [BACKGROUND_UPLOAD] Job status check failed, will retry:', jobResponse.error);
      }
    } catch (error: any) {
      // Error checking status - continue polling unless it's a 404 (not found)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log('⏳ [BACKGROUND_UPLOAD] Job not found yet (404), will continue polling...');
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


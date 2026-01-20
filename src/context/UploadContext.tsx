import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import backgroundUploadService from '../services/backgroundUpload';
import { AnalysisResult, HistoryItem, UploadFormData, UploadState } from '../types';

interface UploadContextType extends UploadState {
  startUpload: (formData: UploadFormData) => Promise<AnalysisResult>;
  updateProgress: (progress: number) => void;
  completeUpload: (result: AnalysisResult) => void;
  cancelUpload: () => void;
  addToHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

type UploadAction =
  | { type: 'START_UPLOAD'; payload: UploadFormData }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'COMPLETE_UPLOAD'; payload: AnalysisResult }
  | { type: 'CANCEL_UPLOAD' }
  | { type: 'ADD_TO_HISTORY'; payload: HistoryItem }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'REMOVE_FROM_HISTORY'; payload: string };

const uploadReducer = (state: UploadState, action: UploadAction): UploadState => {
  switch (action.type) {
    case 'START_UPLOAD':
      return {
        ...state,
        isUploading: true,
        progress: 0,
        currentUpload: action.payload,
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: action.payload,
      };
    case 'COMPLETE_UPLOAD':
      return {
        ...state,
        isUploading: false,
        progress: 100,
        currentUpload: null,
      };
    case 'CANCEL_UPLOAD':
      return {
        ...state,
        isUploading: false,
        progress: 0,
        currentUpload: null,
      };
    case 'ADD_TO_HISTORY':
      return {
        ...state,
        uploadHistory: [action.payload, ...state.uploadHistory],
      };
    case 'CLEAR_HISTORY':
      return {
        ...state,
        uploadHistory: [],
      };
    case 'REMOVE_FROM_HISTORY':
      return {
        ...state,
        uploadHistory: state.uploadHistory.filter(item => item.id !== action.payload),
      };
    default:
      return state;
  }
};

const initialState: UploadState = {
  isUploading: false,
  progress: 0,
  currentUpload: null,
  uploadHistory: [],
};

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  // Check for persisted upload state on mount
  useEffect(() => {
    const checkPersistedUpload = async () => {
      const uploadState = backgroundUploadService.getUploadState();
      if (uploadState) {
        if (uploadState.status === 'completed' && uploadState.result) {
          // Upload already completed, just update UI
          console.log('✅ [UPLOAD_CONTEXT] Found completed upload in background');
          dispatch({ type: 'COMPLETE_UPLOAD', payload: uploadState.result });
        } else if (uploadState.status === 'uploading' || uploadState.status === 'processing') {
          // Upload still in progress, restore UI state and wait for completion
          console.log('🔄 [UPLOAD_CONTEXT] Found persisted upload, restoring state...');
          dispatch({ type: 'START_UPLOAD', payload: uploadState.formData });
          
          // Wait for the existing upload to complete
          try {
            const result = await backgroundUploadService.waitForUpload();
            if (result) {
              dispatch({ type: 'COMPLETE_UPLOAD', payload: result });
            }
          } catch (error: any) {
            console.error('❌ [UPLOAD_CONTEXT] Persisted upload failed:', error);
            dispatch({ type: 'CANCEL_UPLOAD' });
          }
        } else if (uploadState.status === 'failed') {
          // Upload failed, clear state
          console.log('❌ [UPLOAD_CONTEXT] Found failed upload:', uploadState.error);
          dispatch({ type: 'CANCEL_UPLOAD' });
        }
      }
    };

    checkPersistedUpload();
  }, []);

  // Listen for app state changes to check upload status
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && state.isUploading) {
        // App came to foreground, check if upload completed
        const uploadState = backgroundUploadService.getUploadState();
        if (uploadState?.status === 'completed' && uploadState.result) {
          dispatch({ type: 'COMPLETE_UPLOAD', payload: uploadState.result });
        } else if (uploadState?.status === 'failed') {
          dispatch({ type: 'CANCEL_UPLOAD' });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [state.isUploading]);

  const startUpload = async (formData: UploadFormData) => {
    dispatch({ type: 'START_UPLOAD', payload: formData });
    
    // Start background upload
    try {
      const result = await backgroundUploadService.startUpload(formData);
      dispatch({ type: 'COMPLETE_UPLOAD', payload: result });
      return result;
    } catch (error: any) {
      console.error('❌ [UPLOAD_CONTEXT] Upload failed:', error);
      dispatch({ type: 'CANCEL_UPLOAD' });
      throw error;
    }
  };

  const updateProgress = (progress: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
  };

  const completeUpload = (result: AnalysisResult) => {
    dispatch({ type: 'COMPLETE_UPLOAD', payload: result });
  };

  const cancelUpload = () => {
    backgroundUploadService.cancelUpload();
    dispatch({ type: 'CANCEL_UPLOAD' });
  };

  const addToHistory = (item: HistoryItem) => {
    dispatch({ type: 'ADD_TO_HISTORY', payload: item });
  };

  const clearHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
  };

  const removeFromHistory = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_HISTORY', payload: id });
  };

  const value: UploadContextType = {
    ...state,
    startUpload,
    updateProgress,
    completeUpload,
    cancelUpload,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
};

export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}; 
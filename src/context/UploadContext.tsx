import React, { createContext, ReactNode, useContext, useReducer } from 'react';
import { AnalysisResult, HistoryItem, UploadFormData, UploadState } from '../types';

interface UploadContextType extends UploadState {
  startUpload: (formData: UploadFormData) => void;
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

  const startUpload = (formData: UploadFormData) => {
    dispatch({ type: 'START_UPLOAD', payload: formData });
  };

  const updateProgress = (progress: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
  };

  const completeUpload = (result: AnalysisResult) => {
    dispatch({ type: 'COMPLETE_UPLOAD', payload: result });
  };

  const cancelUpload = () => {
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
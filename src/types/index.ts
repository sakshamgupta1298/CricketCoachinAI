export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AnalysisResult {
  success: boolean;
  player_type: 'batsman' | 'bowler';
  shot_type?: string;
  batter_side?: string;
  bowler_side?: string;
  bowler_type?: string;
  gpt_feedback: {
    // Old format support
    analysis?: string;
    flaws?: Array<{
      feature: string;
      observed: number;
      expected_range: string;
      issue: string;
      recommendation: string;
    }>;
    biomechanical_features?: Record<string, any>;
    injury_risks?: string[];
    
    // New Gemini format
    analysis_summary?: string;
    biomechanics?: {
      core?: Record<string, BiomechanicalFeature>;
      conditional?: Record<string, BiomechanicalFeature>;
      inferred?: Record<string, BiomechanicalFeature>;
    };
    technical_flaws?: Array<{
      feature: string;
      observed?: number;
      ideal_range?: string;
      deviation?: string;
      issue: string;
      recommendation: string;
    }>;
    selected_features?: {
      core?: string[];
      conditional?: string[];
      inferred?: string[];
    };
    injury_risk_assessment?: Array<{
      body_part: string;
      risk_level: string;
      reason: string;
    }>;
    general_tips?: string[];
  };
  filename: string;
  user_id?: number;
  username?: string;
  report_path?: string;
  annotated_video_path?: string;
  job_id?: string;
}

export interface UploadJobResponse {
  success: boolean;
  job_id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface JobStatusResponse {
  success: boolean;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  filename?: string;
  result?: AnalysisResult;
  error?: string;
}

export interface BiomechanicalFeature {
  observed: number | string;
  ideal_range?: string;
  confidence?: string;
  estimated?: boolean;
  analysis: string;
}

export interface UploadFormData {
  player_type: 'batsman' | 'bowler';
  batter_side?: 'left' | 'right';
  bowler_side?: 'left' | 'right';
  bowler_type?: 'fast_bowler' | 'spin_bowler';
  shot_type?: string; // Optional: if provided, backend will skip shot detection
  video_uri: string;
  video_name: string;
  video_size: number;
  video_type: string;
}

export interface HistoryItem {
  id: string;
  filename: string;
  player_type: 'batsman' | 'bowler' | 'unknown';
  shot_type?: string;
  bowler_type?: string;
  batter_side?: string;
  bowler_side?: string;
  created: string;
  modified: string;
  size: number;
  success: boolean;
  has_gpt_feedback: boolean;
}

export interface TrainingDrill {
  name: string;
  reps: string;
  notes?: string;
}

export interface TrainingDay {
  day: number;
  focus: string;
  warmup: string[];
  drills: TrainingDrill[];
  progression: string;
  notes: string;
}

export interface TrainingPlan {
  overall_notes: string;
  plan: TrainingDay[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
  currentUpload: UploadFormData | null;
  uploadHistory: HistoryItem[];
}

export type PlayerType = 'batsman' | 'bowler';
export type PlayerSide = 'left' | 'right';
export type BowlerType = 'fast_bowler' | 'spin_bowler';

export interface VideoInfo {
  uri: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface CameraSettings {
  quality: 'low' | 'medium' | 'high';
  flash: 'off' | 'on' | 'auto';
  focus: 'on' | 'off';
  whiteBalance: 'auto' | 'sunny' | 'cloudy' | 'shadow' | 'fluorescent' | 'incandescent';
}

export interface AppSettings {
  apiBaseUrl: string;
  apiTimeout: number;
  maxVideoSize: number;
  supportedVideoTypes: string[];
  autoSave: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
} 
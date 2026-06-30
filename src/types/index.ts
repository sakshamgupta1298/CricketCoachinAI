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
  player_type: 'batsman' | 'bowler' | 'keeper';
  batter_side?: 'left' | 'right';
  bowler_side?: 'left' | 'right';
  keeper_side?: 'left' | 'right';
  bowler_type?: 'fast_bowler' | 'spin_bowler';
  keeping_type?: 'standing_up' | 'standing_back' | 'diving_catch' | 'stumping';
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
  youtube_search_query?: string;
  youtube_url?: string;
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

export type PlayerType = 'batsman' | 'bowler' | 'keeper';
export type PlayerSide = 'left' | 'right';
export type BowlerType = 'fast_bowler' | 'spin_bowler';
export type KeepingType = 'standing_up' | 'standing_back' | 'diving_catch' | 'stumping';

// ---------------------------------------------------------------------------
// Athlete Monitoring (NCA-style): wellness, workload, fitness tests, injuries.
// All records are scoped to the authenticated user server-side via the bearer
// token (same as analysis history) — no client-side user id is required.
// ---------------------------------------------------------------------------

export type SessionType = 'batting' | 'bowling' | 'fielding' | 'gym' | 'match' | 'other';
export type InjuryStatus = 'fit' | 'managing' | 'rehab' | 'out';
export type InjurySeverity = 'minor' | 'moderate' | 'severe';
export type WorkloadFlag = 'low' | 'optimal' | 'high';

// Daily wellness check-in. One entry per calendar day; sub-scores are 1–5
// (5 = best, e.g. fully recovered / great mood / no soreness).
export interface WellnessEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  sleep_quality: number; // 1–5
  sleep_hours: number;
  soreness: number; // 1–5 (5 = no soreness)
  fatigue: number; // 1–5 (5 = fresh)
  stress: number; // 1–5 (5 = relaxed)
  mood: number; // 1–5
  score?: number; // 0–100, computed (server or client)
  notes?: string;
}

// A single training/match session. load = rpe * duration_min (sRPE method).
export interface WorkloadEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  type: SessionType;
  duration_min: number;
  rpe: number; // session RPE 1–10
  balls_bowled?: number;
  load?: number; // rpe * duration_min (server may compute)
  notes?: string;
}

// Rolling workload summary used to drive the ACWR injury-risk gauge.
export interface WorkloadSummary {
  acute_load: number; // 7-day rolling sum of session load
  chronic_load: number; // 28-day rolling average (weekly equivalent)
  acwr: number; // acute : chronic workload ratio
  flag: WorkloadFlag; // low (<0.8) | optimal (0.8–1.3) | high (>1.3)
  weekly_balls?: number; // balls bowled in the last 7 days
}

// A periodic fitness test result (Yo-Yo, sprint, vertical jump, lifts, etc.).
export interface FitnessTest {
  id: string;
  date: string; // ISO yyyy-mm-dd
  metric: string; // e.g. 'yoyo' | 'sprint_20m' | 'vertical_jump' | 'weight'
  value: number;
  unit: string; // e.g. 'level', 's', 'cm', 'kg'
  notes?: string;
}

export interface InjuryRecord {
  id: string;
  body_part: string;
  injury_type: string;
  date_reported: string; // ISO yyyy-mm-dd
  severity: InjurySeverity;
  status: InjuryStatus;
  rehab_notes?: string;
  expected_return?: string; // ISO yyyy-mm-dd
  resolved_date?: string; // ISO yyyy-mm-dd
}

// AI-generated weekly monitoring report (markdown), one per athlete per week.
export interface WeeklyReport {
  id: string;
  week_start: string; // ISO yyyy-mm-dd
  week_end: string; // ISO yyyy-mm-dd
  report_md: string; // GitHub-flavored markdown body
  model?: string;
  total_tokens?: number;
  generated_at?: string;
}

// Weekly shot-progress report: compares the same shot across the week
// (common flaws + improvement % per video). report_md is rendered markdown;
// stats holds the pre-computed numbers (also reflected in the markdown).
// Shot-progress reports are scoped to one discipline.
export type ShotCategory = 'batting' | 'bowling' | 'keeping';

export interface ShotReportStats {
  week_start: string;
  week_end: string;
  category?: ShotCategory;
  total_videos: number;
  shots_practiced: number;
  shot_groups: {
    shot: string;
    video_count: number;
    avg_score: number;
    net_improvement_pct: number | null;
    common_flaws: { feature: string; count: number; of: number }[];
    videos: {
      filename: string;
      date: string;
      score: number;
      improvement_vs_first_pct: number | null;
      improvement_vs_prev_pct: number | null;
      flaws: { feature: string; observed?: any; ideal_range?: string; issue?: string }[];
    }[];
  }[];
}

export interface ShotReport {
  id: string;
  week_start: string;
  week_end: string;
  category?: ShotCategory;
  report_md: string;
  stats?: ShotReportStats | null;
  model?: string;
  total_tokens?: number;
  generated_at?: string;
}

// Daily video-analysis streak (consecutive days with >=1 analysis).
export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  active_today: boolean;
  total_active_days: number;
  last_active: string | null;
}

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
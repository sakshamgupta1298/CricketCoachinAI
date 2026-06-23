import {
  WellnessEntry,
  WorkloadEntry,
  WorkloadFlag,
  WorkloadSummary,
} from '../types';

/**
 * Athlete-monitoring math (NCA / sport-science standard).
 *
 * These are pure functions used both to render values in the UI and as a
 * client-side fallback when the backend `/summary` endpoint is unavailable.
 * The backend remains the source of truth when it returns a summary.
 */

// Number of days in the acute (recent) and chronic (baseline) windows.
export const ACUTE_WINDOW_DAYS = 7;
export const CHRONIC_WINDOW_DAYS = 28;

// ACWR "sweet spot" thresholds. <0.8 = under-loaded, 0.8–1.3 = optimal,
// >1.3 = elevated injury risk (sharply worse above ~1.5).
export const ACWR_LOW = 0.8;
export const ACWR_HIGH = 1.3;

/** Session load using the session-RPE method: RPE (1–10) × duration (min). */
export function sessionLoad(entry: Pick<WorkloadEntry, 'rpe' | 'duration_min' | 'load'>): number {
  if (typeof entry.load === 'number' && !Number.isNaN(entry.load)) return entry.load;
  const rpe = Number(entry.rpe) || 0;
  const duration = Number(entry.duration_min) || 0;
  return rpe * duration;
}

/** Parse an ISO date (yyyy-mm-dd) to a millisecond timestamp at local midnight. */
function dayStart(dateStr: string): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return NaN;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Sum of session loads within `windowDays` ending at `reference` (inclusive).
 */
export function loadInWindow(
  entries: WorkloadEntry[],
  windowDays: number,
  reference: Date = new Date()
): number {
  const refStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  const cutoff = refStart - (windowDays - 1) * 24 * 60 * 60 * 1000;
  return entries.reduce((sum, e) => {
    const t = dayStart(e.date);
    if (Number.isNaN(t) || t < cutoff || t > refStart) return sum;
    return sum + sessionLoad(e);
  }, 0);
}

/** 7-day total load (acute). */
export function acuteLoad(entries: WorkloadEntry[], reference?: Date): number {
  return loadInWindow(entries, ACUTE_WINDOW_DAYS, reference);
}

/**
 * Chronic load expressed as a weekly average: the 28-day total divided by 4 so
 * it is directly comparable to the 7-day acute load (standard ACWR convention).
 */
export function chronicLoad(entries: WorkloadEntry[], reference?: Date): number {
  const total = loadInWindow(entries, CHRONIC_WINDOW_DAYS, reference);
  return total / (CHRONIC_WINDOW_DAYS / ACUTE_WINDOW_DAYS);
}

/** Total balls bowled in the last 7 days. */
export function weeklyBalls(entries: WorkloadEntry[], reference: Date = new Date()): number {
  const refStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  const cutoff = refStart - (ACUTE_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000;
  return entries.reduce((sum, e) => {
    const t = dayStart(e.date);
    if (Number.isNaN(t) || t < cutoff || t > refStart) return sum;
    return sum + (Number(e.balls_bowled) || 0);
  }, 0);
}

/** Classify an ACWR value into a risk flag. */
export function acwrFlag(acwr: number): WorkloadFlag {
  if (acwr < ACWR_LOW) return 'low';
  if (acwr > ACWR_HIGH) return 'high';
  return 'optimal';
}

/**
 * Compute a full workload summary from a list of sessions. Used as the client
 * fallback when the backend does not return a summary.
 */
export function computeWorkloadSummary(
  entries: WorkloadEntry[],
  reference?: Date
): WorkloadSummary {
  const acute = acuteLoad(entries, reference);
  const chronic = chronicLoad(entries, reference);
  const acwr = chronic > 0 ? acute / chronic : 0;
  return {
    acute_load: Math.round(acute),
    chronic_load: Math.round(chronic),
    acwr: Math.round(acwr * 100) / 100,
    flag: chronic > 0 ? acwrFlag(acwr) : 'low',
    weekly_balls: weeklyBalls(entries, reference),
  };
}

/**
 * Wellness score on a 0–100 scale from the five 1–5 sub-scores. Sleep hours is
 * folded in via a simple target band (7–9h ideal). Higher is better.
 */
export function wellnessScore(entry: WellnessEntry): number {
  const subs = [entry.sleep_quality, entry.soreness, entry.fatigue, entry.stress, entry.mood]
    .map((v) => Number(v) || 0);
  const avg5 = subs.reduce((a, b) => a + b, 0) / subs.length; // 1–5
  let score = (avg5 / 5) * 100;

  // Light penalty for sleep duration far from the 7–9h band.
  const hours = Number(entry.sleep_hours) || 0;
  if (hours > 0) {
    const deficit = hours < 7 ? 7 - hours : hours > 9 ? hours - 9 : 0;
    score -= Math.min(deficit * 4, 15);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Human-readable label + status color key for a workload flag. */
export function workloadFlagInfo(flag: WorkloadFlag): { label: string; tone: 'success' | 'warning' | 'error' } {
  switch (flag) {
    case 'optimal':
      return { label: 'Optimal load', tone: 'success' };
    case 'high':
      return { label: 'High — injury risk', tone: 'error' };
    case 'low':
    default:
      return { label: 'Under-loaded', tone: 'warning' };
  }
}

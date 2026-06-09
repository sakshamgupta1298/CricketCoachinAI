/**
 * On-device tracking + speed math for ball-speed detection.
 *
 * This is a faithful TypeScript port of the validated heuristics in
 * `ball_speed_cv.py` (`_build_tracks`, `_score_track`, and the speed/confidence
 * logic in `estimate_ball_speed`). The classical OpenCV motion detector is
 * replaced on-device by an ML ball detector, but the tracking/scoring stays the
 * same so behaviour matches the proven server pipeline.
 *
 * Key difference from the server: each detection carries a real frame
 * `timestamp` (seconds, from vision-camera `frame.timestamp`), so the speed is
 * computed from measured elapsed time rather than a guessed fps.
 */

// A single per-frame ball detection in processing-resolution pixel coords.
export interface Detection {
  /** Monotonic sample index (which processed frame this came from). */
  frame: number;
  /** Real capture time of the frame, in seconds. */
  t: number;
  x: number;
  y: number;
  radius: number;
}

export interface Track {
  points: Detection[];
  lastSeenFrame: number;
}

export interface SpeedResult {
  success: boolean;
  speedKmh?: number;
  speedMps?: number;
  timeSec?: number;
  trackPoints?: number;
  confidence?: 'high' | 'medium' | 'low';
  /** Best track's points (proc-resolution coords) for an on-screen overlay. */
  trajectory?: Detection[];
  note?: string;
}

const startFrame = (t: Track): number => (t.points.length ? t.points[0].frame : -1);
const endFrame = (t: Track): number => (t.points.length ? t.points[t.points.length - 1].frame : -1);

/** Per-frame velocity from the last two points (px per frame-index). */
function velocity(t: Track): [number, number] {
  if (t.points.length < 2) return [0, 0];
  const a = t.points[t.points.length - 2];
  const b = t.points[t.points.length - 1];
  const dt = Math.max(1, b.frame - a.frame);
  return [(b.x - a.x) / dt, (b.y - a.y) / dt];
}

/**
 * Greedy nearest-neighbour tracker with motion gating.
 * Port of `_build_tracks` in ball_speed_cv.py.
 */
export function buildTracks(perFrame: Detection[][], procW: number): Track[] {
  const baseGate = procW * 0.18; // a fast ball can jump far per frame
  const maxGap = 4; // frames a track can go unmatched before it's closed

  let active: Track[] = [];
  const finished: Track[] = [];

  for (let frameIdx = 0; frameIdx < perFrame.length; frameIdx++) {
    const dets = perFrame[frameIdx];

    // Close stale tracks.
    const stillActive: Track[] = [];
    for (const tr of active) {
      if (frameIdx - tr.lastSeenFrame > maxGap) finished.push(tr);
      else stillActive.push(tr);
    }
    active = stillActive;

    const used = new Array(dets.length).fill(false);

    // Match existing tracks to nearest compatible detection.
    for (const tr of active) {
      const [vx, vy] = velocity(tr);
      const last = tr.points[tr.points.length - 1];
      const predX = last.x + vx * (frameIdx - last.frame);
      const predY = last.y + vy * (frameIdx - last.frame);
      const gate = baseGate + Math.hypot(vx, vy) * 2.0;

      let bestJ = -1;
      let bestD = gate;
      for (let j = 0; j < dets.length; j++) {
        if (used[j]) continue;
        const dist = Math.hypot(dets[j].x - predX, dets[j].y - predY);
        if (dist < bestD) {
          bestD = dist;
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        tr.points.push(dets[bestJ]);
        tr.lastSeenFrame = frameIdx;
        used[bestJ] = true;
      }
    }

    // Unmatched detections seed new tracks.
    for (let j = 0; j < dets.length; j++) {
      if (!used[j]) active.push({ points: [dets[j]], lastSeenFrame: frameIdx });
    }
  }

  finished.push(...active);
  return finished;
}

/**
 * Higher is more ball-like: long, fast, consistent, travels across the frame.
 * Port of `_score_track` in ball_speed_cv.py.
 */
export function scoreTrack(t: Track, procW: number): number {
  const n = t.points.length;
  if (n < 4) return -1;

  const steps: number[] = [];
  for (let i = 0; i < t.points.length - 1; i++) {
    const a = t.points[i];
    const b = t.points[i + 1];
    const dt = Math.max(1, b.frame - a.frame);
    steps.push(Math.hypot(b.x - a.x, b.y - a.y) / dt);
  }
  if (!steps.length) return -1;

  const avgStep = steps.reduce((s, v) => s + v, 0) / steps.length;
  const totalDisp = Math.hypot(
    t.points[n - 1].x - t.points[0].x,
    t.points[n - 1].y - t.points[0].y,
  );
  const span = endFrame(t) - startFrame(t) + 1;

  // A slow blob is almost certainly not a delivered ball.
  if (avgStep < procW * 0.01) return -1;

  // Straightness: net displacement vs path length.
  const pathLen = steps.reduce((s, v) => s + v, 0);
  const straightness = totalDisp / (pathLen + 1e-6);

  return n * 1.0 + avgStep * 0.5 + straightness * 30.0 + totalDisp * 0.05 + span * 0.5;
}

/**
 * Pick the best track and compute speed from real frame timestamps.
 * `distanceM` is the user-entered release→arrival distance (manual entry).
 */
export function estimateSpeed(
  perFrame: Detection[][],
  distanceM: number,
  procW: number,
): SpeedResult {
  const numDetections = perFrame.reduce((s, f) => s + f.length, 0);
  if (numDetections === 0) {
    return { success: false, note: 'No ball detected. Film side-on with the ball clearly visible.' };
  }

  const tracks = buildTracks(perFrame, procW);
  const scored = tracks
    .map((t) => ({ score: scoreTrack(t, procW), track: t }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { success: false, note: "Couldn't isolate the ball's path. Use a side-on clip." };
  }

  const { score: bestScore, track: best } = scored[0];
  const release = best.points[0];
  const arrival = best.points[best.points.length - 1];
  const timeSec = arrival.t - release.t;

  if (!(timeSec > 0)) {
    return { success: false, note: 'Ball moved too fast to time. Record at a higher frame rate.' };
  }

  const speedMps = distanceM / timeSec;
  const speedKmh = speedMps * 3.6;

  // Confidence from track length and the score (straightness proxy).
  const trackLen = best.points.length;
  let confidence: SpeedResult['confidence'];
  if (trackLen >= 10 && bestScore > 60) confidence = 'high';
  else if (trackLen >= 6) confidence = 'medium';
  else confidence = 'low';

  // Plausibility guard: flag clearly impossible readings.
  let note: string | undefined;
  if (speedKmh > 200 || speedKmh < 15) {
    note = `Estimated ${speedKmh.toFixed(0)} km/h looks off — check the Distance and film side-on.`;
  }

  return {
    success: true,
    speedKmh: Math.round(speedKmh * 10) / 10,
    speedMps: Math.round(speedMps * 100) / 100,
    timeSec: Math.round(timeSec * 10000) / 10000,
    trackPoints: trackLen,
    confidence,
    trajectory: best.points,
    note,
  };
}

"""
Automatic cricket-ball speed estimation from a bowling video using classical
computer vision (OpenCV).

The approach (Phase 2):
  1. Detect moving "ball-like" blobs in every frame using a background
     subtractor + frame differencing, filtered by size/shape.
  2. Link those per-frame detections into trajectories with a small greedy
     tracker (nearest-neighbour + motion gating).
  3. Pick the trajectory that best matches a delivered ball (small blob, large
     and consistent per-frame displacement travelling across the frame).
  4. Treat the first/last points of that trajectory as release/arrival and
     compute speed = distance / time, where time = delta_frames / fps and the
     distance (in metres) is supplied by the caller (defaults to pitch length).

This is heuristic and intentionally dependency-light (only needs opencv +
numpy, already in requirements). It is structured so a trained detector
(e.g. YOLOv8 / TrackNet) can later replace `detect_ball_candidates` without
touching the tracking / speed code.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Callable, List, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Pitch length (stump to stump) in metres - sensible default travel distance.
DEFAULT_DISTANCE_METERS = 20.12
DEFAULT_FPS = 30.0

# Cap processing resolution for speed; coordinates are scaled back to original.
_MAX_PROCESS_WIDTH = 960


@dataclass
class Detection:
    frame: int
    x: float
    y: float
    radius: float


@dataclass
class Track:
    points: List[Detection] = field(default_factory=list)
    last_seen_frame: int = -1

    @property
    def start_frame(self) -> int:
        return self.points[0].frame if self.points else -1

    @property
    def end_frame(self) -> int:
        return self.points[-1].frame if self.points else -1

    def velocity(self) -> tuple[float, float]:
        if len(self.points) < 2:
            return 0.0, 0.0
        a, b = self.points[-2], self.points[-1]
        dt = max(1, b.frame - a.frame)
        return (b.x - a.x) / dt, (b.y - a.y) / dt


def _read_fps(cap: cv2.VideoCapture, override: Optional[float]) -> float:
    if override and override > 0:
        return float(override)
    fps = cap.get(cv2.CAP_PROP_FPS)
    return float(fps) if fps and fps > 0 else DEFAULT_FPS


def detect_ball_candidates(
    video_path: str,
    progress_cb: Optional[Callable[[float], None]] = None,
) -> tuple[List[List[Detection]], float, int, int, float]:
    """
    Run motion detection and return per-frame ball candidates.

    Returns: (per_frame_detections, scale, proc_w, proc_h, frames_processed)
      - per_frame_detections[i] is the list of Detection in proc-resolution
        coordinates for frame i.
      - scale is proc->original multiplier (coords * scale = original pixels).
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video for ball detection")

    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 0
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0

    if src_w <= 0 or src_h <= 0:
        cap.release()
        raise ValueError("Invalid video dimensions")

    # Downscale for processing speed; remember scale to map back later.
    if src_w > _MAX_PROCESS_WIDTH:
        scale = src_w / float(_MAX_PROCESS_WIDTH)
        proc_w = _MAX_PROCESS_WIDTH
        proc_h = int(round(src_h / scale))
    else:
        scale = 1.0
        proc_w, proc_h = src_w, src_h

    frame_area = float(proc_w * proc_h)
    # Ball blob size bounds (relative to frame); tuned to reject body/bat.
    min_area = max(3.0, frame_area * 0.00002)
    max_area = frame_area * 0.01

    bg = cv2.createBackgroundSubtractorMOG2(history=200, varThreshold=24, detectShadows=False)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

    per_frame: List[List[Detection]] = []
    prev_gray: Optional[np.ndarray] = None
    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if scale != 1.0:
            frame = cv2.resize(frame, (proc_w, proc_h), interpolation=cv2.INTER_AREA)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        fg = bg.apply(frame)

        # Frame differencing captures fast motion the bg model lags on.
        if prev_gray is not None:
            diff = cv2.absdiff(gray, prev_gray)
            _, diff = cv2.threshold(diff, 18, 255, cv2.THRESH_BINARY)
            motion = cv2.bitwise_or(fg, diff)
        else:
            motion = fg
        prev_gray = gray

        motion = cv2.morphologyEx(motion, cv2.MORPH_OPEN, kernel, iterations=1)
        motion = cv2.dilate(motion, kernel, iterations=1)

        contours, _ = cv2.findContours(motion, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidates: List[Detection] = []
        for c in contours:
            area = cv2.contourArea(c)
            if area < min_area or area > max_area:
                continue
            x, y, w, h = cv2.boundingRect(c)
            if w == 0 or h == 0:
                continue
            # Allow blur streaks but reject very elongated/line-like noise.
            aspect = max(w, h) / float(min(w, h))
            if aspect > 4.5:
                continue
            # Reject tall thin (limbs) / very wide (bat) shapes via fill ratio.
            fill = area / float(w * h)
            if fill < 0.35:
                continue
            (cx, cy), radius = cv2.minEnclosingCircle(c)
            candidates.append(Detection(frame=frame_idx, x=float(cx), y=float(cy), radius=float(radius)))

        per_frame.append(candidates)
        frame_idx += 1

        if progress_cb and total_frames > 0 and frame_idx % 10 == 0:
            try:
                progress_cb(min(0.85, frame_idx / float(total_frames) * 0.85))
            except Exception:
                pass

    cap.release()
    return per_frame, scale, proc_w, proc_h, frame_idx


def _build_tracks(per_frame: List[List[Detection]], proc_w: int) -> List[Track]:
    """Greedy nearest-neighbour tracker with motion gating."""
    # Gating distance scales with frame width (fast ball can jump far/frame).
    base_gate = proc_w * 0.18
    max_gap = 4  # frames a track can go unmatched before it's closed

    active: List[Track] = []
    finished: List[Track] = []

    for frame_idx, dets in enumerate(per_frame):
        # Close stale tracks.
        still_active: List[Track] = []
        for t in active:
            if frame_idx - t.last_seen_frame > max_gap:
                finished.append(t)
            else:
                still_active.append(t)
        active = still_active

        used = [False] * len(dets)

        # Match existing tracks to nearest compatible detection.
        for t in active:
            vx, vy = t.velocity()
            last = t.points[-1]
            pred_x = last.x + vx * (frame_idx - last.frame)
            pred_y = last.y + vy * (frame_idx - last.frame)
            gate = base_gate + math.hypot(vx, vy) * 2.0

            best_j = -1
            best_d = gate
            for j, d in enumerate(dets):
                if used[j]:
                    continue
                dist = math.hypot(d.x - pred_x, d.y - pred_y)
                if dist < best_d:
                    best_d = dist
                    best_j = j
            if best_j >= 0:
                t.points.append(dets[best_j])
                t.last_seen_frame = frame_idx
                used[best_j] = True

        # Unmatched detections seed new tracks.
        for j, d in enumerate(dets):
            if not used[j]:
                active.append(Track(points=[d], last_seen_frame=frame_idx))

    finished.extend(active)
    return finished


def _score_track(t: Track, proc_w: int) -> float:
    """Higher is more ball-like: long, fast, consistent, travels across frame."""
    n = len(t.points)
    if n < 4:
        return -1.0

    steps = []
    for a, b in zip(t.points[:-1], t.points[1:]):
        dt = max(1, b.frame - a.frame)
        steps.append(math.hypot(b.x - a.x, b.y - a.y) / dt)
    if not steps:
        return -1.0

    avg_step = float(np.mean(steps))
    total_disp = math.hypot(
        t.points[-1].x - t.points[0].x,
        t.points[-1].y - t.points[0].y,
    )
    span = t.end_frame - t.start_frame + 1

    # A slow blob (avg_step tiny) is almost certainly not a delivered ball.
    if avg_step < proc_w * 0.01:
        return -1.0

    # Straightness: net displacement vs path length.
    path_len = float(np.sum(steps)) * 1.0
    straightness = total_disp / (path_len + 1e-6)

    return (n * 1.0) + (avg_step * 0.5) + (straightness * 30.0) + (total_disp * 0.05) + span * 0.5


def estimate_ball_speed(
    video_path: str,
    distance_m: float = DEFAULT_DISTANCE_METERS,
    fps_override: Optional[float] = None,
    progress_cb: Optional[Callable[[float], None]] = None,
) -> dict:
    """
    Estimate ball speed automatically. Returns a dict with speed + trajectory
    metadata. On failure to find a confident track, returns success=False with
    a human-readable note.
    """
    cap = cv2.VideoCapture(video_path)
    fps = _read_fps(cap, fps_override)
    cap.release()

    if not distance_m or distance_m <= 0:
        distance_m = DEFAULT_DISTANCE_METERS

    per_frame, scale, proc_w, proc_h, frames_processed = detect_ball_candidates(
        video_path, progress_cb=progress_cb
    )

    num_detections = sum(len(f) for f in per_frame)
    if num_detections == 0:
        return {
            "success": False,
            "fps": fps,
            "distance_m": distance_m,
            "num_detections": 0,
            "note": "No moving objects detected. Try a clearer, side-on clip recorded at 60/120 fps.",
        }

    tracks = _build_tracks(per_frame, proc_w)
    scored = sorted(
        ((_score_track(t, proc_w), t) for t in tracks),
        key=lambda x: x[0],
        reverse=True,
    )
    scored = [(s, t) for s, t in scored if s > 0]

    if not scored:
        return {
            "success": False,
            "fps": fps,
            "distance_m": distance_m,
            "num_detections": num_detections,
            "note": "Couldn't isolate the ball's path. Use a side-on clip with the ball clearly visible.",
        }

    best_score, best = scored[0]
    release_frame = best.start_frame
    arrival_frame = best.end_frame
    delta_frames = max(0, arrival_frame - release_frame)
    time_sec = delta_frames / fps if fps > 0 else 0.0

    if time_sec <= 0:
        return {
            "success": False,
            "fps": fps,
            "distance_m": distance_m,
            "num_detections": num_detections,
            "note": "Ball moved too fast for this frame rate. Record at 120 fps for better results.",
        }

    speed_mps = distance_m / time_sec
    speed_kmh = speed_mps * 3.6

    # Confidence from track length and straightness proxy (the score).
    track_len = len(best.points)
    if track_len >= 10 and best_score > 60:
        confidence = "high"
    elif track_len >= 6:
        confidence = "medium"
    else:
        confidence = "low"

    trajectory = [
        {
            "frame": p.frame,
            "x": round(p.x * scale, 1),
            "y": round(p.y * scale, 1),
            "r": round(p.radius * scale, 1),
        }
        for p in best.points
    ]

    note = None
    # Plausibility guard: flag clearly impossible readings.
    if speed_kmh > 200 or speed_kmh < 15:
        note = (
            f"Estimated {speed_kmh:.0f} km/h looks off - check the Distance/FPS "
            f"values and that the clip is side-on."
        )

    return {
        "success": True,
        "speed_kmh": round(speed_kmh, 1),
        "speed_mps": round(speed_mps, 2),
        "time_sec": round(time_sec, 4),
        "release_frame": int(release_frame),
        "arrival_frame": int(arrival_frame),
        "delta_frames": int(delta_frames),
        "fps": round(fps, 2),
        "distance_m": round(distance_m, 2),
        "num_detections": int(num_detections),
        "track_points": int(track_len),
        "confidence": confidence,
        "trajectory": trajectory,
        "method": "motion_cv",
        "note": note,
    }

import base64
import os
from dataclasses import dataclass
from typing import Any, Optional

import cv2
import numpy as np

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    YOLO = None


_YOLO_MODEL = None


def _get_yolo_model():
    global _YOLO_MODEL
    if _YOLO_MODEL is not None:
        return _YOLO_MODEL
    if YOLO is None:
        raise RuntimeError(
            "ultralytics is not installed. Please add it to your backend environment."
        )
    _YOLO_MODEL = YOLO("yolov8n.pt")
    return _YOLO_MODEL


def determine_contact_location_on_bat(contact_point, bat_bbox):
    """
    Determine where the ball hit the bat using professional cricket terminology.
    Along the blade: shoulder (handle end) -> sweet spot -> toe (bottom).
    Across the face: middle (full face) vs inside/outside edge.
    """
    contact_x, contact_y = contact_point
    bat_x1, bat_y1, bat_x2, bat_y2 = bat_bbox

    bat_width = bat_x2 - bat_x1
    bat_height = bat_y2 - bat_y1
    rel_x = (contact_x - bat_x1) / bat_width if bat_width > 0 else 0.5
    rel_y = (contact_y - bat_y1) / bat_height if bat_height > 0 else 0.5

    # Along the blade (vertical): 0 = handle end, 1 = toe
    if rel_y <= 0.22:
        vertical = "shoulder"
        short_vertical = "Shoulder"
    elif rel_y <= 0.42:
        vertical = "high"
        short_vertical = "High on bat"
    elif rel_y <= 0.58:
        vertical = "middle"
        short_vertical = "Sweet spot"
    elif rel_y <= 0.78:
        vertical = "low"
        short_vertical = "Low on bat"
    else:
        vertical = "toe"
        short_vertical = "Toe"

    # Across the face (horizontal): middle vs edge
    if rel_x <= 0.25:
        horizontal = "inside edge"
        short_horizontal = "Inside edge"
    elif rel_x >= 0.75:
        horizontal = "outside edge"
        short_horizontal = "Outside edge"
    else:
        horizontal = "middle"
        short_horizontal = None

    if horizontal == "middle":
        if vertical == "middle":
            location = "middle of the bat (sweet spot)—ideal contact"
            short_label = "Sweet spot"
        elif vertical == "shoulder":
            location = "shoulder of the bat (top, near the handle)—often mistimed"
            short_label = "Shoulder"
        elif vertical == "toe":
            location = "toe of the bat (bottom)—bottom edge territory"
            short_label = "Toe"
        else:
            location = f"{vertical} on the bat, full face"
            short_label = short_vertical
    else:
        if vertical == "middle":
            location = f"caught the {horizontal} of the bat"
            short_label = short_horizontal
        elif vertical == "shoulder":
            location = f"top {horizontal} (shoulder)"
            short_label = f"{short_vertical} ({short_horizontal})"
        elif vertical == "toe":
            location = f"toe, {horizontal}"
            short_label = f"Toe ({short_horizontal})"
        else:
            location = f"{vertical} on the bat, {horizontal}"
            short_label = f"{short_vertical} ({short_horizontal})"

    return location, short_label, float(rel_x), float(rel_y)


@dataclass
class BatBallContactResult:
    contact_detected: bool
    frame_index: Optional[int] = None
    contact_location: Optional[str] = None
    contact_point: Optional[tuple[float, float]] = None
    ball_speed_kmh: Optional[float] = None
    bat_speed_kmh: Optional[float] = None
    image_path: Optional[str] = None
    image_base64: Optional[str] = None
    debug: Optional[dict[str, Any]] = None


def _draw_hotspot(annotated_rgb, contact_point, label: Optional[str]):
    cx, cy = int(contact_point[0]), int(contact_point[1])
    cv2.circle(annotated_rgb, (cx, cy), 28, (255, 100, 50), -1)
    cv2.circle(annotated_rgb, (cx, cy), 20, (255, 150, 80), -1)
    cv2.circle(annotated_rgb, (cx, cy), 14, (255, 200, 120), -1)
    cv2.circle(annotated_rgb, (cx, cy), 8, (255, 255, 220), -1)
    cv2.circle(annotated_rgb, (cx, cy), 4, (255, 255, 255), -1)
    cv2.circle(annotated_rgb, (cx, cy), 30, (255, 180, 100), 2)

    if not label:
        return

    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.7
    thickness = 2
    (tw, th), _ = cv2.getTextSize(label, font, font_scale, thickness)
    label_x = cx - tw // 2
    label_y = cy - 42
    cv2.rectangle(
        annotated_rgb,
        (label_x - 4, label_y - th - 4),
        (label_x + tw + 4, label_y + 4),
        (0, 0, 0),
        -1,
    )
    cv2.rectangle(
        annotated_rgb,
        (label_x - 4, label_y - th - 4),
        (label_x + tw + 4, label_y + 4),
        (255, 200, 100),
        1,
    )
    cv2.putText(
        annotated_rgb,
        label,
        (label_x, label_y),
        font,
        font_scale,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA,
    )


def run_bat_ball_contact(
    video_path: str,
    *,
    output_dir: str,
    output_basename: str = "bat_contact",
    max_frames: int = 5000,
    contact_threshold_px: float = 150.0,
    speed_conversion_factor: float = 0.01,
    jpeg_quality: int = 80,
) -> BatBallContactResult:
    """
    Process a batting video and return a single image marking the first detected bat-ball contact.
    This is designed for backend use (headless): it does NOT open any windows.
    """
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    if fps <= 0:
        fps = 30.0

    model = _get_yolo_model()

    ball_previous_position = None
    ball_previous_frame = None
    bat_previous_position = None
    bat_previous_frame = None

    frame_idx = 0
    try:
        while frame_idx < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            results = model.predict(frame, classes=[32, 34], verbose=False)
            result = results[0]

            ball = None
            bat = None

            if result.boxes is not None and len(result.boxes) > 0:
                ball_detections = []
                bat_detections = []
                for box in result.boxes:
                    cls = int(box.cls.item())
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    center_x = (x1 + x2) / 2
                    center_y = (y1 + y2) / 2
                    area = (x2 - x1) * (y2 - y1)
                    det = {"center": (center_x, center_y), "bbox": (x1, y1, x2, y2), "area": area}
                    if cls == 32:
                        ball_detections.append(det)
                    elif cls == 34:
                        bat_detections.append(det)

                ball = max(ball_detections, key=lambda x: x["area"]) if ball_detections else None
                bat = max(bat_detections, key=lambda x: x["area"]) if bat_detections else None

            # Update previous positions (even if contact is not detected yet)
            if ball is not None:
                ball_previous_position = ball["center"]
                ball_previous_frame = frame_idx if ball_previous_frame is None else ball_previous_frame
            if bat is not None:
                bat_previous_position = bat["center"]
                bat_previous_frame = frame_idx if bat_previous_frame is None else bat_previous_frame

            if ball is None or bat is None:
                frame_idx += 1
                continue

            (ball_center_x, ball_center_y) = ball["center"]
            (bat_center_x, bat_center_y) = bat["center"]

            distance = float(
                np.sqrt((ball_center_x - bat_center_x) ** 2 + (ball_center_y - bat_center_y) ** 2)
            )

            ball_x1, ball_y1, ball_x2, ball_y2 = ball["bbox"]
            bat_x1, bat_y1, bat_x2, bat_y2 = bat["bbox"]

            overlap_x = max(0.0, min(ball_x2, bat_x2) - max(ball_x1, bat_x1))
            overlap_y = max(0.0, min(ball_y2, bat_y2) - max(ball_y1, bat_y1))
            overlap_area = float(overlap_x * overlap_y)

            is_contact = overlap_area > 0 or distance < contact_threshold_px
            if not is_contact:
                # advance and update prev frames properly
                if ball_previous_position is not None:
                    ball_previous_position = (ball_center_x, ball_center_y)
                    ball_previous_frame = frame_idx
                if bat_previous_position is not None:
                    bat_previous_position = (bat_center_x, bat_center_y)
                    bat_previous_frame = frame_idx
                frame_idx += 1
                continue

            # Contact point
            if overlap_area > 0:
                contact_x = (max(ball_x1, bat_x1) + min(ball_x2, bat_x2)) / 2
                contact_y = (max(ball_y1, bat_y1) + min(ball_y2, bat_y2)) / 2
            else:
                contact_x = (ball_center_x + bat_center_x) / 2
                contact_y = (ball_center_y + bat_center_y) / 2

            # Speed estimates (pixel -> m/s via heuristic conversion factor)
            ball_speed_kmh = None
            if ball_previous_position is not None and ball_previous_frame is not None and frame_idx != ball_previous_frame:
                prev_x, prev_y = ball_previous_position
                dp = float(np.sqrt((ball_center_x - prev_x) ** 2 + (ball_center_y - prev_y) ** 2))
                dt = float((frame_idx - ball_previous_frame) / fps)
                if dt > 0 and dp > 0:
                    ball_speed_kmh = float((dp / dt) * speed_conversion_factor * 3.6)

            bat_speed_kmh = None
            if bat_previous_position is not None and bat_previous_frame is not None and frame_idx != bat_previous_frame:
                prev_x, prev_y = bat_previous_position
                dp = float(np.sqrt((bat_center_x - prev_x) ** 2 + (bat_center_y - prev_y) ** 2))
                dt = float((frame_idx - bat_previous_frame) / fps)
                if dt > 0 and dp > 0:
                    bat_speed_kmh = float((dp / dt) * speed_conversion_factor * 3.6)

            contact_location, short_label, rel_x, rel_y = determine_contact_location_on_bat(
                (contact_x, contact_y),
                (bat_x1, bat_y1, bat_x2, bat_y2),
            )

            annotated_rgb = result.plot()  # ultralytics returns RGB
            _draw_hotspot(annotated_rgb, (contact_x, contact_y), short_label)

            annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)
            image_filename = f"{output_basename}_frame_{frame_idx}.jpg"
            image_path = os.path.join(output_dir, image_filename)
            cv2.imwrite(image_path, annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)])

            with open(image_path, "rb") as f:
                image_base64 = base64.b64encode(f.read()).decode("utf-8")

            return BatBallContactResult(
                contact_detected=True,
                frame_index=int(frame_idx),
                contact_location=contact_location,
                contact_point=(float(contact_x), float(contact_y)),
                ball_speed_kmh=ball_speed_kmh,
                bat_speed_kmh=bat_speed_kmh,
                image_path=image_path,
                image_base64=image_base64,
                debug={
                    "distance_px": distance,
                    "overlap_area_px2": overlap_area,
                    "relative_position_on_bat": {"x": rel_x, "y": rel_y},
                },
            )

            # (unreachable)
            # frame_idx += 1

            # Update prev and advance
            # (done above on continue paths)
            # frame_idx += 1

            # Note: We intentionally exit on first detected contact.

            # end while
            # ---

            # unreachable

            # ---

            # We keep loop simple and exit early.

            # ---

            # (no further frames)

            # ---

        return BatBallContactResult(contact_detected=False)
    finally:
        cap.release()


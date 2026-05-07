from ultralytics import YOLO
import cv2
import numpy as np
import json
import time
import google.generativeai as genai
import os
import argparse
from typing import Any, Dict, Optional, Tuple

# Configure Gemini via env var (do not hardcode secrets in repo)
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if _GEMINI_API_KEY:
    genai.configure(api_key=_GEMINI_API_KEY)

# Load YOLO once (expensive)
_YOLO_MODEL = None
def _get_yolo_model():
    global _YOLO_MODEL
    if _YOLO_MODEL is None:
        _YOLO_MODEL = YOLO("yolov8n.pt")
    return _YOLO_MODEL

def determine_contact_location_on_bat(contact_point, bat_bbox):
    """
    Determine where the ball hit the bat using professional cricket terminology.
    Along the blade: shoulder (handle end) -> sweet spot -> toe (bottom).
    Across the face: middle (full face) vs inside/outside edge.

    Returns:
        location: Full description for commentary/Gemini
        short_label: Short label for on-screen overlay (e.g. "Sweet spot")
        rel_x, rel_y: Relative position in [0,1]
    """
    contact_x, contact_y = contact_point
    bat_x1, bat_y1, bat_x2, bat_y2 = bat_bbox

    bat_width = bat_x2 - bat_x1
    bat_height = bat_y2 - bat_y1
    rel_x = (contact_x - bat_x1) / bat_width if bat_width > 0 else 0.5
    rel_y = (contact_y - bat_y1) / bat_height if bat_height > 0 else 0.5

    # Along the blade (vertical): 0 = handle end, 1 = toe
    if rel_y <= 0.22:
        vertical = "shoulder"      # top of bat, near handle
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
        short_horizontal = None  # only show vertical when middle of face

    # Build professional description
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

    return location, short_label, rel_x, rel_y

def send_to_gemini(contact_data):
    """
    Send contact data to Gemini API and get analysis
    
    Args:
        contact_data: dict containing contact information
    
    Returns:
        str: Gemini's analysis response
    """
    try:
        if not _GEMINI_API_KEY:
            return "Gemini API key not configured on server (set GEMINI_API_KEY)."
        # Create prompt
        prompt = f"""Analyze this cricket/baseball bat-ball contact data and provide a detailed report:

Contact Data:
- Frame: {contact_data['frame']}
- Ball Speed: {contact_data['ball_speed_kmh']:.2f} km/h ({contact_data['ball_speed_mps']:.2f} m/s)
- Bat Speed: {contact_data['bat_speed_kmh']:.2f} km/h ({contact_data['bat_speed_mps']:.2f} m/s)
- Contact Point: ({contact_data['contact_point'][0]:.2f}, {contact_data['contact_point'][1]:.2f}) pixels
- Contact Location on Bat: {contact_data['contact_location']}
- Ball Position: ({contact_data['ball_position'][0]:.2f}, {contact_data['ball_position'][1]:.2f})
- Bat Position: ({contact_data['bat_position'][0]:.2f}, {contact_data['bat_position'][1]:.2f})
- Distance: {contact_data['distance']:.2f} pixels
- Overlap Area: {contact_data['overlap_area']:.2f} pixels²

Please provide:
1. The bat speed while hitting the ball (in km/h and m/s)
2. The exact contact point location on the bat with descriptive name (e.g., "upper side of bat", "left edge of bat", "sweet spot", etc.)
3. Any additional insights about the contact quality

Format your response clearly and concisely."""
        
        # Get response from Gemini using GenerativeModel with config
        model_gemini = genai.GenerativeModel(
            model_name="gemini-2.5-pro",
            generation_config={
                "temperature": 0,
                "top_p": 1,
                "top_k": 1
            }
        )
        response = model_gemini.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error calling Gemini API: {str(e)}"

def analyze_ball_bat_contact(
    video_path: str,
    *,
    show_video: bool = False,
    save_video: bool = True,
    play_at_video_speed: bool = False,
    output_video_path: Optional[str] = None,
    contact_threshold: float = 150.0,
) -> Dict[str, Any]:
    # Track positions for ball and bat
    ball_previous_position: Optional[Tuple[float, float]] = None
    ball_previous_frame: Optional[int] = None
    bat_previous_position: Optional[Tuple[float, float]] = None
    bat_previous_frame: Optional[int] = None
    contact_detected = False

    # Contact point hotspot: show where ball hit the bat (point, frames to show)
    contact_point_hotspot: Optional[Tuple[float, float]] = None
    contact_hotspot_label: Optional[str] = None
    contact_hotspot_frames_left = 0
    CONTACT_HOTSPOT_DURATION_FRAMES = 90  # show hotspot for ~3 sec at 30 fps

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0
    frame_interval = 1.0 / fps
    frame_rate = fps
    out = None

    if save_video and not output_video_path:
        base, _ = os.path.splitext(video_path)
        output_video_path = f"{base}__bat_ball_contact_annotated.mp4"

    model = _get_yolo_model()

    frame_idx = 0
    next_display_time = time.time()

    # Output we will return
    best_contact: Optional[Dict[str, Any]] = None
    gemini_response: Optional[str] = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.predict(frame, classes=[32, 34], verbose=False)
        result = results[0]

        if result.boxes is not None and len(result.boxes) > 0:
            frame_rate = fps if fps > 0 else 30.0

            ball_detections = []
            bat_detections = []

            for box in result.boxes:
                cls = int(box.cls.item())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                area = (x2 - x1) * (y2 - y1)

                if cls == 32:  # baseball (ball)
                    ball_detections.append({'center': (center_x, center_y), 'bbox': (x1, y1, x2, y2), 'area': area})
                elif cls == 34:  # baseball bat
                    bat_detections.append({'center': (center_x, center_y), 'bbox': (x1, y1, x2, y2), 'area': area})

            ball = max(ball_detections, key=lambda x: x['area']) if ball_detections else None
            bat = max(bat_detections, key=lambda x: x['area']) if bat_detections else None

            if ball is not None and bat is not None:
                ball_center_x, ball_center_y = ball['center']
                bat_center_x, bat_center_y = bat['center']

                distance = float(np.sqrt((ball_center_x - bat_center_x) ** 2 + (ball_center_y - bat_center_y) ** 2))

                ball_x1, ball_y1, ball_x2, ball_y2 = ball['bbox']
                bat_x1, bat_y1, bat_x2, bat_y2 = bat['bbox']

                overlap_x = max(0, min(ball_x2, bat_x2) - max(ball_x1, bat_x1))
                overlap_y = max(0, min(ball_y2, bat_y2) - max(ball_y1, bat_y1))
                overlap_area = float(overlap_x * overlap_y)

                is_contact = overlap_area > 0 or distance < contact_threshold

                if is_contact:
                    if not contact_detected:
                        contact_detected = True
                        contact_hotspot_frames_left = CONTACT_HOTSPOT_DURATION_FRAMES

                        if overlap_area > 0:
                            contact_x = (max(ball_x1, bat_x1) + min(ball_x2, bat_x2)) / 2
                            contact_y = (max(ball_y1, bat_y1) + min(ball_y2, bat_y2)) / 2
                        else:
                            contact_x = (ball_center_x + bat_center_x) / 2
                            contact_y = (ball_center_y + bat_center_y) / 2

                        contact_point_hotspot = (float(contact_x), float(contact_y))

                        # Calculate speeds from previous positions (simple approximation)
                        ball_speed_pixels_per_sec = 0.0
                        ball_speed_mps = 0.0
                        ball_speed_kmh = 0.0
                        if ball_previous_position is not None and ball_previous_frame is not None:
                            prev_x, prev_y = ball_previous_position
                            dx = ball_center_x - prev_x
                            dy = ball_center_y - prev_y
                            distance_pixels = float(np.sqrt(dx**2 + dy**2))
                            frames_diff = frame_idx - ball_previous_frame
                            time_diff = frames_diff / frame_rate if frame_rate > 0 else 1 / 30
                            if time_diff > 0 and distance_pixels > 0:
                                ball_speed_pixels_per_sec = distance_pixels / time_diff
                                conversion_factor = 0.01
                                ball_speed_mps = ball_speed_pixels_per_sec * conversion_factor
                                ball_speed_kmh = ball_speed_mps * 3.6

                        bat_speed_pixels_per_sec = 0.0
                        bat_speed_mps = 0.0
                        bat_speed_kmh = 0.0
                        if bat_previous_position is not None and bat_previous_frame is not None:
                            prev_x, prev_y = bat_previous_position
                            dx = bat_center_x - prev_x
                            dy = bat_center_y - prev_y
                            distance_pixels = float(np.sqrt(dx**2 + dy**2))
                            frames_diff = frame_idx - bat_previous_frame
                            time_diff = frames_diff / frame_rate if frame_rate > 0 else 1 / 30
                            if time_diff > 0 and distance_pixels > 0:
                                bat_speed_pixels_per_sec = distance_pixels / time_diff
                                conversion_factor = 0.01
                                bat_speed_mps = bat_speed_pixels_per_sec * conversion_factor
                                bat_speed_kmh = bat_speed_mps * 3.6

                        contact_location, short_label, rel_x, rel_y = determine_contact_location_on_bat(
                            (contact_x, contact_y),
                            (bat_x1, bat_y1, bat_x2, bat_y2),
                        )
                        contact_hotspot_label = short_label

                        best_contact = {
                            'frame': int(frame_idx),
                            'ball_speed_kmh': float(ball_speed_kmh),
                            'ball_speed_mps': float(ball_speed_mps),
                            'bat_speed_kmh': float(bat_speed_kmh),
                            'bat_speed_mps': float(bat_speed_mps),
                            'contact_point': [float(contact_x), float(contact_y)],
                            'contact_location': str(contact_location),
                            'ball_position': [float(ball_center_x), float(ball_center_y)],
                            'bat_position': [float(bat_center_x), float(bat_center_y)],
                            'distance': float(distance),
                            'overlap_area': float(overlap_area),
                            'relative_position_on_bat': {'x': float(rel_x), 'y': float(rel_y)},
                        }

                        # Generate Gemini analysis once, on first detected contact
                        gemini_response = send_to_gemini(best_contact)
                else:
                    contact_detected = False
            else:
                contact_detected = False

            # Update previous positions
            if ball is not None:
                ball_center_x, ball_center_y = ball['center']
                ball_previous_position = (float(ball_center_x), float(ball_center_y))
                ball_previous_frame = int(frame_idx)

            if bat is not None:
                bat_center_x, bat_center_y = bat['center']
                bat_previous_position = (float(bat_center_x), float(bat_center_y))
                bat_previous_frame = int(frame_idx)

        annotated = result.plot()  # RGB

        if contact_point_hotspot is not None and contact_hotspot_frames_left > 0:
            cx, cy = int(contact_point_hotspot[0]), int(contact_point_hotspot[1])
            cv2.circle(annotated, (cx, cy), 28, (255, 100, 50), -1)
            cv2.circle(annotated, (cx, cy), 20, (255, 150, 80), -1)
            cv2.circle(annotated, (cx, cy), 14, (255, 200, 120), -1)
            cv2.circle(annotated, (cx, cy), 8, (255, 255, 220), -1)
            cv2.circle(annotated, (cx, cy), 4, (255, 255, 255), -1)
            cv2.circle(annotated, (cx, cy), 30, (255, 180, 100), 2)
            if contact_hotspot_label:
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.7
                thickness = 2
                (tw, th), _ = cv2.getTextSize(contact_hotspot_label, font, font_scale, thickness)
                label_x = cx - tw // 2
                label_y = cy - 42
                cv2.rectangle(annotated, (label_x - 4, label_y - th - 4), (label_x + tw + 4, label_y + 4), (0, 0, 0), -1)
                cv2.rectangle(annotated, (label_x - 4, label_y - th - 4), (label_x + tw + 4, label_y + 4), (255, 200, 100), 1)
                cv2.putText(annotated, contact_hotspot_label, (label_x, label_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)
            contact_hotspot_frames_left -= 1
        elif contact_hotspot_frames_left == 0 and contact_point_hotspot is not None:
            contact_point_hotspot = None
            contact_hotspot_label = None

        if play_at_video_speed:
            now = time.time()
            if now < next_display_time:
                time.sleep(next_display_time - now)

        if show_video:
            annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
            cv2.imshow("Bat & Ball", annotated_bgr)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        if save_video and output_video_path:
            if out is None:
                h, w = annotated.shape[:2]
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(output_video_path, fourcc, fps, (w, h))
            annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
            out.write(annotated_bgr)

        next_display_time += frame_interval
        frame_idx += 1

    cap.release()
    if out is not None:
        out.release()
    if show_video:
        cv2.destroyAllWindows()

    return {
        "success": True,
        "contact": best_contact,
        "gemini_analysis": gemini_response,
        "annotated_video_path": output_video_path if save_video else None,
    }


def main():
    parser = argparse.ArgumentParser(description="Ball-bat contact detector (YOLO) + Gemini summary")
    parser.add_argument("--video", required=True, help="Path to input video file")
    parser.add_argument("--show", action="store_true", help="Show OpenCV preview window")
    parser.add_argument("--no-save", action="store_true", help="Do not save annotated video")
    parser.add_argument("--output", default=None, help="Output annotated video path (mp4)")
    parser.add_argument("--play-at-video-speed", action="store_true", help="Throttle processing to source FPS")
    parser.add_argument("--contact-threshold", type=float, default=150.0, help="Pixel threshold for contact (center distance)")
    args = parser.parse_args()

    res = analyze_ball_bat_contact(
        args.video,
        show_video=args.show,
        save_video=not args.no_save,
        play_at_video_speed=args.play_at_video_speed,
        output_video_path=args.output,
        contact_threshold=args.contact_threshold,
    )
    print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
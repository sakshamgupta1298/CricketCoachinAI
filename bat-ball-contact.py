from ultralytics import YOLO
import cv2
import numpy as np
import json
import time
import google.generativeai as genai

# Configure Gemini API - Set your API key directly here
GEMINI_API_KEY = "AIzaSyCRUWEXGJ7lahvMU90gXDKHF39H5Eb-I8Q"
genai.configure(api_key=GEMINI_API_KEY)

model = YOLO("yolov8n.pt")

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

# Track positions for ball and bat
ball_previous_position = None
ball_previous_frame = None
bat_previous_position = None
bat_previous_frame = None
contact_detected = False
fps = 30  # Default FPS, will be updated from video

# Contact point hotspot: show where ball hit the bat (point, frames to show)
contact_point_hotspot = None   # (x, y) in pixel coords
contact_hotspot_label = None   # short professional label, e.g. "Sweet spot"
contact_hotspot_frames_left = 0
CONTACT_HOTSPOT_DURATION_FRAMES = 90  # show hotspot for ~3 sec at 30 fps
pending_gemini_data = None  # defer Gemini call until after we show the frame

# Video path and playback options
VIDEO_PATH = "coverdrive.mp4"
SHOW_VIDEO = True
SAVE_VIDEO = True
PLAY_AT_VIDEO_SPEED = True  # Display each frame at exact video FPS (same speed as source)

cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO_PATH}")
fps = cap.get(cv2.CAP_PROP_FPS)
if fps <= 0:
    fps = 30
frame_interval = 1.0 / fps  # Time between frames in seconds
frame_rate = fps
out = None  # VideoWriter, created after first frame

print(f"Using video FPS: {fps} (frame interval: {frame_interval*1000:.1f} ms)")

# Process video frame by frame so we control display timing
frame_idx = 0
next_display_time = time.time()  # When we should show the next frame

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Run YOLO on this frame (same classes as before)
    results = model.predict(frame, classes=[32, 34], verbose=False)
    result = results[0]

    if result.boxes is not None and len(result.boxes) > 0:
        # Get frame rate (frames per second)
        frame_rate = fps if fps > 0 else 30
        
        # Separate detections by class
        ball_detections = []
        bat_detections = []
        
        for box in result.boxes:
            cls = int(box.cls.item())
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2
            area = (x2 - x1) * (y2 - y1)
            
            if cls == 32:  # Baseball
                ball_detections.append({
                    'center': (center_x, center_y),
                    'bbox': (x1, y1, x2, y2),
                    'area': area
                })
            elif cls == 34:  # Baseball bat
                bat_detections.append({
                    'center': (center_x, center_y),
                    'bbox': (x1, y1, x2, y2),
                    'area': area
                })
        
        # Get the largest ball and bat (most likely the main objects)
        ball = max(ball_detections, key=lambda x: x['area']) if ball_detections else None
        bat = max(bat_detections, key=lambda x: x['area']) if bat_detections else None
        
        # Debug: Print detection status
        if frame_idx % 30 == 0:  # Print every 30 frames for debugging
            print(f"Frame {frame_idx}: Ball detected: {ball is not None}, Bat detected: {bat is not None}")
            if ball is not None:
                print(f"  Ball at: {ball['center']}")
            if bat is not None:
                print(f"  Bat at: {bat['center']}")
        
        # Check for contact between ball and bat (do this first, before speed calculation)
        speed_pixels_per_sec = 0
        speed_mps = 0
        speed_kmh = 0
        
        if ball is not None and bat is not None:
            ball_center_x, ball_center_y = ball['center']
            bat_center_x, bat_center_y = bat['center']
            
            # Calculate distance between ball and bat centers
            distance = np.sqrt((ball_center_x - bat_center_x)**2 + 
                             (ball_center_y - bat_center_y)**2)
            
            # Calculate bounding box overlap to better detect contact
            ball_x1, ball_y1, ball_x2, ball_y2 = ball['bbox']
            bat_x1, bat_y1, bat_x2, bat_y2 = bat['bbox']
            
            # Check if bounding boxes overlap
            overlap_x = max(0, min(ball_x2, bat_x2) - max(ball_x1, bat_x1))
            overlap_y = max(0, min(ball_y2, bat_y2) - max(ball_y1, bat_y1))
            overlap_area = overlap_x * overlap_y
            
            # Contact threshold: bounding boxes overlap or centers are very close
            # Increased threshold significantly for better detection
            contact_threshold = 150  # pixels - increased threshold for better detection
            
            # Debug: Print distance info when both are detected
            if frame_idx % 10 == 0:  # Print every 10 frames when both detected
                print(f"Frame {frame_idx}: Distance = {distance:.2f}px, Overlap = {overlap_area:.2f}px², Threshold = {contact_threshold}px")
            
            is_contact = overlap_area > 0 or distance < contact_threshold
            
            if is_contact:
                if not contact_detected:
                    # Contact detected for the first time!
                    contact_detected = True
                    contact_hotspot_frames_left = CONTACT_HOTSPOT_DURATION_FRAMES

                    # Calculate contact point (midpoint between centers or overlap center)
                    if overlap_area > 0:
                        # Use center of overlap region
                        contact_x = (max(ball_x1, bat_x1) + min(ball_x2, bat_x2)) / 2
                        contact_y = (max(ball_y1, bat_y1) + min(ball_y2, bat_y2)) / 2
                    else:
                        # Use midpoint between centers
                        contact_x = (ball_center_x + bat_center_x) / 2
                        contact_y = (ball_center_y + bat_center_y) / 2

                    contact_point_hotspot = (float(contact_x), float(contact_y))

                    # Calculate ball speed if we have previous position
                    ball_speed_pixels_per_sec = 0
                    ball_speed_mps = 0
                    ball_speed_kmh = 0
                    
                    if ball_previous_position is not None and ball_previous_frame is not None:
                        prev_x, prev_y = ball_previous_position
                        dx = ball_center_x - prev_x
                        dy = ball_center_y - prev_y
                        distance_pixels = np.sqrt(dx**2 + dy**2)
                        frames_diff = frame_idx - ball_previous_frame
                        time_diff = frames_diff / frame_rate if frame_rate > 0 else 1/30
                        if time_diff > 0 and distance_pixels > 0:
                            ball_speed_pixels_per_sec = distance_pixels / time_diff
                            conversion_factor = 0.01
                            ball_speed_mps = ball_speed_pixels_per_sec * conversion_factor
                            ball_speed_kmh = ball_speed_mps * 3.6
                    
                    # Calculate bat speed if we have previous position
                    bat_speed_pixels_per_sec = 0
                    bat_speed_mps = 0
                    bat_speed_kmh = 0
                    
                    if bat_previous_position is not None and bat_previous_frame is not None:
                        prev_x, prev_y = bat_previous_position
                        dx = bat_center_x - prev_x
                        dy = bat_center_y - prev_y
                        distance_pixels = np.sqrt(dx**2 + dy**2)
                        frames_diff = frame_idx - bat_previous_frame
                        time_diff = frames_diff / frame_rate if frame_rate > 0 else 1/30
                        if time_diff > 0 and distance_pixels > 0:
                            bat_speed_pixels_per_sec = distance_pixels / time_diff
                            conversion_factor = 0.01
                            bat_speed_mps = bat_speed_pixels_per_sec * conversion_factor
                            bat_speed_kmh = bat_speed_mps * 3.6
                    
                    # Determine contact location on bat
                    contact_location, short_label, rel_x, rel_y = determine_contact_location_on_bat(
                        (contact_x, contact_y),
                        (bat_x1, bat_y1, bat_x2, bat_y2)
                    )
                    contact_hotspot_label = short_label

                    # Create contact data dictionary
                    contact_data = {
                        'frame': frame_idx,
                        'ball_speed_pixels_per_sec': ball_speed_pixels_per_sec,
                        'ball_speed_mps': ball_speed_mps,
                        'ball_speed_kmh': ball_speed_kmh,
                        'bat_speed_pixels_per_sec': bat_speed_pixels_per_sec,
                        'bat_speed_mps': bat_speed_mps,
                        'bat_speed_kmh': bat_speed_kmh,
                        'contact_point': (contact_x, contact_y),
                        'contact_location': contact_location,
                        'ball_position': (ball_center_x, ball_center_y),
                        'bat_position': (bat_center_x, bat_center_y),
                        'bat_bbox': (bat_x1, bat_y1, bat_x2, bat_y2),
                        'distance': distance,
                        'overlap_area': overlap_area,
                        'relative_position_on_bat': {'x': rel_x, 'y': rel_y}
                    }
                    
                    # Print contact information
                    print("\n" + "="*60)
                    print(f"CONTACT DETECTED at Frame {frame_idx}!")
                    print(f"Contact Point: ({contact_x:.2f}, {contact_y:.2f}) pixels")
                    print(f"Contact Location on Bat: {contact_location}")
                    if ball_speed_pixels_per_sec > 0:
                        print(f"Ball Speed at Contact: {ball_speed_pixels_per_sec:.2f} px/s | "
                              f"{ball_speed_mps:.2f} m/s | {ball_speed_kmh:.2f} km/h")
                    else:
                        print("Ball Speed at Contact: Calculating...")
                    if bat_speed_pixels_per_sec > 0:
                        print(f"Bat Speed at Contact: {bat_speed_pixels_per_sec:.2f} px/s | "
                              f"{bat_speed_mps:.2f} m/s | {bat_speed_kmh:.2f} km/h")
                    else:
                        print("Bat Speed at Contact: Calculating...")
                    print(f"Distance between centers: {distance:.2f} pixels")
                    print(f"Overlap area: {overlap_area:.2f} pixels²")
                    print("="*60 + "\n")
                    
                    # Convert to JSON and send to Gemini
                    print("Sending data to Gemini for analysis...")
                    print("\n" + "-"*60)
                    print("GEMINI ANALYSIS:")
                    print("-"*60)
                    
                    # Convert numpy types to native Python types for JSON serialization
                    json_data = {
                        'frame': int(contact_data['frame']),
                        'ball_speed_kmh': float(contact_data['ball_speed_kmh']),
                        'ball_speed_mps': float(contact_data['ball_speed_mps']),
                        'bat_speed_kmh': float(contact_data['bat_speed_kmh']),
                        'bat_speed_mps': float(contact_data['bat_speed_mps']),
                        'contact_point': [float(contact_data['contact_point'][0]), float(contact_data['contact_point'][1])],
                        'contact_location': contact_data['contact_location'],
                        'ball_position': [float(contact_data['ball_position'][0]), float(contact_data['ball_position'][1])],
                        'bat_position': [float(contact_data['bat_position'][0]), float(contact_data['bat_position'][1])],
                        'distance': float(contact_data['distance']),
                        'overlap_area': float(contact_data['overlap_area'])
                    }
                    
                    # Print JSON for reference
                    print("JSON Data sent to Gemini:")
                    print(json.dumps(json_data, indent=2))
                    print("\n")
                    
                    # Get analysis from Gemini
                    gemini_response = send_to_gemini(json_data)
                    print(gemini_response)
                    print("-"*60 + "\n")
            else:
                contact_detected = False
        elif ball is None or bat is None:
            # Reset contact flag if one object is missing
            contact_detected = False
        
        # Calculate ball speed (for regular updates)
        if ball is not None:
            ball_center_x, ball_center_y = ball['center']
            
            if ball_previous_position is not None and ball_previous_frame is not None:
                # Calculate distance moved (in pixels)
                prev_x, prev_y = ball_previous_position
                dx = ball_center_x - prev_x
                dy = ball_center_y - prev_y
                distance_pixels = np.sqrt(dx**2 + dy**2)
                
                # Calculate time difference (frames to seconds)
                frames_diff = frame_idx - ball_previous_frame
                time_diff = frames_diff / frame_rate if frame_rate > 0 else 1/30
                
                # Calculate speed (pixels per second)
                if time_diff > 0 and distance_pixels > 0:
                    speed_pixels_per_sec = distance_pixels / time_diff
                    
                    # Convert to approximate real-world speed
                    conversion_factor = 0.01  # Adjust this based on your video calibration
                    speed_mps = speed_pixels_per_sec * conversion_factor
                    speed_kmh = speed_mps * 3.6
                    
                    # Print regular speed updates (less verbose)
                    if frame_idx % 10 == 0:  # Print every 10 frames
                        print(f"Frame {frame_idx}: Ball Speed = {speed_pixels_per_sec:.2f} px/s | "
                              f"{speed_mps:.2f} m/s | {speed_kmh:.2f} km/h")
            
            # Update previous ball position
            ball_previous_position = (ball_center_x, ball_center_y)
            ball_previous_frame = frame_idx
        
        # Calculate bat speed (for regular updates)
        if bat is not None:
            bat_center_x, bat_center_y = bat['center']
            
            if bat_previous_position is not None and bat_previous_frame is not None:
                # Calculate distance moved (in pixels)
                prev_x, prev_y = bat_previous_position
                dx = bat_center_x - prev_x
                dy = bat_center_y - prev_y
                distance_pixels = np.sqrt(dx**2 + dy**2)
                
                # Calculate time difference (frames to seconds)
                frames_diff = frame_idx - bat_previous_frame
                time_diff = frames_diff / frame_rate if frame_rate > 0 else 1/30
                
                # Calculate speed (pixels per second)
                if time_diff > 0 and distance_pixels > 0:
                    bat_speed_pixels_per_sec = distance_pixels / time_diff
                    
                    # Convert to approximate real-world speed
                    conversion_factor = 0.01  # Adjust this based on your video calibration
                    bat_speed_mps = bat_speed_pixels_per_sec * conversion_factor
                    bat_speed_kmh = bat_speed_mps * 3.6
                    
                    # Print regular speed updates (less verbose)
                    if frame_idx % 10 == 0:  # Print every 10 frames
                        print(f"Frame {frame_idx}: Bat Speed = {bat_speed_pixels_per_sec:.2f} px/s | "
                              f"{bat_speed_mps:.2f} m/s | {bat_speed_kmh:.2f} km/h")
            
            # Update previous bat position
            bat_previous_position = (bat_center_x, bat_center_y)
            bat_previous_frame = frame_idx

    # Display at the video's original speed: wait until scheduled time, then show
    annotated = result.plot()  # RGB

    # Draw contact point hotspot on bat (where ball hit)
    if contact_point_hotspot is not None and contact_hotspot_frames_left > 0:
        cx, cy = int(contact_point_hotspot[0]), int(contact_point_hotspot[1])
        # Glow: outer circle (orange-red)
        cv2.circle(annotated, (cx, cy), 28, (255, 100, 50), -1)   # RGB
        cv2.circle(annotated, (cx, cy), 20, (255, 150, 80), -1)
        cv2.circle(annotated, (cx, cy), 14, (255, 200, 120), -1)
        # Hot center
        cv2.circle(annotated, (cx, cy), 8, (255, 255, 220), -1)
        cv2.circle(annotated, (cx, cy), 4, (255, 255, 255), -1)
        # Outline so it stays visible on any background
        cv2.circle(annotated, (cx, cy), 30, (255, 180, 100), 2)
        # Professional label: where it hit the bat
        if contact_hotspot_label:
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.7
            thickness = 2
            (tw, th), _ = cv2.getTextSize(contact_hotspot_label, font, font_scale, thickness)
            label_x = cx - tw // 2
            label_y = cy - 42
            # Shadow/background for readability
            cv2.rectangle(annotated, (label_x - 4, label_y - th - 4), (label_x + tw + 4, label_y + 4), (0, 0, 0), -1)
            cv2.rectangle(annotated, (label_x - 4, label_y - th - 4), (label_x + tw + 4, label_y + 4), (255, 200, 100), 1)
            cv2.putText(annotated, contact_hotspot_label, (label_x, label_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)
        contact_hotspot_frames_left -= 1
    elif contact_hotspot_frames_left == 0 and contact_point_hotspot is not None:
        contact_point_hotspot = None
        contact_hotspot_label = None

    if PLAY_AT_VIDEO_SPEED:
        now = time.time()
        if now < next_display_time:
            time.sleep(next_display_time - now)
    if SHOW_VIDEO:
        annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
        cv2.imshow("Bat & Ball", annotated_bgr)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    if SAVE_VIDEO:
        if out is None:
            h, w = annotated.shape[:2]
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter("coverdrive_annotated.mp4", fourcc, fps, (w, h))
        annotated_bgr = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
        out.write(annotated_bgr)
    next_display_time += frame_interval
    frame_idx += 1

cap.release()
if out is not None:
    out.release()
cv2.destroyAllWindows()
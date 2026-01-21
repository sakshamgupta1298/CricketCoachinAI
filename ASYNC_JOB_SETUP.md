# Async Job System - Setup & Troubleshooting

## What Changed

### Backend (`backend_script.py`)
- ✅ `/api/upload` now returns `job_id` **immediately** after saving the file (doesn't wait for analysis)
- ✅ Analysis runs in a **background thread** (`process_analysis_job`)
- ✅ New endpoint: `GET /api/results/job/{job_id}` - Check job status and get results
- ✅ Backend sends **Expo push notification** when analysis completes
- ✅ Jobs are stored in user folders as `job_{job_id}.json`

### App (`src/services/api.ts`)
- ✅ Upload timeout reduced from **10 minutes → 3 minutes** (backend returns immediately, so 3 min is enough for file upload)
- ✅ Upload now expects `job_id` response instead of full results
- ✅ New method: `getJobResult(job_id)` - Poll for job status

### App (`src/services/backgroundUpload.ts`)
- ✅ Now tracks `job_id` instead of just `filename`
- ✅ Polls `GET /api/results/job/{job_id}` when app is **active**
- ✅ Stops polling when app goes to background (OS limitation)

### App (`App.tsx` + `src/screens/UploadScreen.tsx`)
- ✅ Integrated `expo-notifications` for push notifications
- ✅ Registers push token on app start
- ✅ Sends push token with upload request
- ✅ Handles notification taps → opens Results screen

## Setup Steps

### 1. Install Dependencies
```bash
npx expo install expo-notifications
```

### 2. Restart Backend Server
**IMPORTANT**: Restart your backend server to pick up the new async job code:
```bash
# Stop current server (Ctrl+C)
# Then restart:
python backend_script.py
# OR if using gunicorn:
gunicorn backend_script:app
```

### 3. Test the Flow

1. **Start the app** → Should request notification permissions
2. **Upload a video** → Should get `job_id` immediately (check logs)
3. **Switch to another app** → Upload should complete, analysis continues on server
4. **Wait for notification** → When analysis finishes, you'll get a push notification
5. **Tap notification** → Opens Results screen

## Troubleshooting "Upload timeout exceeded"

### If you still see timeout errors:

1. **Check backend logs** - Is `/api/upload` returning `job_id` immediately?
   ```bash
   # Look for this in backend logs:
   "🧵 [JOB {job_id}] Enqueued analysis for {username} file {filename}"
   ```

2. **Check if backend has the new code**:
   ```bash
   grep -n "process_analysis_job" backend_script.py
   # Should find the function definition
   ```

3. **Check app logs** - What response is it getting?
   ```javascript
   // Look for:
   "✅ [UPLOAD] Upload successful via fetch API (job enqueued)"
   // Should show job_id in response
   ```

4. **Verify timeout is 3 minutes** (not 10):
   ```javascript
   // In src/services/api.ts line ~453:
   const timeoutId = setTimeout(() => controller.abort(), 180000); // Should be 180000 (3 min)
   ```

### Common Issues

#### Issue: "Upload timed out" when switching apps
**Cause**: OS cancels fetch request when app backgrounds  
**Solution**: This is expected behavior. The file might still upload. Check:
- Backend logs to see if file was received
- If job was created, you can poll for it later
- Push notification will arrive when analysis completes

#### Issue: No push notifications
**Check**:
1. App requested notification permissions? (Check on first launch)
2. Push token stored? (Check AsyncStorage)
3. Backend has internet access? (Needs to call Expo Push API)
4. Backend logs show push token received?

#### Issue: Backend still processing synchronously
**Check**:
1. Did you restart the backend server?
2. Check backend logs - should see "Enqueued analysis" immediately
3. Verify `process_analysis_job` function exists in `backend_script.py`

## Expected Flow

### Successful Upload (App Active)
1. User uploads video
2. App sends `POST /api/upload` with video + form data
3. Backend saves file → returns `{job_id, status: "queued"}` **immediately** (< 1 second)
4. App receives `job_id` → starts polling `GET /api/results/job/{job_id}`
5. Backend processes analysis in background thread
6. When done, backend updates job status → sends push notification
7. App polls → gets `status: "completed"` → navigates to Results

### Successful Upload (App Backgrounded)
1. User uploads video
2. App sends `POST /api/upload`
3. **User switches apps** → OS may cancel fetch request
4. **BUT**: If file was uploaded, backend already created job
5. Backend continues analysis in background
6. When done → sends push notification
7. User taps notification → app opens → fetches results → shows Results

## Testing Checklist

- [ ] Backend server restarted with new code
- [ ] `expo-notifications` installed
- [ ] App requests notification permissions on first launch
- [ ] Upload returns `job_id` immediately (check logs)
- [ ] Can poll for job status: `GET /api/results/job/{job_id}`
- [ ] Push notification arrives when analysis completes
- [ ] Tapping notification opens Results screen
- [ ] Polling stops when app backgrounds (expected)
- [ ] Polling resumes when app becomes active

## Next Steps (Production)

For production reliability, consider:
1. **Task Queue**: Use Celery/RQ + Redis instead of threads
2. **Job Recovery**: If app crashes, recover jobs from AsyncStorage
3. **Better Error Handling**: Handle partial uploads, network interruptions
4. **Job History**: Show user their pending/completed jobs


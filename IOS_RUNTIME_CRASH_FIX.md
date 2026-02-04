# iOS Runtime Crash Fixes

## Issues Identified

The app was crashing at runtime (after installation) due to unhandled errors in several areas:

1. **No Error Boundaries** - React errors were crashing the entire app
2. **Unhandled Async Errors** - AuthContext initialization could fail silently
3. **Missing Error Handling** - API service initialization had no fallbacks
4. **Context Hook Errors** - Splash screen could crash if AuthContext failed

## Fixes Applied

### 1. **Added ErrorBoundary Component** ✅
**File**: `src/components/ErrorBoundary.tsx` (new)

- Catches React component errors and displays a user-friendly error screen
- Shows error details in development mode
- Provides "Try Again" button to reset error state
- Prevents app from completely crashing

**Integration**: Wrapped the entire app in `app/_layout.tsx`

### 2. **Enhanced AuthContext Error Handling** ✅
**File**: `src/context/AuthContext.tsx`

**Changes**:
- Added try-catch around all async operations
- Added timeout protection for token verification (5 seconds)
- Made auth initialization non-blocking (doesn't await)
- Added fallback error handling that doesn't crash the app
- All errors are logged but don't prevent app from loading

**Key improvements**:
```typescript
// Before: Could crash if API call failed
const verification = await apiService.verifyToken();

// After: Handles errors gracefully
const verification = await Promise.race([
  apiService.verifyToken(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]).catch(() => ({ success: false }));
```

### 3. **API Service Error Handling** ✅
**File**: `src/services/api.ts`

**Changes**:
- Added try-catch in `determineBaseURL()` method
- Added fallback URL if config fails to load
- Prevents crashes if config.js has issues

**Fallback behavior**:
- If config fails, uses default URL: `http://165.232.184.91`
- Logs warning but continues execution

### 4. **Splash Screen Error Handling** ✅
**File**: `app/splash.tsx`

**Changes**:
- Wrapped `useAuth()` hook in try-catch
- Provides fallback auth state if context fails
- App continues to load even if auth context has issues

### 5. **Root Layout Error Boundary** ✅
**File**: `app/_layout.tsx`

**Changes**:
- Wrapped entire app in ErrorBoundary
- Catches any unhandled React errors
- Prevents complete app crash

## Testing the Fixes

1. **Rebuild the app**:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   ```

2. **Check for crashes**:
   - App should now show error screen instead of crashing
   - Check console logs for specific error messages
   - ErrorBoundary will catch and display errors

3. **Test error scenarios**:
   - Disconnect from network (should show error, not crash)
   - Invalid API URL (should use fallback)
   - Auth context failure (should continue to landing screen)

## What to Look For

If the app still crashes, check:

1. **Xcode Console Logs**:
   - Look for specific error messages
   - Check for native module errors
   - Verify all dependencies are installed

2. **Metro Bundler Logs**:
   - Check for JavaScript errors
   - Look for missing module errors
   - Verify all imports are correct

3. **Device Logs** (if on physical device):
   ```bash
   # Connect device and check logs
   xcrun simctl spawn booted log stream --predicate 'processImagePath contains "CrickCoach"'
   ```

## Common iOS Crash Causes (Already Fixed)

✅ Missing bundleIdentifier - **FIXED**
✅ Missing deployment target - **FIXED**  
✅ Jetify running on iOS - **FIXED**
✅ Missing notification permissions - **FIXED**
✅ Unhandled async errors - **FIXED**
✅ No error boundaries - **FIXED**

## Next Steps if Still Crashing

1. **Check Xcode logs** for native errors
2. **Verify all native modules** are properly linked
3. **Check for missing assets** (images, fonts)
4. **Verify React Native version compatibility**
5. **Check for iOS-specific code issues**

The app should now be much more resilient to errors and won't crash completely. Instead, it will show error screens that allow users to continue or retry.


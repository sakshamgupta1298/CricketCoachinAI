## Why “background analysis” doesn’t run reliably

On iOS and Android, when a user switches away from the app, the OS typically moves the app to the **background** and will **pause/suspend the JavaScript runtime** for React Native/Expo apps.

That means:

- **Timers stop**: `setInterval` / `setTimeout` polling won’t run reliably in the background.
- **In-flight network requests can be paused or cancelled** (especially long uploads).
- Any “background work” implemented purely in JS is **best-effort** and often stops until the app is active again.

## What to do instead (reliable approaches)

- **Do analysis on the server** (preferred): upload the video, return a `job_id` immediately, and process asynchronously on the backend.
- **Status on resume**: when the app becomes active, poll `GET /results/{job_id}` until ready.
- **Notify the user**: use push notifications when the backend finishes processing, then open the results screen.
- **True background execution** requires platform-specific solutions:
  - Android foreground service (native module)
  - iOS background modes are limited and tightly controlled
  - Expo background fetch/task APIs are periodic and not suitable for continuous long polling



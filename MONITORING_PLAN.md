# CrickCoach — Logging & Monitoring Plan

**Goal:** When something breaks in production, the team gets notified automatically (by email),
with enough context to diagnose it. Capture every error, watch server health, and have an
independent watchdog that catches the case where the whole server is down.

**Chosen approach (locked in):**
- **Error capture:** Sentry (hosted, free tier) + a global Flask error handler.
- **Alert channel:** Email, reusing the existing `send_email_via_smtp2go()` helper.
- **Uptime:** Real health-check endpoints + an external monitor (Healthchecks.io / UptimeRobot).
- **Scope:** Phase 1 (error capture & alerts) + Phase 2 (health & uptime). Resource/OOM
  watchdog, job heartbeats, log rotation, dashboards = explicitly deferred (listed at the end).

---

## 1. Current State — What Is Already Being Done

| Area | Status | Location |
|------|--------|----------|
| File + console logging | ✅ Present — daily file, INFO level, `asctime/name/level/message` format | `backend_script.py:55-77` |
| Logger used widely | ✅ 423 log/print calls, 123 `except` blocks (many with `exc_info=True`) | throughout |
| Process auto-restart | ✅ systemd `Restart=always`, `RestartSec=10`, logs to journal | `crickcoach-backend.service` |
| Basic health endpoint | ⚠️ Exists but **static string only** — no real liveness check | `backend_script.py:4014` |
| Background job error handling | ⚠️ Job marked `failed` + Expo push to user, but **no operator alert** | `backend_script.py:883-901` |
| User-facing push notifications | ✅ Expo push on job done/failed (this is for the end user, not ops) | `send_expo_push`, `backend_script.py:875` |
| Email infrastructure | ✅ `send_email_via_smtp2go()` ready to reuse for alerts | `backend_script.py:5452` |

### What is MISSING (why nothing alerts you today)
- ❌ **No error alerting** — no Sentry/Slack/email-on-error. Errors only reach a log file nobody watches.
- ❌ **No external uptime check** — if the process crash-loops or the box is down, nobody is told.
- ❌ **`/api/health` is fake** — returns "healthy" even if the DB is corrupt or disk is full.
- ❌ **No dependency health** — Gemini / Razorpay / SMTP2GO / S3 / SQLite failures are invisible until a user hits them.
- ❌ **No log rotation** — daily log files grow unbounded (deferred, but noted).
- ❌ **Inconsistent logging** — mix of `print()` and `logger`; no request/job correlation ID.

### Architecture recap (context for the plan)
- Single Flask app `backend_script.py` (~6,000 lines, 35+ routes), run as `python3 backend_script.py` via systemd.
- Heavy ML analysis (torch + tensorflow + YOLOv8 + Gemini) runs **async in `threading.Thread`** (`process_analysis_job`, `backend_script.py:734`). Code already notes OOM kills on low-RAM servers.
- External deps: Gemini, Razorpay, SMTP2GO, AWS S3 (boto3), Google/Apple sign-in, SQLite DB.
- Config via `.env` (already holds `GEMINI_API_KEY`, `RAZORPAY_*`, `AWS_*`, etc.).

---

## 2. What We Need To Do

### PHASE 1 — Error Capture & Email Alerts

#### 1.1 Add Sentry
- **Dependency:** add `sentry-sdk[flask]` to `requirements.txt`.
- **Init:** at the top of `backend_script.py`, immediately after `load_dotenv()` (`~line 81`):
  ```python
  import sentry_sdk
  from sentry_sdk.integrations.flask import FlaskIntegration
  from sentry_sdk.integrations.threading import ThreadingIntegration

  SENTRY_DSN = os.getenv("SENTRY_DSN")
  if SENTRY_DSN:
      sentry_sdk.init(
          dsn=SENTRY_DSN,
          integrations=[FlaskIntegration(), ThreadingIntegration()],
          environment=os.getenv("APP_ENV", "production"),
          traces_sample_rate=0.0,          # errors only, no perf overhead
          send_default_pii=False,
      )
  ```
- **Why ThreadingIntegration:** the ML pipeline runs in background threads — this ensures
  exceptions there are captured too, not just in HTTP routes.
- **Result:** every unhandled exception is captured with traceback + request context.
  Configure Sentry's dashboard alert rule to email on new/regressed issues.

#### 1.2 Global Flask error handler
- Add near the route definitions:
  ```python
  @app.errorhandler(Exception)
  def handle_uncaught(e):
      logger.error(f"Unhandled exception: {e}", exc_info=True)
      sentry_sdk.capture_exception(e)        # redundant-safe; explicit
      return jsonify({"success": False, "error": "Internal server error"}), 500
  ```
- **Why:** guarantees nothing leaks a raw stack trace to the mobile client, and every
  uncaught error is logged + reported uniformly.

#### 1.3 Email alert helper (`send_alert`)
- New function, placed after `send_email_via_smtp2go` (`~line 5490`):
  ```python
  ALERT_EMAIL = os.getenv("ALERT_EMAIL")          # ops inbox
  _alert_last_sent = {}                            # dedup cache
  ALERT_THROTTLE_SECONDS = 600                     # max 1 of same alert / 10 min

  def send_alert(severity, subject, message):
      """Email an operational alert. Throttled to avoid inbox floods."""
      if not ALERT_EMAIL:
          return
      key = f"{severity}:{subject}"
      now = time.time()
      if now - _alert_last_sent.get(key, 0) < ALERT_THROTTLE_SECONDS:
          return
      _alert_last_sent[key] = now
      try:
          send_email_via_smtp2go(
              ALERT_EMAIL,
              f"[CrickCoach {severity.upper()}] {subject}",
              f"<pre>{message}</pre>",
              text_body=message,
          )
      except Exception as e:
          logger.error(f"Failed to send alert email: {e}", exc_info=True)
  ```
- **Key features:** in-memory throttle/dedup so a repeating failure doesn't spam you;
  fully reuses existing SMTP2GO setup; no-ops safely if `ALERT_EMAIL` unset.

#### 1.4 Wire `send_alert` into critical paths
| Where | File:line | Alert |
|-------|-----------|-------|
| Background job failure (outer `except`) | `backend_script.py:883` | `send_alert("error", f"Analysis job {job_id} failed", traceback)` |
| Payment verify failure | `backend_script.py:4148` | `send_alert("critical", "Razorpay verify failed", str(e))` |
| DB connection failure | `get_db_connection` callers | alert on `sqlite3.Error` |
| Dependency down (from Phase 2.2) | health checks | alert when Gemini/SMTP/S3 unreachable |

> Note: Sentry already captures these tracebacks. `send_alert` is for the *high-signal*
> events you want pushed to your inbox immediately (money, jobs, infra), separate from the
> full error firehose in Sentry.

---

### PHASE 2 — Health Checks & External Uptime Watchdog

#### 2.1 Upgrade `/api/health` (real liveness)
- Replace the static response at `backend_script.py:4014` with genuine checks:
  ```python
  @app.route('/api/health', methods=['GET'])
  def api_health():
      checks, healthy = {}, True
      # DB
      try:
          conn = get_db_connection(); conn.execute("SELECT 1"); conn.close()
          checks["database"] = "ok"
      except Exception as e:
          checks["database"] = f"fail: {e}"; healthy = False
      # Disk
      try:
          total, used, free = shutil.disk_usage(UPLOAD_FOLDER)
          pct_free = free / total * 100
          checks["disk_free_pct"] = round(pct_free, 1)
          if pct_free < 10: healthy = False
      except Exception as e:
          checks["disk"] = f"fail: {e}"; healthy = False
      status = 200 if healthy else 503
      return jsonify({"status": "healthy" if healthy else "degraded", "checks": checks}), status
  ```
- **Why:** the external monitor (2.3) can now detect a *degraded* server (DB broken, disk
  full) even while the process is technically up.

#### 2.2 Add `/api/health/full` (deep dependency probe)
- New endpoint that checks reachability of **Gemini, SMTP2GO, S3, Razorpay**.
- **Cached ~60s** (module-level timestamp) so frequent polling can't hammer paid APIs.
- On a dependency transitioning to down → `send_alert("error", "<dep> unreachable", detail)`.
- Returns per-dependency status JSON; intended for manual/ops use, not the 1-min monitor.

#### 2.3 External uptime monitor (independent watchdog)
- Sign up for **Healthchecks.io** or **UptimeRobot** (both free).
- Configure an HTTP monitor: `GET https://<your-domain>/api/health` every 1–5 min,
  expecting `200`. Alert (email) when it returns non-200 or times out.
- **Why this is essential:** Sentry and `send_alert` both run *inside* the app — if the
  server crashes, OOM-reboots, or the network drops, they can't fire. An external pinger is
  the only thing that catches "the whole thing is down."
- This step is dashboard configuration (no code); exact steps will be documented on delivery.

---

## 3. Configuration / What You Need To Provide

All via `.env` (no secrets hardcoded):

| Var | Purpose | Where to get it |
|-----|---------|-----------------|
| `SENTRY_DSN` | Sentry project key | Create free project at sentry.io → Settings → Client Keys (DSN) |
| `ALERT_EMAIL` | Inbox that receives ops alerts | Your/team email |
| `APP_ENV` | `production` / `staging` tag in Sentry | (optional, defaults to production) |
| Healthchecks.io / UptimeRobot account | External uptime ping | Free signup, browser setup |

---

## 4. Implementation Order & Effort

1. **1.1 Sentry init** — ~15 min, biggest single win.
2. **1.3 `send_alert` helper** — ~15 min.
3. **1.2 Global error handler** — ~10 min.
4. **1.4 Wire alerts into job/payment/DB** — ~30 min.
5. **2.1 Real `/api/health`** — ~20 min.
6. **2.2 `/api/health/full`** — ~40 min.
7. **2.3 External monitor** — ~15 min, dashboard only.

**Total code work: ~2.5 hours.** No new infrastructure to host; Sentry + Healthchecks are SaaS free tiers.

### Verification
- Trigger a deliberate exception in a test route → confirm it appears in Sentry + an alert email arrives.
- Stop the DB file / fill disk in staging → confirm `/api/health` returns 503 and the external monitor emails.
- Force a job failure → confirm the operator alert email fires (separate from the user's Expo push).

---

## 5. Explicitly Deferred (Not In This Phase)

These are valuable but out of the agreed scope — can be added later:
- **psutil RAM/CPU/disk watchdog** for the known OOM risk (would alert *before* the kernel kills the process).
- **systemd `OnFailure`** alert on crash/restart loop.
- **Background job heartbeat + timeout sweeper** ("stuck on processing forever" detection).
- **Request/job correlation IDs** for end-to-end tracing.
- **Log rotation** (`TimedRotatingFileHandler`) + routing stray `print()` through `logger`.
- **Prometheus `/metrics` + Grafana** dashboards for trends.

## 6. Unrelated but Worth Flagging (security)
Hardcoded secrets currently in the file (now in git history) — move to `.env` soon:
- Razorpay keys — `backend_script.py:4030`
- SMTP password — `backend_script.py:98`
- JWT secret — `backend_script.py:87`

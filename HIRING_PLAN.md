# CricketCoach AI — Hiring Plan

**Goal:** Ship new features fast, with a small team that can own the product long-term.

---

## The main blocker

The product was built for one person, not a team. Three things will slow any new hire:

1. The backend is one ~6,000-line file with 35+ routes — developers will step on each other.
2. There are no automated tests — every change has to be checked by hand, which is slow.
3. Production breaks silently — no real health check and no error alerts.

You don't have to fix all of this before hiring, but the first hire should be someone who can fix it while shipping.

---

## Roles to hire (in priority order)

### 1. Senior Backend / Full-Stack Engineer — HIRE FIRST
- Break the big backend file into clean, modular services (auth, payments, analysis, notifications).
- Add automated tests and proper monitoring / error alerting.
- Own the API so new features can be built safely and in parallel.
- **Why first:** this person unblocks everyone else and is the biggest lever on speed.

### 2. React Native / Mobile Engineer — HIRE SECOND (1–2 months later)
- Owns the mobile app: new screens, Android + iOS releases, bug fixes.
- Lets the app and backend move forward at the same time.

### 3. R&D / Applied Researcher — HIRE TO DECIDE *WHAT* TO IMPROVE
- Researches the existing features (ball-speed, bat-ball contact, pose feedback) and finds the highest-value improvements.
- Hybrid: half **AI/CV accuracy** (benchmark and prototype better analysis) and half **product** (study competitors, talk to coaches, write specs and a roadmap).
- **Can start part-time / contract.** For a small team, this can be the **same person** as the ML/CV engineer below — split into two roles only as you grow.

### 4. ML / Computer-Vision Engineer — HIRE WHEN FEATURES NEED BETTER ANALYSIS
- Owns ball-speed, bat-ball contact, and pose accuracy.
- Productionizes what R&D proves out. Specialist work — defer it unless your new features depend on analysis quality.

### 5. DevOps / QA — PART-TIME, LATER
- Monitoring, deployments, server crashes, scaling.
- Can start as a part-time contractor.

---

## Folder → who owns it → what post

Use this to see, for each part of the repo, which role is responsible.

| Area (folder / files) | What it does | Role / post that owns it |
|---|---|---|
| `app/`, `src/screens/`, `components/` | Mobile UI & ~25 screens | React Native / Mobile Engineer |
| `src/services/` (api, google/apple sign-in, upload) | Auth + API client + video uploads | Mobile Engineer (+ Backend for the API side) |
| `backend_script.py`, `requirements.txt` | Flask API, 34 routes, async jobs | Senior Backend / Full-Stack Engineer |
| Razorpay / SMTP2GO / entitlements routes | Payments, email, access control | Backend Engineer |
| `src/ballspeed/`, `bat-ball-contact.py`, `yolov8n*`, calibration `.npy` | Ball speed, bat-ball contact, detection | ML / Computer-Vision Engineer |
| Gemini API + pose → coaching feedback | Analysis quality & prompts | R&D / Applied Researcher (with ML/CV) |
| `*.sh`, `nginx_config.conf`, `crickcoach-backend.service`, DigitalOcean | Deploy, monitoring, uptime | DevOps / QA (part-time) |
| `web-frontend/` | Small web app | Mobile / Frontend Engineer (low priority) |
| Roadmap, competitor & feature research | Deciding what to build next & why | R&D / Applied Researcher |

---

## Hire type

Start with **1–2 long-term engineers** (full-time or ongoing contract) — **not an agency**. This is a living product with paying users that needs ongoing ownership, not a one-off build. Don't hire 4 people at once: until the backend is cleaned up, a big team creates more chaos than speed.

**First move:** Hire one senior backend engineer now. Add a mobile engineer once the backend is modular and tested.

**Suggested order:** 1) Backend Engineer (unblocks everyone) → 2) Mobile Engineer → 3) R&D / ML (start as one hybrid, part-time person; split into a dedicated ML/CV engineer once your features clearly depend on analysis quality) → 4) DevOps / QA part-time.

---
---

# Job Description 1 — Senior Backend / Full-Stack Engineer

**Company:** CricketCoach AI — an AI-powered cricket coaching app that analyzes player videos (batting, bowling, wicket-keeping) and gives biomechanical feedback. Live on Android & iOS with paying users.

**Role:** Senior Backend Engineer (Python / Flask)

### What you'll do
- Own and improve our Flask backend (REST API, 35+ endpoints) that powers the mobile app.
- Refactor a large existing codebase into clean, modular, testable services (auth, payments, video-analysis jobs, notifications).
- Add an automated test suite and CI so we can ship features safely and fast.
- Build real health checks, error alerting, and monitoring (Sentry + email alerts).
- Work with async background jobs that run heavy ML video analysis.
- Integrate and maintain third-party services: Razorpay (payments), AWS S3, SMTP2GO (email), Google/Apple sign-in, Gemini API.

### Must have
- 4+ years backend experience with Python (Flask, FastAPI, or Django).
- Strong REST API design and SQL database skills.
- Experience writing tests (pytest) and refactoring legacy / monolithic code.
- Comfortable with Linux servers, deployments, and basic DevOps (systemd, nginx, DigitalOcean/AWS).
- Experience integrating payment gateways and third-party APIs.

### Nice to have
- Worked with async / background job processing.
- Exposure to ML pipelines (PyTorch / TensorFlow) — you won't build models, but you'll run them.
- React Native / mobile API experience.

**Engagement:** Full-time or long-term contract • Remote

**How to apply:** Send your CV + GitHub/portfolio. Shortlisted candidates get a short paid task: propose how you'd split a large single-file Flask app into modules and add tests incrementally (no full rewrite).

---
---

# Job Description 2 — React Native Mobile Engineer

**Company:** CricketCoach AI — AI cricket coaching app, live on Android & iOS with paying users.

**Role:** React Native / Mobile Engineer (Expo)

### What you'll do
- Own our React Native + Expo app (~20 screens: login/OTP, video upload & recording, results, comparison, ball-speed, training plans, payments).
- Build new features and screens end-to-end against our REST API.
- Manage Android & iOS builds and store releases (Google Play + App Store, via EAS).
- Handle video capture/upload, push notifications (Expo), and in-app payments (Razorpay).
- Fix bugs, improve performance, and polish the UI (React Native Paper / Material Design 3).

### Must have
- 3+ years building production React Native apps (Expo experience strongly preferred).
- Shipped apps to both the Google Play Store and Apple App Store.
- Solid TypeScript, React Navigation, and REST API integration.
- Experience with native build tooling (EAS / Xcode / Android Studio) and store submission.
- Comfortable with auth flows (Google/Apple sign-in), file/video upload, and push notifications.

### Nice to have
- Experience with camera / video-heavy apps.
- Razorpay or other in-app payment integration.
- Basic backend / API debugging skills.

**Engagement:** Full-time or long-term contract • Remote

**How to apply:** Send your CV + links to apps you've shipped (with store links). Shortlisted candidates get a short paid task: run our Expo app locally and add a small new screen wired to an API endpoint.

---

**Tip:** Post the Backend role first — hiring mobile before the backend is cleaned up means the mobile dev gets blocked on a messy API.

---
---

# Job Description 3 — R&D / Applied Researcher (Cricket AI)

**Company:** CricketCoach AI — an AI cricket coaching app, live on Android & iOS with paying users. We analyze player videos and give biomechanical feedback on batting, bowling, and wicket-keeping.

**Role:** R&D / Applied Researcher (AI / Computer Vision + Product) — part-time or contract to start

### What you'll do
- **Audit our existing features** — ball-speed, bat-ball contact, and pose/biomechanics feedback — and measure how accurate they actually are against real ground-truth footage.
- Research and **prototype improvements**: better detection/pose models, camera calibration, and the prompts we send to the Gemini/LLM that turns pose data into coaching feedback.
- Hand proven prototypes to the ML/CV engineer to productionize — you find what works, they ship it.
- **Study the product and competitors:** talk to coaches and players, find the highest-value features and improvements, and write clear specs and a prioritized roadmap.
- Keep us current — read relevant sports-tech / computer-vision research and translate it into practical ideas.

### Must have
- Background in **ML / computer vision** (PyTorch, OpenCV, pose estimation, object detection).
- Comfortable reading research papers and turning them into working prototypes.
- Strong analytical and **writing** skills — you'll produce benchmarks, specs, and roadmaps people act on.
- Genuine interest in sports tech / video analysis.

### Nice to have
- Cricket or biomechanics domain knowledge.
- Fast Python prototyping (Jupyter, NumPy).
- Prompt engineering with LLMs (Gemini / Claude / GPT).
- Experience defining product roadmaps with founders.

**Engagement:** Part-time / contract to start, with a path to full-time • Remote

**How to apply:** Send your CV + any research, projects, or write-ups you're proud of. Shortlisted candidates get a short paid task: measure our current ball-speed accuracy on a few sample videos and write a 1-page proposal on how you'd improve it.

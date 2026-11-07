# Back Rehab

Android app for following my back rehabilitation plan from Aktiv Fysioterapi Nittedal
("Opptrening rygg", 05.11.2026), translated to English.

## Install
1. On the phone, open **Releases** for this repo and download the latest `BackRehab-x.y.z.apk`.
2. Open the file and allow installing from your browser when Android asks.
3. Open **Back Rehab** from the app drawer.

## Updates
The app checks this repo's latest GitHub Release every time it opens. When there's a newer
version it shows **Update now** – tap it, then *Update* in Android's dialog. (The first time,
Android asks you to allow "Install unknown apps" for Back Rehab.)

## Making a release
1. Change the code.
2. Bump `VERSION` (e.g. `1.0.0` → `1.0.1`) and add a `## [1.0.1]` section to `CHANGELOG.md`.
3. Push to `main`. GitHub Actions builds the APK and publishes Release `v1.0.1`.

## Features
- All 16 exercises with step-by-step instructions
- Tap-to-count reps, countdown timers, hold/relax timer, rest timer (+15 s / skip)
- Left/right sides with voice cue "Switch to right leg"
- Beeps, vibration, spoken cues, keeps the screen on during workouts
- Every-other-day schedule with walk logging on rest days
- History with back-pain rating (0–10) and notes
- Edit sets/reps/timers/weights per exercise, or turn exercises off
- Data stays on the phone; backup export (to Downloads) and import

## Project layout
- `web/` – the app's screens (HTML/CSS/JS), bundled into the APK
  - `web/js/exercises.js` – the plan itself
- `app/` – the Android wrapper (WebView, voice, vibration, updater)
- `VERSION`, `CHANGELOG.md` – release version and notes
- `signing/` – the key every release is signed with (must stay the same so updates install)

Preview the screens in a browser: `cd web && python3 -m http.server 8000`.

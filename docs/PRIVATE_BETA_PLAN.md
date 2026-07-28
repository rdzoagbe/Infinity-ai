# Infinity AI — Private Beta Upgrade Plan

Status: pre-implementation analysis. This document is the audit and plan that governs the
phased upgrade from demo-ware to a secure private-beta product. It is updated as phases land.

---

## 1. Current architecture summary

**Frontend** — React 18 + Vite, deployed to GitHub Pages under `/Infinity-ai/`.
5,487 lines across 11 files. No router: navigation is a global capture-phase click
interceptor in `App.jsx` that string-matches button text (`routeForLabel`) plus
`useState` view switching inside `InfinityBase.jsx` and four custom window events
(`infinity:open-studio`, `infinity:close-studio`, `infinity:project-file`,
`infinity:project-sound`). `App.jsx` also monkey-patches `window.fetch` to sniff
analysis responses, and contains a JSX syntax error (duplicated `return` block,
lines ~195–306) that ships broken markup into the bundle.

Two parallel studio experiences exist:

- `InfinityBase.jsx` (1,143 lines) — the polished shell: dashboard, projects, six-stage
  studio, Sound Lab, masters, library, docs, settings. **Entirely hard-coded mock data;
  zero API calls.**
- `AudioMVPV2.jsx` (1,626 lines) — a full-screen modal; the only functionally real
  component. Real upload → analyse → clean → shape → master → stems against the FastAPI
  backend, with job polling (`pollUntilComplete`), session persistence, loudness-matched
  A/B via Web Audio, and real download links.

Auth — `AuthDashboardV122.jsx` gates on a localStorage profile
(`infinity_private_session_v3`) with three modes: passwordless local, one-click demo,
and Supabase email/password (`supabase-cloud`). Supabase table `projects` + private
storage bucket `infinity-audio` exist with correct RLS (`supabase/schema.sql`), but the
storage helpers are never called — audio only ever goes to the FastAPI backend.

**Backend** — FastAPI on Railway (Docker, ffmpeg installed). ~2,400 lines.
24 endpoints, **none authenticated**. State is four in-memory dicts
(`JOBS`, `PROJECTS`, `FILES`, `SOUND_ASSETS`) with a partial `_store.json` sidecar;
jobs and sound assets are never persisted, so every redeploy 404s all in-flight polls.
Real DSP exists and is worth preserving: LUFS/true-peak/LRA via `loudnorm`, dynamics via
`astats`, 7-band spectral balance, ffmpeg mastering/mix/clean chains, optional Demucs
stems. Fake DSP also exists: BPM/key/genre are **hashed from the filename**
(`estimate_music_traits`), `/api/v1/audio/mix` is a stub returning a text plan, and
"sound generation" is a deterministic sine-pad synthesizer.

**CI/CD** — required PR check `build` runs only `vite build` (no tests/lint/typecheck).
Pages deploy is a separate main-only workflow. No SPA 404 fallback → deep links 404.
A competing `render.yaml` deploy target has no ffmpeg and wipes storage on restart.

---

## 2. Mocked vs functional inventory

### Functional (preserve)

| Capability | Where |
|---|---|
| Upload with streaming size limit (250 MB) | `main.py:96` |
| LUFS / true peak / LRA measurement | `audio.py:73` |
| RMS / crest / noise floor / DR | `audio.py:98` |
| 7-band spectral balance | `audio.py:138` |
| Problem/decision generation from real measurements | `audio.py:186` |
| Vocal clean chain (10-stage ffmpeg) | `audio.py:405` |
| Full-mix clean + enhance chains | `audio.py:499`, `:549` |
| Vocal+beat mix (`filter_complex`, amix, bus comp, limiter) | `audio.py:606` |
| Mastering chain (adaptive EQ, genre EQ, loudnorm, limiter) + re-measure | `audio.py:914` |
| Demucs stem separation (when installed) | `audio.py:1135` |
| Job polling contract (`/api/v1/jobs/{id}`) | `main.py:767`, `infinityBackend.js:175` |
| Loudness-matched A/B player (Web Audio GainNode) | `AudioMVPV2.jsx:222` |
| Real waveform/spectrum render from decoded audio | `AudioMVPV2.jsx:109`, `:151` |
| Supabase auth + `projects` RLS schema | `supabaseClient.js`, `supabase/schema.sql` |

### Mocked / fake (replace or label)

| Item | Where | Disposition |
|---|---|---|
| Dashboard: readiness 92 %, LUFS −10.4, 7 projects, 24 masters, 18.6 GB | `InfinityBase.jsx:143-166` | Compute from real records; empty state |
| Fake projects ("Midnight Prayer" ×6, files/version counts) | `:174-233` | Demo mode only, labelled |
| Studio analyse stage: BPM 104, F# min, fake issues with fake confidence | `:381-396` | Real analysis or "Unavailable" |
| Fake mix tracks, macro dials, plugin modules, master targets | `:418-486` | Wire to real parameters (Phase 3) |
| Fake A/B numbers and player | `:506-517`, `:1129` | Real A/B (Phase 4) |
| Sound Lab fake generation (toast + 900 ms spinner) | `:575-629` | Real endpoint, honest label |
| Masters/Library fake counts and filenames | `:643-677` | Real records; empty states |
| Fake identity "Roland Studio / Creator plan / 62 % usage" | `:1055-1083` | Real profile |
| Docs claims (30 GB plan, 90-day retention, wrong endpoints) | `:781-894` | Audit in Phase 5 |
| Backend BPM/key/genre from filename hash | `audio.py:263` | Return `null` + "unavailable" until real detection |
| `/api/v1/audio/mix` text-plan stub | `main.py:135` | Remove or implement |
| ffmpeg "stem separation" = mid/side trick | `audio.py:1094` | Label honestly; warn user |
| Sound "generation" sine-pad synth | `audio.py:1047` | Label "Experimental synthesised sound generator" |
| `readinessScore` starting at literal 92 | `App.jsx:28` | Replace with technical release check |
| Bug: `JobType.transform_style` missing → 500 | `main.py:535` / `models.py:13` | Fix |
| Bug: duplicated JSX return block | `App.jsx:195-306` | Fix (removed in router rewrite) |

---

## 3. Database migration plan (Supabase PostgreSQL)

Existing: `public.projects` (with RLS) and bucket `infinity-audio`. Migrations are
plain SQL files under `supabase/migrations/`, applied in order via the SQL editor or CLI.

**Migration 001 — core workflow tables** (Phase 2):

- `project_files` — id, user_id, project_id FK, kind (`vocal`/`beat`/`full_mix`/`reference`),
  original_name, storage_path, backend_file_id, mime, size_bytes, duration_s, sample_rate,
  channels, status, created_at, updated_at
- `audio_versions` — id, user_id, project_id, parent_version_id (self-FK for
  Original → Cleaned → Mixed → Mastered lineage), kind, label, backend_file_id,
  storage_path, parameters jsonb, status, is_final bool, notes, created_at, updated_at
- `analysis_results` — id, user_id, project_id, version_id FK, measurements jsonb,
  problems jsonb, engine_version, created_at
- `processing_jobs` — id (job_id), user_id, project_id, input_file_id, output_version_id,
  job_type, status, progress, message, error, parameters jsonb, created_at, started_at,
  completed_at
- `processing_decisions` — id, user_id, project_id, analysis_id FK, problem_key,
  action (`accepted`/`ignored`), parameters jsonb, created_at

**Migration 002 — assets & prefs** (Phase 3–5): `stems`, `masters`, `exports`,
`generated_sounds`, `user_preferences`, `artist_profiles`.

**Migration 003 — ops** (Phase 6): `usage_records`, `audit_events`.

All tables: RLS enabled, `auth.uid() = user_id` policies for select/insert/update/delete;
`updated_at` trigger reused from schema.sql. Backend connects with the **service-role key**
(bypasses RLS) and enforces ownership in code from the verified JWT `sub`.

---

## 4. Security plan

1. **JWT verification in FastAPI** — `Authorization: Bearer <supabase access token>`;
   verify signature against the project JWT secret (HS256) or JWKS (RS256), check
   `exp`/`aud`; dependency `current_user()` yields `user_id`. 401 on missing/invalid.
2. **Ownership enforcement** — every file/project/job/version row carries `user_id`;
   `get_owned_file(file_id, user)` replaces `get_file_or_404`. Cross-user access → 404
   (not 403, to avoid ID oracle). Applied to all 24 endpoints; `GET /api/v1/projects`
   returns only the caller's rows.
3. **Storage** — metadata in Postgres, audio in Supabase Storage
   (`{user_id}/{project_id}/...` paths matching existing bucket policy); downloads via
   short-lived signed URLs. Interim: local disk stays but paths are namespaced per user
   and download routes require ownership.
4. **Upload hardening** — extension + MIME allowlist, magic-byte sniff, size limit with
   partial-file cleanup on 413, ZIP: reject by default in beta (no extraction path is
   needed by the core workflow).
5. **Limits** — per-user storage quota, concurrent-job cap, simple rate limiting
   (slowapi), request-size caps.
6. **Hygiene** — expired-file cleanup task, account-data deletion endpoint, audit_events
   on auth/upload/delete/export, no user content in logs, error messages sanitised in
   production (raw exception text currently leaks to clients).
7. **Frontend** — remove fetch monkey-patching; attach the Supabase access token to every
   backend call; never trust client-computed metrics.

---

## 5. File-by-file implementation plan

### Phase 1 (frontend honesty + routing + unification)

| File | Action |
|---|---|
| `package.json` | add `react-router-dom` |
| `public/404.html` (new) | GitHub Pages SPA redirect |
| `index.html` | path-restore script |
| `src/main.jsx` | mount `BrowserRouter basename="/Infinity-ai"` |
| `src/App.jsx` | **rewrite**: route table only; delete click interceptor, `clickNav`, fetch monkey-patch, broken duplicated JSX |
| `src/auth/SessionContext.jsx` (new) | profile/login/logout/cloudMode extracted from `AuthDashboardV122` |
| `src/data/projectsStore.js` (new) | real project source (localStorage or Supabase) + `dataMode`: `empty` / `demo` (labelled) / `real` |
| `src/layouts/PublicLayout.jsx`, `AppLayout.jsx` (new) | marketing vs authenticated shells; sidebar from `InfinityBase` |
| `src/pages/*.jsx` (new) | `Landing`, `Login`, `Docs`, `Dashboard`, `Projects`, `ProjectWorkspace`, `Sounds`, `Library`, `Masters`, `Settings` — split from `InfinityBase.jsx` with mocks removed and empty states added |
| `src/pages/ProjectWorkspace.jsx` | AudioMVP logic embedded as the permanent studio (stages: Import / Analyse / Mix / Master / Compare / Export), no modal |
| `src/EliteAnalysisPanel.jsx`, `EnhancedEliteAnalysisPanel.jsx`, `studio-redesign.css` | delete (dead) |
| `src/InfinityBase.jsx`, `AuthDashboardV122.jsx` | dissolve into the above; delete when empty |

### Phase 2 (backend security + persistence)

| File | Action |
|---|---|
| `backend/app/auth.py` (new) | JWT verification dependency |
| `backend/app/db.py` (new) | Postgres access (asyncpg/supabase-py) |
| `backend/app/store.py` | replaced by DB-backed repository; jobs persisted |
| `backend/app/main.py` | split into routers (`projects`, `files`, `processing`, `jobs`, `sounds`, `exports`); ownership on every route; fix `JobType.transform_style`; delete `/api/v1/audio/mix` stub |
| `backend/app/models.py` | add user-scoped models; fix JobType |
| `supabase/migrations/001_core.sql` (new) | tables above |
| `src/api/infinityBackend.js` | send Bearer token; error typing |

### Phase 3–6

Phase 3: `backend/app/chains.py` (named modules: Infinity Opto/De-Esser/Harmonics/Air/
Echo/Space/Limiter mapped to existing ffmpeg stages), parameter validation/clamping,
project parameter persistence, undo/redo in workspace state.
Phase 4: real analysis page (`Unavailable` for BPM/key until real detection lands),
before/after re-analysis, technical release check, unified A/B player component.
Phase 5: `audio_versions` UI, real Projects/Library/Masters, export package endpoint
(WAV + MP3 + QC JSON/PDF), docs audit with Available/Beta/Experimental/Planned badges.
Phase 6: vitest + Playwright + pytest, CI pipeline, structured logging, health/metrics,
usage_records.

---

## Known risks going in

- GitHub Pages + Railway free-tier cold starts → "Cannot reach the backend" UX (already
  observed); mitigated with wake-up ping and honest status states.
- Railway disk is ephemeral → files must move to Supabase Storage before beta invites.
- Demucs is not installed on the current Railway image (requirements-demucs is separate);
  stems silently degrade to mid/side — must be labelled until resolved.
- No BPM/key detection exists server-side; UI must show "Unavailable" until
  librosa/essentia is added (dependency size on Railway is a consideration).

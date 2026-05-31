# Infinity AI — Claude Code Instructions

## Branch & PR workflow

- Development branch: `claude/review-access-feedback-ckQIN`
- Always push to this branch, then open a PR to `main`
- **After pushing and creating a PR, immediately enable auto-merge (SQUASH method)**
  - Use `mcp__github__enable_pr_auto_merge` with `mergeMethod: "SQUASH"`
  - Do NOT wait for user confirmation — auto-merge every PR automatically
- If the PR has merge conflicts, rebase onto `main` with `-X ours`, rebuild, push, then re-enable auto-merge

## Stack

- Frontend: React + Vite, deployed to GitHub Pages
- Backend: FastAPI on Railway (`VITE_INFINITY_API_URL` env var)
- Auth/DB: Supabase (optional cloud mode)
- AI music: Replicate MusicGen melody model (`REPLICATE_API_TOKEN` on Railway)

## Key patterns

- `data-infinity-local-action="true"` — exempts a button from the global click interceptor in App.jsx
- `data-infinity-auth="true"` — marks auth/dashboard containers, also exempt from interceptor
- Custom events for cross-component communication: `infinity:open-studio`, `infinity:close-studio`, `infinity:project-file`, `infinity:project-sound`
- `pollUntilComplete(jobId, onProgress)` — polls `/api/v1/jobs/{id}` until completed or failed
- Backend jobs return `{job_id}`, frontend polls for result

## Studio flow

3 steps: Upload → Shape your sound → Master & Download  
Auto-clean fires in background on upload. Session (songBackend + settings) persists to localStorage key `infinity_studio_session_v1`.

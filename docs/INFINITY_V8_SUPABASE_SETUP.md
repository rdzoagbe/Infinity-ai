# Infinity v8 Supabase Setup

Infinity v8 prepares the project for real cloud authentication and private project storage.

## What was added

- `@supabase/supabase-js` dependency
- Supabase client helper: `src/api/supabaseClient.js`
- Supabase SQL schema: `supabase/schema.sql`
- Environment variables in `.env.example`
- Row Level Security policies for private user projects
- Optional private storage bucket: `infinity-audio`

## Setup steps

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Open Supabase Project Settings > API.
5. Copy the Project URL and anon public key.
6. Create a local `.env` file at the root of the repo:

```env
VITE_INFINITY_API_URL=http://localhost:8000
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

7. Run the app:

```powershell
npm install --no-package-lock
npm run dev
```

## Current state

This is the Supabase foundation layer. The app still keeps the local dashboard fallback so testing does not break when Supabase keys are missing.

The next step is v8.1: wire the dashboard UI to Supabase Auth and cloud project CRUD.

## Tables

### public.projects

Stores private song/project metadata.

Important fields:

- `id`
- `user_id`
- `title`
- `artist`
- `type`
- `genre`
- `status`
- `notes`
- `analysis`
- `files`
- `created_at`
- `updated_at`

Row Level Security is enabled so users can only access their own projects.

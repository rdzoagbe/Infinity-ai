# Deployment Refresh

This file intentionally triggers a GitHub Pages rebuild after adding public Supabase environment secrets.

Expected public configuration:

- `VITE_INFINITY_API_URL=https://infinity-ai-production.up.railway.app`
- `VITE_SUPABASE_URL` from GitHub Actions secrets
- `VITE_SUPABASE_ANON_KEY` from GitHub Actions secrets

After the workflow completes, test:

```text
https://rdzoagbe.github.io/Infinity-ai/?v=artist-test
```

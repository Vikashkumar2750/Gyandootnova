# backend/ — API layer (frontend → backend → database)

All server-side logic lives here as Supabase Edge Functions.

| Path                              | Contains                                        |
| --------------------------------- | ----------------------------------------------- |
| `backend/supabase/functions/`     | One folder per deployed edge function            |
| `backend/supabase/functions/_shared/` | Shared helpers (auth, FX, CORS, SEO auth)    |

The entries are filesystem links to the canonical `supabase/functions` path
that the deployment pipeline reads — one copy of every file, no duplication.

## Rules

- Secrets are read with `Deno.env.get()` here and never shipped to the browser.
- Every function that touches user data verifies the caller's session/role.
- Functions are the only layer allowed to use privileged database access.
- Deploys happen automatically; no manual step is needed after an edit.

# BACKEND layer (API)

Every folder here is one Deno edge function = one HTTP API endpoint.
This is the **backend section** of the project: routes, controllers,
auth logic, middleware, services and the database access layer.

| Path | Role |
|---|---|
| `_shared/` | Shared middleware & services (CORS, auth guards, FX rates, SEO auth) |
| `<name>/index.ts` | Route handler (controller) for `POST /functions/v1/<name>` |

Rules:
- Never import from `src/` — the frontend and backend share no code,
  only the HTTP contract and generated DB types.
- All secrets are read with `Deno.env.get(...)`; never hard-coded.
- Validate every client input server-side; frontend checks are UX only.

See `../../ARCHITECTURE.md` for endpoint-by-endpoint documentation.

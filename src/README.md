# FRONTEND layer

Everything in `src/` (plus `public/`, `index.html`, `tailwind.config.ts`,
`vite.config.ts`) is the **frontend section** of this project.

| Path | Contents |
|---|---|
| `src/pages/` | Route-level pages |
| `src/components/` | Reusable UI components |
| `src/components/ui/` | shadcn/ui primitives |
| `src/hooks/` | React hooks |
| `src/lib/` | Frontend utilities / client-side services |
| `src/integrations/supabase/` | Auto-generated client + DB types (do not edit) |
| `src/assets/` | Images and static assets |
| `src/index.css` | Design tokens and Tailwind base |
| `public/` | Static files served as-is |

Rules:
- No secrets, no server-side business logic here.
- All privileged work goes through the backend layer
  (`supabase/functions/`) or RLS-protected RPCs.

See `../ARCHITECTURE.md` for the full frontend → API → backend → database map.

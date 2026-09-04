# DATABASE layer

The **database section** of the project: schema, migrations, RLS policies,
database functions/triggers and seed data.

| Item | Where |
|---|---|
| Schema + migrations | `supabase/migrations/*.sql` (timestamp-ordered, append-only) |
| RLS policies | inside the migration that creates each table |
| DB functions / triggers | inside migrations (`has_role`, `apply_coupon`, ...) |
| Seed / backfill SQL | migrations named `*_backfill_*` / `*_seed_*` |
| Storage buckets | `book-covers` (public), `post-images` (public), `book-files` (private) |
| DB configuration | `supabase/config.toml` |
| Generated types | `src/integrations/supabase/types.ts` (read-only, frontend-facing) |

Rules:
- Migrations are never edited after they run — add a new one instead.
- Every new `public` table needs `GRANT`s + `ENABLE ROW LEVEL SECURITY` +
  policies in the same migration.
- Only the backend layer and RLS-protected RPCs touch data directly.

See `../ARCHITECTURE.md` for the table and function reference.

# database/ — Persistence layer (backend → database → Supabase)

Schema and data rules live here.

| Path                            | Contains                                          |
| ------------------------------- | ------------------------------------------------- |
| `database/supabase/migrations/` | Ordered SQL migrations (the source of truth)      |
| `database/supabase/config.toml` | Project + function configuration                  |
| `database/supabase/DATABASE.md` | Table map, RLS policy notes, RPC reference        |

The entries are filesystem links to the canonical `supabase/` paths the
migration runner reads and writes — one copy of every file.

## Rules

- Schema changes are only ever made through a new migration file; never edit an
  applied migration.
- Every public table has RLS enabled plus explicit GRANTs.
- Roles live in `user_roles` and are checked through `has_role()` — never on
  the profile row.
- Existing data is preserved; migrations are additive or backfilling.

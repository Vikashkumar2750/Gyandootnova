
create table if not exists public.admin_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists admin_otps_user_idx on public.admin_otps(user_id, created_at desc);
alter table public.admin_otps enable row level security;
-- No client policies: only service role (edge functions) accesses this table.

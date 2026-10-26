-- Intermittent fasting tracker: one row per fast. A fast with ended_at null is the one currently running.
create table if not exists caldef.fasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  target_hours numeric(4,1) not null check (target_hours between 1 and 72),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

-- At most one running fast per user
create unique index if not exists fasts_one_active_per_user on caldef.fasts (user_id) where ended_at is null;
create index if not exists fasts_user_started on caldef.fasts (user_id, started_at desc);

alter table caldef.fasts enable row level security;
create policy "own fasts" on caldef.fasts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on caldef.fasts to authenticated;
grant all on caldef.fasts to service_role;

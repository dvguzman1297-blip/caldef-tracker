-- Recurring fasting schedule. One row per user. `days` are the weekdays a fast STARTS on (0 = Sunday ... 6 = Saturday).
create table if not exists caldef.fasting_schedule (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  start_time time not null default '20:00',
  hours numeric(4,1) not null default 16 check (hours between 1 and 72),
  days smallint[] not null default '{0,1,2,3,4,5,6}'
    check (days <@ array[0,1,2,3,4,5,6]::smallint[]),
  updated_at timestamptz not null default now()
);

alter table caldef.fasting_schedule enable row level security;
create policy "own fasting schedule" on caldef.fasting_schedule for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fasts created by the schedule are tagged, and at most one exists per scheduled day.
-- Deleting one marks it `skipped` instead (so the schedule doesn't recreate it).
alter table caldef.fasts
  add column if not exists source text not null default 'manual' check (source in ('manual', 'schedule')),
  add column if not exists scheduled_for date,
  add column if not exists skipped boolean not null default false;

create unique index if not exists fasts_one_per_scheduled_day on caldef.fasts (user_id, scheduled_for)
  where scheduled_for is not null;

grant select, insert, update, delete on caldef.fasting_schedule to authenticated;
grant all on caldef.fasting_schedule to service_role;

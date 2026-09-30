create extension if not exists "pgcrypto";
create type app_role as enum ('user', 'admin');
create type meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  height_cm numeric(5,1),
  current_weight_kg numeric(5,1),
  target_weight_kg numeric(5,1),
  age int,
  sex text check (sex in ('male','female')),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  dietary_preferences text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  primary key (user_id, role)
);
create table health_metrics (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bmr numeric(7,1) not null,
  tdee numeric(7,1) not null,
  target_calories int not null,
  target_protein_g int not null,
  target_fiber_g int not null,
  target_carbs_g int not null,
  target_fat_g int not null,
  deficit_pct numeric(4,2) not null default 0.20,
  computed_at timestamptz default now()
);
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  unique (user_id, log_date)
);
create table logged_meals (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references daily_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot meal_slot not null,
  title text not null,
  calories int not null,
  protein_g numeric(6,1) not null,
  fiber_g numeric(6,1) not null,
  net_carbs_g numeric(6,1) not null,
  fat_g numeric(6,1) not null,
  source text default 'manual',
  created_at timestamptz default now()
);
create index on logged_meals (user_id, created_at desc);
create table lane_builder_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lanes jsonb not null default '[]',
  updated_at timestamptz default now()
);

create or replace function is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  insert into user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table health_metrics enable row level security;
alter table daily_logs enable row level security;
alter table logged_meals enable row level security;
alter table lane_builder_configs enable row level security;

create policy "own profile" on profiles for all
  using (id = auth.uid() or is_admin()) with check (id = auth.uid());
create policy "read own role" on user_roles for select
  using (user_id = auth.uid() or is_admin());
create policy "admin manages roles" on user_roles for all
  using (is_admin()) with check (is_admin());
create policy "own metrics" on health_metrics for all
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid());
create policy "own logs" on daily_logs for all
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid());
create policy "own meals" on logged_meals for all
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid());
create policy "own lanes" on lane_builder_configs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- After signing up, make yourself admin:
-- insert into user_roles (user_id, role) values ('<your-user-uuid>', 'admin');

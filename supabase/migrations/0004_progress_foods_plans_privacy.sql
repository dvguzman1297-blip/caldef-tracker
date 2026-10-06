-- Weight log, structured allergens, saved foods, dated meal plans.

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 500),
  unique (user_id, log_date)
);

alter table profiles add column allergens text[] not null default '{}';

create table saved_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  serving text not null default '1 serving',
  calories int not null check (calories between 0 and 3000),
  protein_g numeric(6,1) not null check (protein_g >= 0),
  fiber_g numeric(6,1) not null check (fiber_g >= 0),
  net_carbs_g numeric(6,1) not null check (net_carbs_g >= 0),
  fat_g numeric(6,1) not null check (fat_g >= 0),
  provenance text not null default 'user_entered', -- who vouches for these numbers
  created_at timestamptz default now()
);

create table meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  slot meal_slot not null,
  position int not null default 0,
  title text not null,
  servings numeric(4,2) not null default 1 check (servings > 0 and servings <= 20),
  -- macros are per ONE serving
  calories int not null, protein_g numeric(6,1) not null, fiber_g numeric(6,1) not null,
  net_carbs_g numeric(6,1) not null, fat_g numeric(6,1) not null,
  ingredients text[] not null default '{}',
  source text not null default 'manual',
  logged_meal_id uuid references logged_meals(id) on delete set null,
  created_at timestamptz default now()
);
create index on meal_plan_entries (user_id, plan_date);

alter table weight_logs enable row level security;
alter table saved_foods enable row level security;
alter table meal_plan_entries enable row level security;
create policy "own weights" on weight_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own foods" on saved_foods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own plan" on meal_plan_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Replace the 0002 function so allergens are saved in the same transaction.
drop function if exists save_profile_and_targets(numeric, numeric, numeric, int, text, text, text[],
  numeric, numeric, int, int, int, int, int, numeric);
create function save_profile_and_targets(
  p_height_cm numeric, p_current_weight_kg numeric, p_target_weight_kg numeric,
  p_age int, p_sex text, p_activity_level text, p_dietary_preferences text[], p_allergens text[],
  p_bmr numeric, p_tdee numeric, p_target_calories int, p_target_protein_g int,
  p_target_fiber_g int, p_target_carbs_g int, p_target_fat_g int, p_deficit_pct numeric
) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  update profiles set
    height_cm = p_height_cm, current_weight_kg = p_current_weight_kg,
    target_weight_kg = p_target_weight_kg, age = p_age, sex = p_sex,
    activity_level = p_activity_level, dietary_preferences = p_dietary_preferences,
    allergens = p_allergens, updated_at = now()
  where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
  insert into health_metrics (user_id, bmr, tdee, target_calories, target_protein_g,
    target_fiber_g, target_carbs_g, target_fat_g, deficit_pct, computed_at)
  values (auth.uid(), p_bmr, p_tdee, p_target_calories, p_target_protein_g,
    p_target_fiber_g, p_target_carbs_g, p_target_fat_g, p_deficit_pct, now())
  on conflict (user_id) do update set
    bmr = excluded.bmr, tdee = excluded.tdee, target_calories = excluded.target_calories,
    target_protein_g = excluded.target_protein_g, target_fiber_g = excluded.target_fiber_g,
    target_carbs_g = excluded.target_carbs_g, target_fat_g = excluded.target_fat_g,
    deficit_pct = excluded.deficit_pct, computed_at = excluded.computed_at;
end $$;

-- Table privileges for the API roles. RLS above still restricts every row to its owner.
-- (Needed when the project doesn't auto-grant new public tables; harmless when it does.)
grant select, insert, update, delete on weight_logs, saved_foods, meal_plan_entries to authenticated;
grant execute on function save_profile_and_targets(numeric, numeric, numeric, int, text, text, text[], text[],
  numeric, numeric, int, int, int, int, int, numeric) to authenticated;

-- Moves every CalDef object out of `public` into its own `caldef` schema.
-- Foreign keys, RLS policies, indexes, and the on_auth_user_created trigger follow the objects
-- (they reference them by id, not by name), so no data is copied.
-- AFTER RUNNING: Supabase dashboard > Project Settings > API > Exposed schemas > add `caldef`.

create schema if not exists caldef;

alter type public.app_role set schema caldef;
alter type public.meal_slot set schema caldef;

alter table public.profiles set schema caldef;
alter table public.user_roles set schema caldef;
alter table public.health_metrics set schema caldef;
alter table public.daily_logs set schema caldef;
alter table public.logged_meals set schema caldef;
alter table public.lane_builder_configs set schema caldef;
alter table public.weight_logs set schema caldef;
alter table public.saved_foods set schema caldef;
alter table public.meal_plan_entries set schema caldef;

alter function public.is_admin() set schema caldef;
alter function public.handle_new_user() set schema caldef;
alter function public.save_profile_and_targets(numeric, numeric, numeric, int, text, text, text[], text[],
  numeric, numeric, int, int, int, int, int, numeric, boolean) set schema caldef;

-- The function bodies use unqualified table names, so point their search_path at the new schema.
alter function caldef.is_admin() set search_path = caldef;
alter function caldef.handle_new_user() set search_path = caldef;
alter function caldef.save_profile_and_targets(numeric, numeric, numeric, int, text, text, text[], text[],
  numeric, numeric, int, int, int, int, int, numeric, boolean) set search_path = caldef;

-- Custom schemas get no automatic API grants. RLS still restricts every row to its owner.
grant usage on schema caldef to authenticated, service_role;
grant select, insert, update, delete on all tables in schema caldef to authenticated;
grant all on all tables in schema caldef to service_role;
grant execute on all functions in schema caldef to authenticated;
alter default privileges in schema caldef grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema caldef grant all on tables to service_role;

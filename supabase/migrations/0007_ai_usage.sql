-- Per-user daily counter for the AI endpoints (meal estimate, recipe) so one account can't run up the Groq bill.
create table if not exists caldef.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count int not null default 0,
  primary key (user_id, usage_date)
);

alter table caldef.ai_usage enable row level security;
create policy "own ai usage" on caldef.ai_usage for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on caldef.ai_usage to authenticated;
grant all on caldef.ai_usage to service_role;

-- Atomically counts one AI call. Returns false (without counting) once p_limit calls were made today (UTC).
-- SECURITY INVOKER: RLS applies, so a user can only touch their own counter.
create or replace function caldef.consume_ai_quota(p_limit int) returns boolean
language plpgsql security invoker set search_path = caldef as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  insert into ai_usage (user_id, usage_date, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, usage_date) do update set count = ai_usage.count + 1
    where ai_usage.count < p_limit
  returning count into n;
  return n is not null;
end $$;

grant execute on function caldef.consume_ai_quota(int) to authenticated;

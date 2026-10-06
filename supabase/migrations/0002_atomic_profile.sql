-- Saves profile details and computed targets in one transaction (a function body is atomic).
-- SECURITY INVOKER: RLS still applies, so users can only write their own rows.
create or replace function save_profile_and_targets(
  p_height_cm numeric, p_current_weight_kg numeric, p_target_weight_kg numeric,
  p_age int, p_sex text, p_activity_level text, p_dietary_preferences text[],
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
    updated_at = now()
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

-- Optional time the meal was eaten (the date comes from the daily log), and soft delete for undo.
alter table logged_meals add column consumed_time time;
alter table logged_meals add column deleted_at timestamptz;
create index on logged_meals (daily_log_id) where deleted_at is null;

-- Phase 2: push notifications. push_subscriptions (with RLS) already
-- exists from 0001_init.sql — this just adds the columns needed to track
-- whether a reminder has already been sent for an event/task, so the
-- periodic cron check doesn't notify the same one more than once.
alter table events add column if not exists notified_at timestamptz;
alter table tasks add column if not exists notified_at timestamptz;

-- Needed for upsert-by-external-id when syncing calendar sources.
-- Manual events (external_id is null) are unaffected: Postgres treats each
-- null as distinct, so multiple manual events are still allowed.
alter table events
  add constraint events_source_external_id_key unique (source, external_id);

-- The ICS sync was generalized to support multiple feeds (Canvas, a school
-- Google account's Classroom export, etc), tagging events as `ics_<label>`
-- instead of the old hardcoded `canvas_ics`. Rename existing rows so the
-- next sync's upsert matches them instead of creating duplicates.
update events set source = 'ics_canvas' where source = 'canvas_ics';

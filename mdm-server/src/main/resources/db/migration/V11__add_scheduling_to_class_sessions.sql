-- Make started_at nullable since scheduled sessions won't have it immediately
ALTER TABLE class_sessions ALTER COLUMN started_at DROP NOT NULL;

-- Add scheduling columns
ALTER TABLE class_sessions ADD COLUMN scheduled_start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE class_sessions ADD COLUMN scheduled_end_time TIMESTAMP WITH TIME ZONE;

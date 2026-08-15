-- Drop foreign key and column school_id from campuses
ALTER TABLE campuses DROP CONSTRAINT IF EXISTS campuses_school_id_fkey;
ALTER TABLE campuses DROP COLUMN IF EXISTS school_id;

-- Add campus_id to schools and create foreign key
ALTER TABLE schools ADD COLUMN campus_id UUID;
ALTER TABLE schools ADD CONSTRAINT schools_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE;

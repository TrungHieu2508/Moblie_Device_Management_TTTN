-- V12__add_classroom_to_devices_and_enrollments.sql

-- Add classroom_id to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS classroom_id UUID;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_devices_classroom_id') THEN 
        ALTER TABLE devices ADD CONSTRAINT fk_devices_classroom_id FOREIGN KEY (classroom_id) REFERENCES classrooms(id);
    END IF; 
END $$;

-- Add classroom_id to enrollment_profiles table
ALTER TABLE enrollment_profiles ADD COLUMN IF NOT EXISTS classroom_id UUID;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_enrollment_profiles_classroom_id') THEN 
        ALTER TABLE enrollment_profiles ADD CONSTRAINT fk_enrollment_profiles_classroom_id FOREIGN KEY (classroom_id) REFERENCES classrooms(id);
    END IF; 
END $$;

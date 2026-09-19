-- V12__add_classroom_to_devices_and_enrollments.sql

-- Add classroom_id to devices table
ALTER TABLE devices ADD COLUMN classroom_id UUID;
ALTER TABLE devices ADD CONSTRAINT fk_devices_classroom_id FOREIGN KEY (classroom_id) REFERENCES classrooms(id);

-- Add classroom_id to enrollment_profiles table
ALTER TABLE enrollment_profiles ADD COLUMN classroom_id UUID;
ALTER TABLE enrollment_profiles ADD CONSTRAINT fk_enrollment_profiles_classroom_id FOREIGN KEY (classroom_id) REFERENCES classrooms(id);

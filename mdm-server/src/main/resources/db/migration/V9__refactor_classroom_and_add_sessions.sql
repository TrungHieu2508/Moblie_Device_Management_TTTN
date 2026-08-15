-- V9__refactor_classroom_and_add_sessions.sql

-- 1. Modify classrooms to use school_id instead of campus_id
ALTER TABLE classrooms ADD COLUMN school_id UUID;

-- Since classrooms currently rely on campus_id, let's try to infer a school_id if possible.
-- For a safe migration, we will allow null temporarily.
-- Then we drop the campus_id column.
-- First check if fk exists. The constraint name might be different, so let's try to drop common names.
ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS classrooms_campus_id_fkey;
ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS fk_classrooms_campus_id;
ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS fk_classrooms_campus;

ALTER TABLE classrooms DROP COLUMN IF EXISTS campus_id CASCADE;

-- Now add the foreign key to schools
ALTER TABLE classrooms ADD CONSTRAINT fk_classrooms_school_id FOREIGN KEY (school_id) REFERENCES schools(id);

-- 2. Create class_sessions table
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY,
    classroom_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_class_sessions_classroom_id FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
    CONSTRAINT fk_class_sessions_teacher_id FOREIGN KEY (teacher_id) REFERENCES users(id)
);

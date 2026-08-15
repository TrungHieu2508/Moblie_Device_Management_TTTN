-- Add campus_id to users table for IT_ADMIN RBAC
ALTER TABLE users 
ADD COLUMN campus_id UUID;

-- Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_campus 
FOREIGN KEY (campus_id) REFERENCES campuses(id);

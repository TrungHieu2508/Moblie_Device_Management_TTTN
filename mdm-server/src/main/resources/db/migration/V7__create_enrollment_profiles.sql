CREATE TABLE enrollment_profiles (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    school_id UUID NOT NULL REFERENCES schools(id),
    campus_id UUID NOT NULL REFERENCES campuses(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INT NOT NULL DEFAULT 0,
    current_uses INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enrollment_profiles_code ON enrollment_profiles(code);

CREATE TABLE device_commands (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    command_type VARCHAR(255) NOT NULL,
    payload JSONB,
    status VARCHAR(255) NOT NULL,
    error_message VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id UUID,
    CONSTRAINT fk_device_command_device FOREIGN KEY (device_id) REFERENCES devices (id),
    CONSTRAINT fk_device_command_user FOREIGN KEY (created_by_user_id) REFERENCES users (id)
);

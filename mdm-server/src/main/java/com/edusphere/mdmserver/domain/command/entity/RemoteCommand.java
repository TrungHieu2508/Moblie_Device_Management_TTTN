package com.edusphere.mdmserver.domain.command.entity;

import com.edusphere.mdmserver.common.entity.BaseEntity;
import com.edusphere.mdmserver.domain.alert.entity.Alert;
import com.edusphere.mdmserver.domain.command.enums.CommandStatus;
import com.edusphere.mdmserver.domain.command.enums.CommandType;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "remote_commands")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RemoteCommand extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by")
    private User issuedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alert_id")
    private Alert alert;

    @Enumerated(EnumType.STRING)
    @Column(name = "command_type", nullable = false)
    private CommandType commandType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "command_params")
    private Object commandParams;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CommandStatus status = CommandStatus.PENDING;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "executed_at")
    private Instant executedAt;

    @Column(name = "error_message")
    private String errorMessage;
}

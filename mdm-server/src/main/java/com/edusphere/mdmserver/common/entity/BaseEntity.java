package com.edusphere.mdmserver.common.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Base Entity cho tất cả các Entity có UUID primary key và timestamp fields.
 *
 * Tại sao dùng UUID thay vì Long ID?
 * - Không thể đoán được ID (security)
 * - Dễ merge data từ nhiều source
 * - Phù hợp với kiến trúc phân tán trong tương lai
 *
 * Tại sao dùng Instant thay vì LocalDateTime?
 * - Instant là UTC, không phụ thuộc timezone của server
 * - Khi hiển thị, Frontend tự convert sang timezone người dùng
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

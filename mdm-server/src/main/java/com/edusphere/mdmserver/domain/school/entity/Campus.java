package com.edusphere.mdmserver.domain.school.entity;

import com.edusphere.mdmserver.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "campuses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Campus extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    private String address;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @OneToMany(mappedBy = "campus", cascade = CascadeType.ALL)
    private Set<Classroom> classrooms;
}

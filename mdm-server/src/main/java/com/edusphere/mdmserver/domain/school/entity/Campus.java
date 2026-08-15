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

    @OneToMany(mappedBy = "campus", cascade = CascadeType.ALL)
    private Set<School> schools;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    private String address;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

}

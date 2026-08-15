package com.edusphere.mdmserver.domain.user.repository;

import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Page<User> findByRole(UserRole role, Pageable pageable);
    long countByRole(UserRole role);
}

package com.edusphere.mdmserver.domain.user.service;

import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import com.edusphere.mdmserver.domain.user.dto.CreateUserRequest;
import com.edusphere.mdmserver.domain.user.dto.UpdateUserRequest;
import com.edusphere.mdmserver.domain.user.dto.UserDto;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.enums.UserRole;
import com.edusphere.mdmserver.domain.user.repository.RefreshTokenRepository;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import com.edusphere.mdmserver.domain.school.dto.SchoolDto;
import com.edusphere.mdmserver.domain.school.dto.CampusDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final CampusRepository campusRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .build();

        if (request.getRole() == UserRole.IT_ADMIN) {
            if (request.getCampusId() != null) {
                Campus campus = campusRepository.findById(request.getCampusId())
                        .orElseThrow(() -> new IllegalArgumentException("Campus not found"));
                user.setCampus(campus);
            } else {
                throw new IllegalArgumentException("Campus ID is required for IT_ADMIN");
            }
            
            if (request.getSchoolId() != null) {
                // If they provided a school, ensure it belongs to the campus
                School school = schoolRepository.findById(request.getSchoolId())
                        .orElseThrow(() -> new IllegalArgumentException("School not found"));
                if (!school.getCampus().getId().equals(campusRepository.findById(request.getCampusId()).get().getId())) {
                    throw new IllegalArgumentException("School does not belong to the selected campus");
                }
                user.setSchool(school);
            }
        } else if (request.getRole() == UserRole.TEACHER) {
            if (request.getSchoolId() != null) {
                School school = schoolRepository.findById(request.getSchoolId())
                        .orElseThrow(() -> new IllegalArgumentException("School not found"));
                user.setSchool(school);
            } else {
                throw new IllegalArgumentException("School ID is required for TEACHER");
            }
        }

        user = userRepository.save(user);
        return mapToDto(user);
    }

    @Transactional(readOnly = true)
    public Page<UserDto> getUsers(String search, UserRole role, UUID campusId, Pageable pageable) {
        // Implement complex search in repository if needed. For now, simple findAll.
        // A full implementation would use Specification.
        Page<User> users;
        if (role != null) {
            users = userRepository.findByRole(role, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return users.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return mapToDto(user);
    }

    @Transactional
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getEmail() != null) {
            if (!user.getEmail().equals(request.getEmail()) && userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }
        boolean passwordChanged = false;
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            passwordChanged = true;
        }
        if (request.getRole() != null && request.getRole() != user.getRole()) {
            throw new IllegalArgumentException("Không thể thay đổi vai trò (Role) của tài khoản sau khi tạo");
        }
        if (request.getIsActive() != null) user.setIsActive(request.getIsActive());

        // Update campus and school if provided
        if (request.getSchoolId() != null) {
            School school = schoolRepository.findById(request.getSchoolId())
                    .orElseThrow(() -> new IllegalArgumentException("School not found"));
            user.setSchool(school);
        }
        if (request.getCampusId() != null) {
            Campus campus = campusRepository.findById(request.getCampusId())
                    .orElseThrow(() -> new IllegalArgumentException("Campus not found"));
            user.setCampus(campus);
        }

        // Logic enforcement: clean up scope based on role
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            user.setCampus(null);
            user.setSchool(null);
        } else if (user.getRole() == UserRole.IT_ADMIN) {
            user.setSchool(null);
        } else if (user.getRole() == UserRole.TEACHER) {
            user.setCampus(null);
        }

        user = userRepository.save(user);

        // Force logout: nếu mật khẩu bị đổi hoặc tài khoản bị khóa -> xóa hết refresh token
        if (passwordChanged || (request.getIsActive() != null && !request.getIsActive())) {
            refreshTokenRepository.deleteByUserId(user.getId());
        }

        return mapToDto(user);
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        // Prevent deleting last SUPER_ADMIN
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            long superAdminCount = userRepository.countByRole(UserRole.SUPER_ADMIN);
            if (superAdminCount <= 1) {
                throw new IllegalArgumentException("Cannot delete the last SUPER_ADMIN");
            }
        }
        userRepository.delete(user);
    }

    @Transactional
    public UserDto updateProfile(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getEmail() != null) {
            if (!user.getEmail().equals(request.getEmail()) && userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        
        user = userRepository.save(user);
        return mapToDto(user);
    }

    private UserDto mapToDto(User user) {
        UserDto.UserDtoBuilder builder = UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt());

        if (user.getSchool() != null) {
            builder.school(SchoolDto.builder()
                    .id(user.getSchool().getId())
                    .name(user.getSchool().getName())
                    .build());
        }
        if (user.getCampus() != null) {
            builder.campus(CampusDto.builder()
                    .id(user.getCampus().getId())
                    .name(user.getCampus().getName())
                    .build());
        }

        return builder.build();
    }
}

package com.edusphere.mdmserver.config;

import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.enums.UserRole;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final CampusRepository campusRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Create demo campus and school if not exist
        Campus campus;
        if (campusRepository.count() == 0) {
            campus = Campus.builder()
                    .name("Khu vực Quận Tân Bình")
                    .code("Q_TB")
                    .address("Tân Bình, TP.HCM")
                    .build();
            campus = campusRepository.save(campus);
        } else {
            campus = campusRepository.findAll().get(0);
        }

        School school;
        if (schoolRepository.count() == 0) {
            school = School.builder()
                    .name("THPT Nguyễn Thượng Hiền")
                    .code("NTH")
                    .address("Tân Bình, TP.HCM")
                    .campus(campus)
                    .build();
            school = schoolRepository.save(school);
        } else {
            school = schoolRepository.findAll().get(0);
        }

        // Create Super Admin (Fixed initial account)
        if (userRepository.findByUsername("superadmin").isEmpty()) {
            User superAdmin = User.builder()
                    .username("superadmin")
                    .email("superadmin@edusphere.com")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("Quản trị viên Hệ thống")
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .build();
            userRepository.save(superAdmin);
        }
        
        // Create IT Admin
        if (userRepository.findByUsername("ITadminGV").isEmpty()) {
            User itAdmin = User.builder()
                    .username("ITadminGV")
                    .email("itadmin@edusphere.com")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("IT Admin")
                    .role(UserRole.IT_ADMIN)
                    .isActive(true)
                    .campus(campus)
                    .build();
            userRepository.save(itAdmin);
        }

        // Create Teacher
        if (userRepository.findByUsername("gv01").isEmpty()) {
            User teacher = User.builder()
                    .username("gv01")
                    .email("gv01@edusphere.com")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("Giáo viên 01")
                    .role(UserRole.TEACHER)
                    .isActive(true)
                    .campus(campus)
                    .build();
            userRepository.save(teacher);
        }
    }
}

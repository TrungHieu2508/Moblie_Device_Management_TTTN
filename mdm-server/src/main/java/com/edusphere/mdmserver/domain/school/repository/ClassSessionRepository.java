package com.edusphere.mdmserver.domain.school.repository;

import com.edusphere.mdmserver.domain.school.entity.ClassSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassSessionRepository extends JpaRepository<ClassSession, UUID> {
    List<ClassSession> findByClassroomId(UUID classroomId);
    Optional<ClassSession> findByClassroomIdAndStatus(UUID classroomId, String status);
    List<ClassSession> findByStatus(String status);
    List<ClassSession> findByClassroomSchoolIdAndStatus(UUID schoolId, String status);
    List<ClassSession> findByClassroomSchoolIdAndStatusIn(UUID schoolId, List<String> statuses);
    
    List<ClassSession> findByTeacherIdAndStatus(UUID teacherId, String status);
    List<ClassSession> findByTeacherIdAndStatusIn(UUID teacherId, List<String> statuses);

    @org.springframework.data.jpa.repository.Query(
        "SELECT CASE WHEN COUNT(cs) > 0 THEN true ELSE false END FROM ClassSession cs " +
        "WHERE cs.classroom.id = :classroomId " +
        "AND cs.status IN :statuses " +
        "AND cs.scheduledStartTime < :endTime AND cs.scheduledEndTime > :startTime"
    )
    boolean existsOverlappingSession(
        @org.springframework.data.repository.query.Param("classroomId") UUID classroomId,
        @org.springframework.data.repository.query.Param("startTime") java.time.Instant startTime,
        @org.springframework.data.repository.query.Param("endTime") java.time.Instant endTime,
        @org.springframework.data.repository.query.Param("statuses") List<String> statuses
    );
}

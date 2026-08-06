package com.edusphere.mdmserver.domain.school.service;

import com.edusphere.mdmserver.domain.school.dto.ClassroomDto;
import com.edusphere.mdmserver.domain.school.dto.CreateClassroomRequest;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.Classroom;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import com.edusphere.mdmserver.domain.school.repository.ClassroomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final CampusRepository campusRepository;

    @Transactional
    public ClassroomDto createClassroom(CreateClassroomRequest request) {
        if (classroomRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã lớp học đã tồn tại: " + request.getCode());
        }

        Campus campus = campusRepository.getReferenceById(request.getCampusId());

        Classroom classroom = Classroom.builder()
                .campus(campus)
                .name(request.getName())
                .code(request.getCode())
                .build();

        return mapToDto(classroomRepository.save(classroom));
    }

    public List<ClassroomDto> getClassroomsByCampusId(UUID campusId) {
        return classroomRepository.findByCampusId(campusId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ClassroomDto updateClassroom(UUID id, CreateClassroomRequest request) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));

        if (!classroom.getCode().equals(request.getCode()) && classroomRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Mã lớp học đã tồn tại: " + request.getCode());
        }

        if (!classroom.getCampus().getId().equals(request.getCampusId())) {
            Campus campus = campusRepository.findById(request.getCampusId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy cơ sở mới"));
            classroom.setCampus(campus);
        }

        classroom.setName(request.getName());
        classroom.setCode(request.getCode());

        return mapToDto(classroomRepository.save(classroom));
    }

    @Transactional
    public void deleteClassroom(UUID id) {
        if (!classroomRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy lớp học");
        }
        // TODO: check if devices exist in this classroom
        classroomRepository.deleteById(id);
    }

    private ClassroomDto mapToDto(Classroom classroom) {
        return ClassroomDto.builder()
                .id(classroom.getId())
                .campusId(classroom.getCampus().getId())
                .name(classroom.getName())
                .code(classroom.getCode())
                .build();
    }
}

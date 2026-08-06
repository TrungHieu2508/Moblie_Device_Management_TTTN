package com.edusphere.mdmserver.domain.device.service;

import com.edusphere.mdmserver.domain.device.dto.AssignDeviceRequest;
import com.edusphere.mdmserver.domain.device.dto.DeviceDto;
import com.edusphere.mdmserver.domain.device.dto.DeviceRegistrationRequest;
import com.edusphere.mdmserver.domain.device.dto.DeviceRegistrationResponse;
import com.edusphere.mdmserver.domain.device.entity.Device;
import com.edusphere.mdmserver.domain.device.enums.DeviceStatus;
import com.edusphere.mdmserver.domain.device.repository.DeviceRepository;
import com.edusphere.mdmserver.domain.school.dto.CampusDto;
import com.edusphere.mdmserver.domain.school.dto.ClassroomDto;
import com.edusphere.mdmserver.domain.school.dto.SchoolDto;
import com.edusphere.mdmserver.domain.school.entity.Campus;
import com.edusphere.mdmserver.domain.school.entity.Classroom;
import com.edusphere.mdmserver.domain.school.entity.School;
import com.edusphere.mdmserver.domain.school.repository.CampusRepository;
import com.edusphere.mdmserver.domain.school.repository.ClassroomRepository;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import com.edusphere.mdmserver.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final SchoolRepository schoolRepository;
    private final CampusRepository campusRepository;
    private final ClassroomRepository classroomRepository;
    private final JwtService jwtService;

    @Value("${app.jwt.device-token-expiration}")
    private long deviceTokenExpiration;

    @Value("${app.device.heartbeat-interval}")
    private int heartbeatIntervalSeconds;

    @Value("${app.device.websocket-url}")
    private String websocketUrl;

    @Transactional
    public DeviceRegistrationResponse registerDevice(DeviceRegistrationRequest request) {
        Optional<Device> existingDevice = deviceRepository.findByDeviceId(request.getDeviceId());
        Device device;

        if (existingDevice.isPresent()) {
            device = existingDevice.get();
            
            // SECURITY FLAW FIX (Hijacking Prevention): 
            // If the device is not PENDING (i.e., it is actively enrolled and assigned), 
            // we must not allow a blind re-registration which would steal its session/token.
            // The Admin must wipe or unassign it first.
            if (device.getStatus() != DeviceStatus.PENDING) {
                log.warn("Hijack attempt or duplicate registration for device ID: {}", request.getDeviceId());
                throw new IllegalArgumentException("Thiết bị đã được đăng ký và đang hoạt động. Liên hệ Admin để reset thiết bị trước khi đăng ký lại.");
            }

            // Update device details
            device.setDeviceName(request.getDeviceName());
            device.setSerialNumber(request.getSerialNumber());
            device.setModel(request.getModel());
            device.setAndroidVersion(request.getAndroidVersion());
            device.setAgentVersion(request.getAgentVersion());
            // We don't reset school assignments for existing devices
        } else {
            device = Device.builder()
                    .deviceId(request.getDeviceId())
                    .deviceName(request.getDeviceName())
                    .serialNumber(request.getSerialNumber())
                    .model(request.getModel())
                    .androidVersion(request.getAndroidVersion())
                    .agentVersion(request.getAgentVersion())
                    .status(DeviceStatus.PENDING)
                    .registeredAt(Instant.now())
                    .build();
        }

        // Generate token for device
        String registrationToken = jwtService.generateDeviceToken(device.getDeviceId());
        device.setRegistrationToken(registrationToken);
        device.setLastHeartbeatAt(Instant.now());
        
        Device savedDevice = deviceRepository.save(device);

        return DeviceRegistrationResponse.builder()
                .deviceUuid(savedDevice.getId())
                .registrationToken(registrationToken)
                .tokenExpiresAt(Instant.now().plusMillis(deviceTokenExpiration))
                .serverConfig(DeviceRegistrationResponse.ServerConfig.builder()
                        .heartbeatIntervalSeconds(heartbeatIntervalSeconds)
                        .websocketUrl(websocketUrl)
                        .build())
                .build();
    }

    public Page<DeviceDto> getDevices(UUID schoolId, UUID campusId, UUID classroomId, DeviceStatus status, String search, Pageable pageable) {
        return deviceRepository.searchDevices(schoolId, campusId, classroomId, status, search, pageable)
                .map(this::mapToDto);
    }

    public DeviceDto getDeviceById(UUID id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));
        return mapToDto(device);
    }

    @Transactional
    public DeviceDto assignDevice(UUID id, AssignDeviceRequest request) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));

        School school = schoolRepository.getReferenceById(request.getSchoolId());
        Campus campus = campusRepository.getReferenceById(request.getCampusId());
        Classroom classroom = classroomRepository.getReferenceById(request.getClassroomId());

        device.setSchool(school);
        device.setCampus(campus);
        device.setClassroom(classroom);
        
        if (request.getDeviceName() != null && !request.getDeviceName().isBlank()) {
            device.setDeviceName(request.getDeviceName());
        }

        device.setStatus(DeviceStatus.ONLINE); // Assume online when assigned, heartbeat logic will update this
        return mapToDto(deviceRepository.save(device));
    }

    @Transactional
    public DeviceDto unassignDevice(UUID id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));

        device.setSchool(null);
        device.setCampus(null);
        device.setClassroom(null);
        device.setStatus(DeviceStatus.PENDING);

        return mapToDto(deviceRepository.save(device));
    }

    @Transactional
    public void deleteDevice(UUID id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));
        deviceRepository.delete(device);
    }

    private DeviceDto mapToDto(Device device) {
        DeviceDto dto = DeviceDto.builder()
                .id(device.getId())
                .deviceId(device.getDeviceId())
                .deviceName(device.getDeviceName())
                .model(device.getModel())
                .androidVersion(device.getAndroidVersion())
                .agentVersion(device.getAgentVersion())
                .status(device.getStatus())
                .lastHeartbeatAt(device.getLastHeartbeatAt())
                .build();

        if (device.getSchool() != null) {
            dto.setSchool(SchoolDto.builder()
                    .id(device.getSchool().getId())
                    .name(device.getSchool().getName())
                    .code(device.getSchool().getCode())
                    .build());
        }
        
        if (device.getCampus() != null) {
            dto.setCampus(CampusDto.builder()
                    .id(device.getCampus().getId())
                    .name(device.getCampus().getName())
                    .build());
        }

        if (device.getClassroom() != null) {
            dto.setClassroom(ClassroomDto.builder()
                    .id(device.getClassroom().getId())
                    .name(device.getClassroom().getName())
                    .code(device.getClassroom().getCode())
                    .build());
        }

        return dto;
    }
}

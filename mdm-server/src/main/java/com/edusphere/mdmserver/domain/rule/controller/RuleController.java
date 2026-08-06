package com.edusphere.mdmserver.domain.rule.controller;

import com.edusphere.mdmserver.common.dto.ApiResponse;
import com.edusphere.mdmserver.domain.rule.dto.RuleRequest;
import com.edusphere.mdmserver.domain.rule.entity.Rule;
import com.edusphere.mdmserver.domain.rule.repository.RuleRepository;
import com.edusphere.mdmserver.domain.rule.service.RuleCacheService;
import com.edusphere.mdmserver.domain.school.repository.SchoolRepository;
import com.edusphere.mdmserver.domain.user.entity.User;
import com.edusphere.mdmserver.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/rules")
@RequiredArgsConstructor
public class RuleController {

    private final RuleRepository ruleRepository;
    private final SchoolRepository schoolRepository;
    private final RuleCacheService ruleCacheService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<Rule>> createRule(Principal principal, @RequestBody RuleRequest request) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User không tồn tại"));

        Rule rule = Rule.builder()
                .name(request.getName())
                .description(request.getDescription())
                .ruleType(request.getRuleType())
                .ruleData(request.getRuleData())
                .severity(request.getSeverity())
                .isActive(true)
                .createdBy(user)
                .build();

        if (request.getSchoolId() != null) {
            rule.setSchool(schoolRepository.findById(request.getSchoolId())
                    .orElseThrow(() -> new IllegalArgumentException("Trường học không tồn tại")));
        }

        rule = ruleRepository.save(rule);
        
        // Refresh cache immediately after creating new rule
        ruleCacheService.refreshCache();
        
        return ResponseEntity.ok(ApiResponse.success(rule, "Tạo Rule thành công"));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<List<Rule>>> getRules() {
        return ResponseEntity.ok(ApiResponse.success(ruleRepository.findAll(), "Thành công"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('IT_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable UUID id) {
        ruleRepository.deleteById(id);
        ruleCacheService.refreshCache();
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa Rule thành công"));
    }
}

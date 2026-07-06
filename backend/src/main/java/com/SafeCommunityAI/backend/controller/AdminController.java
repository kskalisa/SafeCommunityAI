package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.AdminUserRequest;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.entity.ResponderProfile;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.ResponderStatus;
import com.SafeCommunityAI.backend.enums.Role;
import com.SafeCommunityAI.backend.enums.VerificationStatus;
import com.SafeCommunityAI.backend.exception.BadRequestException;
import com.SafeCommunityAI.backend.repository.*;
import com.SafeCommunityAI.backend.service.AuditService;
import com.SafeCommunityAI.backend.service.AnalyticsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final IncidentRepository incidentRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final AppMapper mapper;
    private final AnalyticsService analyticsService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @GetMapping("/users")
    public List<?> users() {
        return userRepository.findAll().stream().map(mapper::toUserResponse).toList();
    }

    @PostMapping("/users")
    public Object createUser(@Valid @RequestBody AdminUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email is already registered");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new BadRequestException("Password is required for new users");
        }
        User user = User.builder()
                .fullName(request.fullName())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .phone(request.phone())
                .enabled(request.enabled() == null || request.enabled())
                .accountLocked(Boolean.TRUE.equals(request.accountLocked()))
                .locationPrivacyConsent(true)
                .build();
        user = userRepository.save(user);
        saveResponderProfileIfNeeded(user, request);
        auditService.log("ADMIN_USER_CREATED", "admin", "User", user.getId(), "Role: " + user.getRole());
        return mapper.toUserResponse(user);
    }

    @PutMapping("/users/{id}")
    public Object updateUser(@PathVariable Long id, @Valid @RequestBody AdminUserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new BadRequestException("User not found"));
        userRepository.findByEmail(request.email())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new BadRequestException("Email is already registered");
                });
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setRole(request.role());
        user.setPhone(request.phone());
        user.setEnabled(request.enabled() == null || request.enabled());
        user.setAccountLocked(Boolean.TRUE.equals(request.accountLocked()));
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        user = userRepository.save(user);
        saveResponderProfileIfNeeded(user, request);
        auditService.log("ADMIN_USER_UPDATED", "admin", "User", user.getId(), "Role: " + user.getRole());
        return mapper.toUserResponse(user);
    }

    @PatchMapping("/users/{id}/status")
    public Object updateUserStatus(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        User user = userRepository.findById(id).orElseThrow(() -> new BadRequestException("User not found"));
        if (request.containsKey("enabled")) {
            user.setEnabled(Boolean.TRUE.equals(request.get("enabled")));
        }
        if (request.containsKey("accountLocked")) {
            user.setAccountLocked(Boolean.TRUE.equals(request.get("accountLocked")));
        }
        if (request.containsKey("role")) {
            user.setRole(Role.valueOf(String.valueOf(request.get("role"))));
        }
        user = userRepository.save(user);
        auditService.log("ADMIN_USER_STATUS_UPDATED", "admin", "User", user.getId(), request.toString());
        return mapper.toUserResponse(user);
    }

    @GetMapping("/audit-logs")
    public List<?> auditLogs() {
        return auditLogRepository.findTop100ByOrderByCreatedAtDesc();
    }

    @GetMapping("/incidents")
    @Transactional(readOnly = true)
    public List<?> incidents() {
        return incidentRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(com.SafeCommunityAI.backend.entity.Incident::getReportedAt, java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .map(mapper::toIncidentResponse)
                .toList();
    }

    @GetMapping("/analytics")
    public Map<String, Object> analytics() {
        return analyticsService.operationsAnalytics();
    }

    private void saveResponderProfileIfNeeded(User user, AdminUserRequest request) {
        if (user.getRole() != Role.RESPONDER) {
            return;
        }
        ResponderProfile profile = responderProfileRepository.findByUser(user).orElse(
                ResponderProfile.builder()
                        .user(user)
                        .verificationStatus(VerificationStatus.PENDING)
                        .availabilityStatus(ResponderStatus.OFFLINE)
                        .build()
        );
        profile.setOrganization(request.organization());
        profile.setCertificationLicense(request.certificationLicense());
        profile.setVehicleNumber(request.vehicleNumber());
        responderProfileRepository.save(profile);
    }
}

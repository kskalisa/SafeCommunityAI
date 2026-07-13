package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.AdminUserRequest;
import com.SafeCommunityAI.backend.entity.ResponderProfile;
import com.SafeCommunityAI.backend.entity.Resource;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.ResponderStatus;
import com.SafeCommunityAI.backend.enums.Role;
import com.SafeCommunityAI.backend.enums.VerificationStatus;
import com.SafeCommunityAI.backend.exception.BadRequestException;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.*;
import com.SafeCommunityAI.backend.service.AuditService;
import com.SafeCommunityAI.backend.service.AnalyticsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private static final long MAX_CERTIFICATE_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CERTIFICATE_TYPES = Set.of("application/pdf", "image/jpeg", "image/jpg", "image/pjpeg", "image/png");

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final IncidentRepository incidentRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final ResourceRepository resourceRepository;
    private final AppMapper mapper;
    private final AnalyticsService analyticsService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public List<?> users() {
        return userRepository.findAll().stream().map(mapper::toUserResponse).toList();
    }

    @PostMapping(value = "/users", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Object createUser(@Valid @RequestBody AdminUserRequest request) {
        return createUserInternal(request, null);
    }

    @PostMapping(value = "/users", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object createUserMultipart(@RequestParam String fullName,
                                      @RequestParam String email,
                                      @RequestParam(required = false) String password,
                                      @RequestParam Role role,
                                      @RequestParam(required = false) String phone,
                                      @RequestParam(required = false) Boolean enabled,
                                      @RequestParam(required = false) Boolean accountLocked,
                                      @RequestParam(required = false) String organization,
                                      @RequestParam(required = false) List<Long> resourceIds,
                                      @RequestPart(required = false) MultipartFile certificate) {
        return createUserInternal(new AdminUserRequest(fullName, email, password, role, phone, enabled, accountLocked, organization, resourceIds), certificate);
    }

    @PutMapping(value = "/users/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Object updateUser(@PathVariable Long id, @Valid @RequestBody AdminUserRequest request) {
        return updateUserInternal(id, request, null);
    }

    @PutMapping(value = "/users/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object updateUserMultipart(@PathVariable Long id,
                                      @RequestParam String fullName,
                                      @RequestParam String email,
                                      @RequestParam(required = false) String password,
                                      @RequestParam Role role,
                                      @RequestParam(required = false) String phone,
                                      @RequestParam(required = false) Boolean enabled,
                                      @RequestParam(required = false) Boolean accountLocked,
                                      @RequestParam(required = false) String organization,
                                      @RequestParam(required = false) List<Long> resourceIds,
                                      @RequestPart(required = false) MultipartFile certificate) {
        return updateUserInternal(id, new AdminUserRequest(fullName, email, password, role, phone, enabled, accountLocked, organization, resourceIds), certificate);
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

    @GetMapping("/responders/{id}/certificate")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadResponderCertificate(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Responder not found"));
        ResponderProfile profile = responderProfileRepository.findByUser(user).orElseThrow(() -> new ResourceNotFoundException("Responder profile not found"));
        if (profile.getCertificateDataBase64() == null) {
            throw new ResourceNotFoundException("Certificate not found");
        }
        MediaType mediaType = profile.getCertificateContentType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(profile.getCertificateContentType());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + profile.getCertificateFileName() + "\"")
                .body(Base64.getDecoder().decode(profile.getCertificateDataBase64()));
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

    private Object createUserInternal(AdminUserRequest request, MultipartFile certificate) {
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
        saveResponderProfileIfNeeded(user, request, certificate);
        auditService.log("ADMIN_USER_CREATED", "admin", "User", user.getId(), "Role: " + user.getRole());
        return mapper.toUserResponse(user);
    }

    private Object updateUserInternal(Long id, AdminUserRequest request, MultipartFile certificate) {
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
        saveResponderProfileIfNeeded(user, request, certificate);
        auditService.log("ADMIN_USER_UPDATED", "admin", "User", user.getId(), "Role: " + user.getRole());
        return mapper.toUserResponse(user);
    }

    private void saveResponderProfileIfNeeded(User user, AdminUserRequest request, MultipartFile certificate) {
        if (user.getRole() != Role.RESPONDER) {
            responderProfileRepository.findByUser(user).ifPresent(responderProfileRepository::delete);
            return;
        }
        ResponderProfile profile = responderProfileRepository.findByUser(user).orElse(
                ResponderProfile.builder()
                        .user(user)
                        .verificationStatus(VerificationStatus.PENDING)
                        .availabilityStatus(ResponderStatus.AVAILABLE)
                        .build()
        );
        profile.setOrganization(request.organization());
        profile.setResources(new LinkedHashSet<>(loadResources(request.resourceIds())));
        if (certificate != null && !certificate.isEmpty()) {
            applyCertificate(profile, certificate);
        }
        responderProfileRepository.save(profile);
    }

    private List<Resource> loadResources(List<Long> resourceIds) {
        if (resourceIds == null || resourceIds.isEmpty()) {
            return List.of();
        }
        List<Resource> resources = resourceRepository.findAllById(resourceIds);
        if (resources.size() != new LinkedHashSet<>(resourceIds).size()) {
            throw new BadRequestException("One or more selected resources were not found");
        }
        return resources;
    }

    private void applyCertificate(ResponderProfile profile, MultipartFile certificate) {
        if (certificate.getSize() > MAX_CERTIFICATE_BYTES) {
            throw new BadRequestException("Certificate must be 10 MB or smaller");
        }
        String contentType = certificate.getContentType() == null ? "" : certificate.getContentType().toLowerCase(Locale.ROOT);
        String fileName = certificate.getOriginalFilename() == null ? "" : certificate.getOriginalFilename().toLowerCase(Locale.ROOT);
        boolean supportedType = ALLOWED_CERTIFICATE_TYPES.contains(contentType);
        boolean supportedExtension = fileName.endsWith(".pdf") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png");
        if (!supportedType && !supportedExtension) {
            throw new BadRequestException("Only PDF, JPG, JPEG, and PNG certificate files are supported");
        }
        try {
            profile.setCertificateFileName(certificate.getOriginalFilename());
            profile.setCertificateContentType(certificate.getContentType());
            profile.setCertificateSizeBytes(certificate.getSize());
            profile.setCertificateDataBase64(Base64.getEncoder().encodeToString(certificate.getBytes()));
        } catch (IOException exception) {
            throw new BadRequestException("Unable to store certificate");
        }
    }
}

package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.*;
import com.SafeCommunityAI.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final AppMapper mapper;
    private final AnalyticsService analyticsService;

    @GetMapping("/users")
    public List<?> users() {
        return userRepository.findAll().stream().map(mapper::toUserResponse).toList();
    }

    @GetMapping("/audit-logs")
    public List<?> auditLogs() {
        return auditLogRepository.findTop100ByOrderByCreatedAtDesc();
    }

    @GetMapping("/analytics")
    public Map<String, Object> analytics() {
        return analyticsService.operationsAnalytics();
    }
}

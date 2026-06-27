package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
public class ReportController {
    private final AnalyticsService analyticsService;

    @GetMapping("/analytics")
    public Map<String, Object> analytics() {
        return analyticsService.operationsAnalytics();
    }
}

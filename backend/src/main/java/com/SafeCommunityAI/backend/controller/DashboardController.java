package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.DashboardResponse;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping("/me")
    public DashboardResponse me(@AuthenticationPrincipal User user) {
        return dashboardService.dashboard(user.getEmail());
    }
}

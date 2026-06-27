package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.dto.DashboardResponse;

public interface DashboardService {
    DashboardResponse dashboard(String actorEmail);
}

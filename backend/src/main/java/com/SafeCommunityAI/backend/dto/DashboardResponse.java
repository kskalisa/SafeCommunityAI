package com.SafeCommunityAI.backend.dto;

import java.util.Map;

public record DashboardResponse(String role, Map<String, Object> metrics) {}

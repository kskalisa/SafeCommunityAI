package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.ResponderStatus;

import java.util.List;

public record DispatchRecommendationResponse(
        Long responderId,
        String fullName,
        String organization,
        List<ResourceSummaryResponse> resources,
        ResponderStatus availabilityStatus,
        double distanceKm,
        int etaMinutes,
        int score,
        String reason
) {}

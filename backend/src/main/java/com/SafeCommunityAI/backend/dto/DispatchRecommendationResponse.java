package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.ResponderStatus;

public record DispatchRecommendationResponse(
        Long responderId,
        String fullName,
        String organization,
        String vehicleNumber,
        ResponderStatus availabilityStatus,
        double distanceKm,
        int etaMinutes,
        String reason
) {}

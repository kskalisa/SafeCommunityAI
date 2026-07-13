package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.ResourceStatus;

public record ResourceSummaryResponse(
        Long id,
        String name,
        String type,
        ResourceStatus status,
        String location
) {}

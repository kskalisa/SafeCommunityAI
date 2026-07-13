package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.ResponderStatus;
import com.SafeCommunityAI.backend.enums.VerificationStatus;

import java.time.Instant;
import java.util.List;

public record ResponderDetailResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        boolean enabled,
        String organization,
        String certificateFileName,
        String certificateContentType,
        Long certificateSizeBytes,
        String certificateUrl,
        List<ResourceSummaryResponse> resources,
        VerificationStatus verificationStatus,
        ResponderStatus availabilityStatus,
        Instant createdAt
) {}

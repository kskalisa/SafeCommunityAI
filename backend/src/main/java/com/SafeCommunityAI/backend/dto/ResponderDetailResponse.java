package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.ResponderStatus;
import com.SafeCommunityAI.backend.enums.VerificationStatus;

import java.time.Instant;

public record ResponderDetailResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        boolean enabled,
        String organization,
        String certificationLicense,
        String vehicleNumber,
        VerificationStatus verificationStatus,
        ResponderStatus availabilityStatus,
        Instant createdAt
) {}

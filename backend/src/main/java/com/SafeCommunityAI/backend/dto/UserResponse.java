package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.Role;
import java.time.Instant;
import java.util.List;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        String phone,
        boolean enabled,
        boolean accountLocked,
        int failedLoginAttempts,
        Instant lastLoginAt,
        Instant createdAt,
        String organization,
        String certificateFileName,
        String certificateContentType,
        Long certificateSizeBytes,
        String certificateUrl,
        List<ResourceSummaryResponse> resources
) {}

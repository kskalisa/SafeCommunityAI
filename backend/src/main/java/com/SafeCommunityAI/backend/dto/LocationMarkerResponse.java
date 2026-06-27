package com.SafeCommunityAI.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record LocationMarkerResponse(
        Long id,
        Long userId,
        String fullName,
        String role,
        BigDecimal latitude,
        BigDecimal longitude,
        Double accuracyMeters,
        boolean consentProvided,
        Instant capturedAt
) {}

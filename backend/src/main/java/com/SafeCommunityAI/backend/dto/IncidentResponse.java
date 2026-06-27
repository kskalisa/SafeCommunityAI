package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record IncidentResponse(
        Long id,
        String referenceNumber,
        IncidentType type,
        IncidentStatus status,
        PriorityLevel priority,
        Integer priorityScore,
        Double aiConfidenceScore,
        String aiExplanation,
        String resourceSuggestion,
        String severity,
        BigDecimal latitude,
        BigDecimal longitude,
        String manualLocation,
        String description,
        boolean anonymousReport,
        String witnessName,
        String witnessPhone,
        boolean emergencyContactsNotified,
        List<AttachmentResponse> attachments,
        String reporterName,
        Instant reportedAt,
        Instant resolvedAt
) {}

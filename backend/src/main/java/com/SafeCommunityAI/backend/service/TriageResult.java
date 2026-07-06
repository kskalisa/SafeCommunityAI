package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.enums.PriorityLevel;

public record TriageResult(
        int score,
        PriorityLevel level,
        double confidence,
        String explanation,
        String resourceSuggestion,
        String source,
        String model,
        String fallbackReason
) {}

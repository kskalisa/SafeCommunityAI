package com.SafeCommunityAI.backend.dto;

import jakarta.validation.constraints.NotNull;

public record AssignmentRequest(@NotNull Long incidentId, @NotNull Long responderId, Integer etaMinutes) {}

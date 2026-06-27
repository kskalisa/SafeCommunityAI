package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.ResourceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ResourceRequest(@NotBlank String name, @NotBlank String type, @NotNull ResourceStatus status, String location, Long assignedIncidentId) {}

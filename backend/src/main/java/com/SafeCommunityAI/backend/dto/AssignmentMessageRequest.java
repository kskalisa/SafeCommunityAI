package com.SafeCommunityAI.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssignmentMessageRequest(
        @NotBlank(message = "Message is required")
        @Size(max = 1000, message = "Message must be 1000 characters or less")
        String message
) {}

package com.SafeCommunityAI.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record NotificationRequest(@NotBlank String title, @NotBlank String message, Long recipientId) {}

package com.SafeCommunityAI.backend.dto;

import java.time.Instant;

public record NotificationResponse(Long id, String title, String message, boolean broadcast, boolean read, Instant createdAt) {}

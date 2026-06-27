package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.Role;

import java.time.Instant;

public record AssignmentMessageResponse(
        Long id,
        Long assignmentId,
        Long senderId,
        String senderName,
        Role senderRole,
        String message,
        Instant createdAt
) {}

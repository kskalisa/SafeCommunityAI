package com.SafeCommunityAI.backend.dto;

import jakarta.validation.constraints.Size;

public record AttachmentRequest(
        @Size(max = 255, message = "File name must be 255 characters or less")
        String fileName,
        @Size(max = 120, message = "Content type must be 120 characters or less")
        String contentType,
        @Size(max = 500, message = "Attachment URL must be 500 characters or less")
        String url
) {}

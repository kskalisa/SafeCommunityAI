package com.SafeCommunityAI.backend.dto;

public record AttachmentResponse(Long id, String fileName, String contentType, Long sizeBytes, String url) {}

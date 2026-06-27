package com.SafeCommunityAI.backend.service;

public interface AuditService {
    void log(String action, String actorEmail, String entityType, Long entityId, String detail);
}

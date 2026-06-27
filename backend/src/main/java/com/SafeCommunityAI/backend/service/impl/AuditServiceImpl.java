package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.entity.AuditLog;
import com.SafeCommunityAI.backend.repository.AuditLogRepository;
import com.SafeCommunityAI.backend.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {
    private final AuditLogRepository auditLogRepository;

    @Override
    public void log(String action, String actorEmail, String entityType, Long entityId, String detail) {
        auditLogRepository.save(AuditLog.builder().action(action).actorEmail(actorEmail).entityType(entityType).entityId(entityId).detail(detail).build());
    }
}

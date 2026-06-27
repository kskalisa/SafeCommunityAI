package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.Resource;
import com.SafeCommunityAI.backend.enums.ResourceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    long countByStatus(ResourceStatus status);
}

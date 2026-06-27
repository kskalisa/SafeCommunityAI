package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.AssignmentMessage;
import com.SafeCommunityAI.backend.entity.DispatchAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentMessageRepository extends JpaRepository<AssignmentMessage, Long> {
    List<AssignmentMessage> findByAssignmentOrderByCreatedAtAsc(DispatchAssignment assignment);
}

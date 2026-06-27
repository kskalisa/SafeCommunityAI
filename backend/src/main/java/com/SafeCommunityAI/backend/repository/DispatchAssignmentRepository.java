package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.DispatchAssignment;
import com.SafeCommunityAI.backend.entity.Incident;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.ResponderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DispatchAssignmentRepository extends JpaRepository<DispatchAssignment, Long> {
    List<DispatchAssignment> findByResponderOrderByAssignedAtDesc(User responder);
    List<DispatchAssignment> findByIncident(Incident incident);
    long countByResponderAndStatus(User responder, ResponderStatus status);
}

package com.SafeCommunityAI.backend.repository;

import com.SafeCommunityAI.backend.entity.Incident;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.IncidentStatus;
import com.SafeCommunityAI.backend.enums.IncidentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findAllByOrderByReportedAtDesc();
    List<Incident> findByReporterOrderByReportedAtDesc(User reporter);
    List<Incident> findByStatusOrderByReportedAtAsc(IncidentStatus status);
    long countByStatus(IncidentStatus status);
    long countByType(IncidentType type);
    long countByReportedAtBetween(Instant start, Instant end);
}

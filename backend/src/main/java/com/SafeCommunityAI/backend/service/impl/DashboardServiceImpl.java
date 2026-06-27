package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.dto.DashboardResponse;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.*;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.*;
import com.SafeCommunityAI.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {
    private final UserRepository userRepository;
    private final IncidentRepository incidentRepository;
    private final DispatchAssignmentRepository assignmentRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final ResourceRepository resourceRepository;
    private final NotificationRepository notificationRepository;
    private final AppMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse dashboard(String actorEmail) {
        User user = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Map<String, Object> metrics = new HashMap<>();
        switch (user.getRole()) {
            case CITIZEN -> {
                metrics.put("recentIncidents", incidentRepository.findByReporterOrderByReportedAtDesc(user).stream().limit(5).map(mapper::toIncidentResponse).toList());
                metrics.put("activeIncidents", incidentRepository.findByReporterOrderByReportedAtDesc(user).stream().filter(i -> i.getStatus() != IncidentStatus.RESOLVED && i.getStatus() != IncidentStatus.CANCELLED).count());
                metrics.put("unreadNotifications", notificationRepository.countByRecipientAndReadFalse(user));
                metrics.put("averageResponseMinutes", 4);
            }
            case RESPONDER -> {
                metrics.put("assignedIncidents", assignmentRepository.findByResponderOrderByAssignedAtDesc(user).size());
                metrics.put("pendingRequests", assignmentRepository.countByResponderAndStatus(user, ResponderStatus.ASSIGNED));
                metrics.put("completedToday", assignmentRepository.countByResponderAndStatus(user, ResponderStatus.COMPLETED));
            }
            case DISPATCHER -> {
                metrics.put("pendingIncidentQueue", incidentRepository.countByStatus(IncidentStatus.PRIORITIZED));
                metrics.put("activeIncidents", incidentRepository.count() - incidentRepository.countByStatus(IncidentStatus.RESOLVED) - incidentRepository.countByStatus(IncidentStatus.CANCELLED));
                metrics.put("activeResponders", responderProfileRepository.findByAvailabilityStatus(ResponderStatus.AVAILABLE).size());
                metrics.put("availableResources", resourceRepository.countByStatus(ResourceStatus.AVAILABLE));
                metrics.put("averageResponseMinutes", 4);
            }
            case ADMIN -> {
                metrics.put("userCount", userRepository.count());
                metrics.put("incidentCount", incidentRepository.count());
                metrics.put("activeIncidents", incidentRepository.count() - incidentRepository.countByStatus(IncidentStatus.RESOLVED) - incidentRepository.countByStatus(IncidentStatus.CANCELLED));
                metrics.put("respondersOnline", responderProfileRepository.findByAvailabilityStatus(ResponderStatus.AVAILABLE).size());
                metrics.put("usersByRole", Map.of(
                        "CITIZEN", userRepository.countByRole(Role.CITIZEN),
                        "RESPONDER", userRepository.countByRole(Role.RESPONDER),
                        "DISPATCHER", userRepository.countByRole(Role.DISPATCHER),
                        "ADMIN", userRepository.countByRole(Role.ADMIN)
                ));
                Map<String, Long> incidentTypes = new HashMap<>();
                Arrays.stream(IncidentType.values()).forEach(type -> incidentTypes.put(type.name(), incidentRepository.countByType(type)));
                metrics.put("incidentsByType", incidentTypes);
            }
        }
        return new DashboardResponse(user.getRole().name(), metrics);
    }
}

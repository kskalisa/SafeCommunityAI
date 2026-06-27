package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.entity.DispatchAssignment;
import com.SafeCommunityAI.backend.entity.Incident;
import com.SafeCommunityAI.backend.enums.*;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.*;
import com.SafeCommunityAI.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {
    private final UserRepository userRepository;
    private final IncidentRepository incidentRepository;
    private final DispatchAssignmentRepository assignmentRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final ResourceRepository resourceRepository;
    private final AppMapper mapper;

    @Override
    public Map<String, Object> operationsAnalytics() {
        List<Incident> incidents = incidentRepository.findAll();
        List<DispatchAssignment> assignments = assignmentRepository.findAll();
        long activeIncidents = incidents.stream().filter(this::isActive).count();
        long resolvedIncidents = incidents.stream().filter(i -> i.getStatus() == IncidentStatus.RESOLVED).count();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("generatedAt", Instant.now());
        data.put("userCount", userRepository.count());
        data.put("incidentCount", incidents.size());
        data.put("activeIncidents", activeIncidents);
        data.put("resolvedIncidents", resolvedIncidents);
        data.put("pendingIncidentQueue", incidents.stream().filter(i -> i.getStatus() == IncidentStatus.PRIORITIZED).count());
        data.put("activeResponders", responderProfileRepository.findByAvailabilityStatus(ResponderStatus.AVAILABLE).size());
        data.put("availableResources", resourceRepository.countByStatus(ResourceStatus.AVAILABLE));
        data.put("averageResponseMinutes", averageResponseMinutes(incidents));
        data.put("aiAverageConfidence", averageAiConfidence(incidents));
        data.put("usersByRole", usersByRole());
        data.put("incidentsByType", incidentsByType(incidents));
        data.put("incidentsByStatus", incidentsByStatus(incidents));
        data.put("incidentsByPriority", incidentsByPriority(incidents));
        data.put("resourcesByStatus", resourcesByStatus());
        data.put("dailyIncidentTrend", dailyIncidentTrend(incidents));
        data.put("responderPerformance", responderPerformance(assignments));
        data.put("recentIncidents", incidents.stream()
                .sorted(Comparator.comparing(Incident::getReportedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(25)
                .map(mapper::toIncidentResponse)
                .toList());
        return data;
    }

    private boolean isActive(Incident incident) {
        return incident.getStatus() != IncidentStatus.RESOLVED && incident.getStatus() != IncidentStatus.CANCELLED;
    }

    private long averageResponseMinutes(List<Incident> incidents) {
        return Math.round(incidents.stream()
                .filter(i -> i.getReportedAt() != null && i.getResolvedAt() != null)
                .mapToLong(i -> Duration.between(i.getReportedAt(), i.getResolvedAt()).toMinutes())
                .average()
                .orElse(0));
    }

    private double averageAiConfidence(List<Incident> incidents) {
        return incidents.stream()
                .map(Incident::getAiConfidenceScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);
    }

    private Map<String, Long> usersByRole() {
        Map<String, Long> result = new LinkedHashMap<>();
        Arrays.stream(Role.values()).forEach(role -> result.put(role.name(), userRepository.countByRole(role)));
        return result;
    }

    private Map<String, Long> incidentsByType(List<Incident> incidents) {
        Map<String, Long> result = new LinkedHashMap<>();
        Arrays.stream(IncidentType.values()).forEach(type -> result.put(type.name(), incidents.stream().filter(i -> i.getType() == type).count()));
        return result;
    }

    private Map<String, Long> incidentsByStatus(List<Incident> incidents) {
        Map<String, Long> result = new LinkedHashMap<>();
        Arrays.stream(IncidentStatus.values()).forEach(status -> result.put(status.name(), incidents.stream().filter(i -> i.getStatus() == status).count()));
        return result;
    }

    private Map<String, Long> incidentsByPriority(List<Incident> incidents) {
        Map<String, Long> result = new LinkedHashMap<>();
        Arrays.stream(PriorityLevel.values()).forEach(priority -> result.put(priority.name(), incidents.stream().filter(i -> i.getPriority() == priority).count()));
        return result;
    }

    private Map<String, Long> resourcesByStatus() {
        Map<String, Long> result = new LinkedHashMap<>();
        Arrays.stream(ResourceStatus.values()).forEach(status -> result.put(status.name(), resourceRepository.countByStatus(status)));
        return result;
    }

    private List<Map<String, Object>> dailyIncidentTrend(List<Incident> incidents) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return java.util.stream.IntStream.rangeClosed(0, 6)
                .mapToObj(daysAgo -> today.minusDays(6L - daysAgo))
                .map(day -> {
                    Instant start = day.atStartOfDay().toInstant(ZoneOffset.UTC);
                    Instant end = day.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
                    long count = incidents.stream()
                            .filter(i -> i.getReportedAt() != null && !i.getReportedAt().isBefore(start) && i.getReportedAt().isBefore(end))
                            .count();
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("date", day.toString());
                    row.put("incidents", count);
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> responderPerformance(List<DispatchAssignment> assignments) {
        return assignments.stream()
                .filter(a -> a.getResponder() != null)
                .collect(Collectors.groupingBy(a -> a.getResponder().getFullName(), LinkedHashMap::new, Collectors.toList()))
                .entrySet()
                .stream()
                .map(entry -> {
                    List<DispatchAssignment> responderAssignments = entry.getValue();
                    long completed = responderAssignments.stream().filter(a -> a.getStatus() == ResponderStatus.COMPLETED).count();
                    double avgEta = responderAssignments.stream().map(DispatchAssignment::getEtaMinutes).filter(Objects::nonNull).mapToInt(Integer::intValue).average().orElse(0);
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("responder", entry.getKey());
                    row.put("assignments", responderAssignments.size());
                    row.put("completed", completed);
                    row.put("averageEtaMinutes", Math.round(avgEta));
                    return row;
                })
                .toList();
    }
}

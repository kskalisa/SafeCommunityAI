package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.*;
import com.SafeCommunityAI.backend.enums.*;
import com.SafeCommunityAI.backend.exception.BadRequestException;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.*;
import com.SafeCommunityAI.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CoordinationServiceImpl implements CoordinationService {
    private final DispatchAssignmentRepository assignmentRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final ResourceRepository resourceRepository;
    private final LocationUpdateRepository locationUpdateRepository;
    private final AssignmentMessageRepository assignmentMessageRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final AppMapper mapper;

    @Override
    @Transactional
    public Map<String, Object> assign(AssignmentRequest request, String actorEmail) {
        Incident incident = incidentRepository.findById(request.incidentId()).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        User responder = userRepository.findById(request.responderId()).orElseThrow(() -> new ResourceNotFoundException("Responder not found"));
        if (hasActiveAssignment(incident)) {
            throw new BadRequestException("Incident is already assigned");
        }
        if (responder.getRole() != Role.RESPONDER) {
            throw new BadRequestException("Assignments can only be sent to responders");
        }
        ResponderProfile profile = responderProfileRepository.findByUser(responder).orElseThrow(() -> new BadRequestException("Responder profile is incomplete"));
        if (effectiveAvailability(responder, profile) != ResponderStatus.AVAILABLE) {
            throw new BadRequestException("Responder is not currently available");
        }
        DispatchAssignment assignment = assignmentRepository.save(DispatchAssignment.builder()
                .incident(incident).responder(responder).status(ResponderStatus.ASSIGNED).etaMinutes(request.etaMinutes()).build());
        incident.setStatus(IncidentStatus.ASSIGNED);
        incidentRepository.save(incident);
        notificationService.notify(responder, "Incident assigned", incident.getReferenceNumber() + " has been assigned to you");
        auditService.log("RESPONDER_ASSIGNED", actorEmail, "DispatchAssignment", assignment.getId(), incident.getReferenceNumber());
        return assignmentMap(assignment);
    }

    @Override
    @Transactional
    public Map<String, Object> updateAssignment(Long assignmentId, StatusUpdateRequest request, String actorEmail) {
        DispatchAssignment assignment = assignmentRepository.findById(assignmentId).orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        if (request.responderStatus() != null) {
            assignment.setStatus(request.responderStatus());
            responderProfileRepository.findByUser(assignment.getResponder()).ifPresent(profile -> {
                profile.setAvailabilityStatus(request.responderStatus() == ResponderStatus.COMPLETED ? ResponderStatus.AVAILABLE : request.responderStatus());
                responderProfileRepository.save(profile);
            });
            if (request.responderStatus() == ResponderStatus.EN_ROUTE) assignment.getIncident().setStatus(IncidentStatus.EN_ROUTE);
            if (request.responderStatus() == ResponderStatus.ON_SCENE) assignment.getIncident().setStatus(IncidentStatus.ON_SCENE);
            if (request.responderStatus() == ResponderStatus.COMPLETED) {
                assignment.setCompletedAt(Instant.now());
                assignment.getIncident().setStatus(IncidentStatus.RESOLVED);
                assignment.getIncident().setResolvedAt(Instant.now());
                freeResponderResources(assignment.getResponder(), assignment.getIncident());
            }
        }
        if (request.reason() != null) assignment.setRejectionReason(request.reason());
        incidentRepository.save(assignment.getIncident());
        assignment = assignmentRepository.save(assignment);
        auditService.log("RESPONDER_STATUS_CHANGED", actorEmail, "DispatchAssignment", assignment.getId(), String.valueOf(assignment.getStatus()));
        return assignmentMap(assignment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> myAssignments(String actorEmail) {
        User responder = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("Responder not found"));
        return assignmentRepository.findByResponderOrderByAssignedAtDesc(responder).stream().map(this::assignmentMap).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispatchRecommendationResponse> recommendations(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        if (hasActiveAssignment(incident)) {
            return List.of();
        }
        return userRepository.findByRole(Role.RESPONDER).stream()
                .filter(responder -> responder.isEnabled() && !responder.isAccountLocked())
                .map(responder -> recommendationFor(incident, responder))
                .filter(recommendation -> recommendation.availabilityStatus() == ResponderStatus.AVAILABLE)
                .sorted((a, b) -> Integer.compare(b.score(), a.score()))
                .limit(8)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RouteResponse routeForAssignment(Long assignmentId) {
        DispatchAssignment assignment = assignmentRepository.findById(assignmentId).orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        Incident incident = assignment.getIncident();
        LocationUpdate origin = locationUpdateRepository.findTopByUserOrderByCapturedAtDesc(assignment.getResponder())
                .orElseThrow(() -> new BadRequestException("Responder location is not available yet"));
        if (incident.getLatitude() == null || incident.getLongitude() == null) {
            throw new BadRequestException("Incident GPS location is not available");
        }
        double originLat = origin.getLatitude().doubleValue();
        double originLng = origin.getLongitude().doubleValue();
        double destLat = incident.getLatitude().doubleValue();
        double destLng = incident.getLongitude().doubleValue();
        double distance = distanceKm(originLat, originLng, destLat, destLng);
        int eta = Math.max(2, (int) Math.round((distance / 35.0) * 60));
        List<RoutePoint> geometry = routeGeometry(originLat, originLng, destLat, destLng);
        List<String> instructions = List.of(
                "Start from the responder's latest shared GPS location.",
                "Take the fastest available corridor toward " + (incident.getManualLocation() == null ? "the incident coordinates" : incident.getManualLocation()) + ".",
                "Keep dispatch updated when en route, on scene, and complete.",
                "Arrive at " + incident.getReferenceNumber() + " and confirm scene status."
        );
        return new RouteResponse(originLat, originLng, destLat, destLng, Math.round(distance * 10.0) / 10.0, eta, "SafeCommunityAI internal route optimizer", geometry, instructions);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentMessageResponse> assignmentMessages(Long assignmentId, String actorEmail) {
        User actor = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        DispatchAssignment assignment = assignmentRepository.findById(assignmentId).orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        validateAssignmentAccess(assignment, actor);
        return assignmentMessageRepository.findByAssignmentOrderByCreatedAtAsc(assignment).stream().map(this::messageResponse).toList();
    }

    @Override
    @Transactional
    public AssignmentMessageResponse sendAssignmentMessage(Long assignmentId, AssignmentMessageRequest request, String actorEmail) {
        User actor = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        DispatchAssignment assignment = assignmentRepository.findById(assignmentId).orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        validateAssignmentAccess(assignment, actor);
        AssignmentMessage message = assignmentMessageRepository.save(AssignmentMessage.builder()
                .assignment(assignment)
                .sender(actor)
                .message(request.message().trim())
                .build());
        auditService.log("ASSIGNMENT_MESSAGE_SENT", actorEmail, "DispatchAssignment", assignment.getId(), assignment.getIncident().getReferenceNumber());
        return messageResponse(message);
    }

    @Override
    @Transactional
    public void updateLocation(LocationRequest request, String actorEmail) {
        User user = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        locationUpdateRepository.save(LocationUpdate.builder().user(user).latitude(request.latitude()).longitude(request.longitude()).accuracyMeters(request.accuracyMeters()).consentProvided(request.consentProvided()).build());
        auditService.log("LOCATION_UPDATED", actorEmail, "User", user.getId(), "Live location updated");
    }

    private boolean hasActiveAssignment(Incident incident) {
        return assignmentRepository.findByIncident(incident).stream()
                .anyMatch(assignment -> assignment.getStatus() != ResponderStatus.COMPLETED && assignment.getStatus() != ResponderStatus.OFFLINE);
    }
    private DispatchRecommendationResponse recommendationFor(Incident incident, User responder) {
        ResponderProfile profile = responderProfileRepository.findByUser(responder).orElse(null);
        LocationUpdate location = locationUpdateRepository.findTopByUserOrderByCapturedAtDesc(responder).orElse(null);
        double distance = (incident.getLatitude() == null || incident.getLongitude() == null || location == null)
                ? 999
                : distanceKm(incident.getLatitude().doubleValue(), incident.getLongitude().doubleValue(), location.getLatitude().doubleValue(), location.getLongitude().doubleValue());
        int eta = distance >= 999 ? priorityFallbackEta(incident.getPriority()) : Math.max(2, (int) Math.round((distance / 35.0) * 60));
        ResponderStatus status = effectiveAvailability(responder, profile);
        List<ResourceSummaryResponse> resources = profile == null ? List.of() : profile.getResources().stream().map(mapper::toResourceSummary).toList();
        long matchingAvailableResources = profile == null ? 0 : profile.getResources().stream()
                .filter(resource -> resourceMatchesIncident(resource, incident))
                .count();
        int score = scoreRecommendation(incident, status, distance, matchingAvailableResources, resources.size());
        String reason = recommendationReason(incident, status, distance, matchingAvailableResources, resources.size());
        return new DispatchRecommendationResponse(responder.getId(), responder.getFullName(), profile == null ? null : profile.getOrganization(), resources, status, Math.round(distance * 10.0) / 10.0, eta, score, reason);
    }

    private ResponderStatus effectiveAvailability(User responder, ResponderProfile profile) {
        if (profile == null || !responder.isEnabled() || responder.isAccountLocked()) {
            return ResponderStatus.OFFLINE;
        }
        ResponderStatus storedStatus = profile.getAvailabilityStatus() == null ? ResponderStatus.OFFLINE : profile.getAvailabilityStatus();
        if (storedStatus == ResponderStatus.AVAILABLE) {
            return ResponderStatus.AVAILABLE;
        }
        boolean hasResource = !profile.getResources().isEmpty();
        if (hasResource && (storedStatus == ResponderStatus.OFFLINE || storedStatus == ResponderStatus.ASSIGNED || storedStatus == ResponderStatus.EN_ROUTE || storedStatus == ResponderStatus.ON_SCENE || storedStatus == ResponderStatus.TRANSPORTING)) {
            return ResponderStatus.AVAILABLE;
        }
        return storedStatus;
    }
    private int scoreRecommendation(Incident incident, ResponderStatus status, double distance, long matchingResources, int resourceCount) {
        int score = switch (status) {
            case AVAILABLE -> 45;
            case ASSIGNED, EN_ROUTE, ON_SCENE, TRANSPORTING -> 12;
            default -> 0;
        };
        score += switch (incident.getPriority()) {
            case CRITICAL -> 15;
            case HIGH -> 11;
            case MEDIUM -> 7;
            case LOW -> 4;
        };
        if (matchingResources > 0) score += 30;
        else if (resourceCount > 0) score += 8;
        if (distance < 999) score += Math.max(0, 25 - (int) Math.round(distance * 2));
        return Math.min(score, 100);
    }

    private String recommendationReason(Incident incident, ResponderStatus status, double distance, long matchingResources, int resourceCount) {
        String resourcePart = matchingResources > 0
                ? "has matching available resources for " + incident.getType().name().replace('_', ' ').toLowerCase(Locale.ROOT)
                : resourceCount > 0 ? "has resources, but none are a direct type match" : "has no assigned resources";
        String locationPart = distance >= 999 ? "no recent GPS fix" : Math.round(distance * 10.0) / 10.0 + " km from the incident";
        return label(status.name()) + ", " + resourcePart + ", " + locationPart + ".";
    }

    private boolean resourceMatchesIncident(Resource resource, Incident incident) {
        String haystack = ((resource.getType() == null ? "" : resource.getType()) + " " + (resource.getName() == null ? "" : resource.getName())).toLowerCase(Locale.ROOT);
        return switch (incident.getType()) {
            case MEDICAL -> containsAny(haystack, "ambulance", "ems", "medical", "paramedic", "first aid");
            case FIRE -> containsAny(haystack, "fire", "truck", "engine", "rescue");
            case ACCIDENT -> containsAny(haystack, "ambulance", "police", "traffic", "rescue", "tow");
            case CRIME -> containsAny(haystack, "police", "security", "patrol");
            case NATURAL_DISASTER -> containsAny(haystack, "rescue", "truck", "ambulance", "fire", "shelter", "boat");
            case OTHER -> resource.getStatus() == ResourceStatus.AVAILABLE;
        };
    }

    private boolean containsAny(String value, String... terms) {
        for (String term : terms) {
            if (value.contains(term)) return true;
        }
        return false;
    }

    private int priorityFallbackEta(PriorityLevel priority) {
        return switch (priority) {
            case CRITICAL -> 8;
            case HIGH -> 12;
            case MEDIUM -> 18;
            case LOW -> 25;
        };
    }

    private void freeResponderResources(User responder, Incident incident) {
        responderProfileRepository.findByUser(responder).ifPresent(profile -> profile.getResources().stream()
                .filter(resource -> resource.getAssignedIncident() != null && resource.getAssignedIncident().getId().equals(incident.getId()))
                .forEach(resource -> {
                    resource.setStatus(ResourceStatus.AVAILABLE);
                    resource.setAssignedIncident(null);
                    resourceRepository.save(resource);
                }));
    }

    private Map<String, Object> assignmentMap(DispatchAssignment assignment) {
        Incident incident = assignment.getIncident();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", assignment.getId());
        response.put("incidentId", incident.getId());
        response.put("referenceNumber", incident.getReferenceNumber());
        response.put("type", incident.getType());
        response.put("priority", incident.getPriority());
        response.put("incidentStatus", incident.getStatus());
        response.put("responderStatus", assignment.getStatus());
        response.put("location", incident.getManualLocation() == null ? "GPS location" : incident.getManualLocation());
        response.put("description", incident.getDescription() == null ? "" : incident.getDescription());
        response.put("etaMinutes", assignment.getEtaMinutes() == null ? 0 : assignment.getEtaMinutes());
        response.put("assignedAt", assignment.getAssignedAt());
        response.put("latitude", incident.getLatitude());
        response.put("longitude", incident.getLongitude());
        response.put("reporterName", incident.isAnonymousReport() || incident.getReporter() == null ? "Anonymous" : incident.getReporter().getFullName());
        response.put("reporterPhone", incident.isAnonymousReport() || incident.getReporter() == null ? null : incident.getReporter().getPhone());
        response.put("anonymousReport", incident.isAnonymousReport());
        return response;
    }

    private void validateAssignmentAccess(DispatchAssignment assignment, User actor) {
        boolean assignedResponder = assignment.getResponder() != null && assignment.getResponder().getId().equals(actor.getId());
        boolean coordinationRole = actor.getRole() == Role.DISPATCHER || actor.getRole() == Role.ADMIN;
        if (!assignedResponder && !coordinationRole) {
            throw new BadRequestException("You are not allowed to access this assignment.");
        }
    }

    private AssignmentMessageResponse messageResponse(AssignmentMessage message) {
        User sender = message.getSender();
        return new AssignmentMessageResponse(
                message.getId(),
                message.getAssignment().getId(),
                sender.getId(),
                sender.getFullName(),
                sender.getRole(),
                message.getMessage(),
                message.getCreatedAt()
        );
    }

    private double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double earthKm = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private List<RoutePoint> routeGeometry(double originLat, double originLng, double destLat, double destLng) {
        double midLat = (originLat + destLat) / 2;
        double midLng = (originLng + destLng) / 2;
        double offsetLat = (destLng - originLng) * 0.08;
        double offsetLng = (originLat - destLat) * 0.08;
        return List.of(
                new RoutePoint(originLat, originLng),
                new RoutePoint((originLat + midLat) / 2, (originLng + midLng) / 2),
                new RoutePoint(midLat + offsetLat, midLng + offsetLng),
                new RoutePoint((destLat + midLat) / 2, (destLng + midLng) / 2),
                new RoutePoint(destLat, destLng)
        );
    }

    private String label(String value) {
        return value.replace('_', ' ').toLowerCase(Locale.ROOT);
    }
}

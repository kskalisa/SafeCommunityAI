package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.Incident;
import com.SafeCommunityAI.backend.entity.IncidentAttachment;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.*;
import com.SafeCommunityAI.backend.exception.BadRequestException;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.IncidentRepository;
import com.SafeCommunityAI.backend.repository.IncidentAttachmentRepository;
import com.SafeCommunityAI.backend.repository.UserRepository;
import com.SafeCommunityAI.backend.repository.EmergencyContactRepository;
import com.SafeCommunityAI.backend.service.AuditService;
import com.SafeCommunityAI.backend.service.IncidentService;
import com.SafeCommunityAI.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class IncidentServiceImpl implements IncidentService {
    private static final int MAX_ATTACHMENT_COUNT = 5;
    private static final long MAX_ATTACHMENT_BYTES = 25L * 1024L * 1024L;
    private static final List<String> ALLOWED_ATTACHMENT_PREFIXES = List.of("image/", "video/");

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final AppMapper mapper;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final EmergencyContactRepository emergencyContactRepository;
    private final IncidentAttachmentRepository incidentAttachmentRepository;

    @Override
    @Transactional
    public IncidentResponse createIncident(IncidentRequest request, String actorEmail) {
        validateIncidentRequest(request);
        User reporter = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("Reporter not found"));
        PriorityResult priority = score(request);
        Incident incident = Incident.builder()
                .referenceNumber("INC-" + System.currentTimeMillis())
                .type(request.type())
                .status(IncidentStatus.PRIORITIZED)
                .priority(priority.level())
                .priorityScore(priority.score())
                .aiConfidenceScore(priority.confidence())
                .aiExplanation(priority.explanation())
                .resourceSuggestion(priority.resourceSuggestion())
                .severity(request.severity())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .manualLocation(request.manualLocation())
                .description(request.description())
                .anonymousReport(request.anonymousReport())
                .witnessName(request.witnessName())
                .witnessPhone(request.witnessPhone())
                .emergencyContactsNotified(request.notifyEmergencyContacts())
                .reporter(reporter)
                .build();
        if (request.attachments() != null) {
            for (AttachmentRequest attachment : request.attachments()) {
                if (attachment.fileName() != null && !attachment.fileName().isBlank()) {
                    incident.getAttachments().add(IncidentAttachment.builder()
                            .incident(incident)
                            .fileName(attachment.fileName())
                            .contentType(attachment.contentType())
                            .url(attachment.url())
                            .build());
                }
            }
        }
        Incident savedIncident = incidentRepository.save(incident);
        notificationService.broadcast("New incident reported", savedIncident.getReferenceNumber() + " requires dispatcher review");
        if (request.notifyEmergencyContacts()) {
            String referenceNumber = savedIncident.getReferenceNumber();
            emergencyContactRepository.findByOwnerAndNotifyOnEmergencyTrue(reporter)
                    .forEach(contact -> notificationService.broadcast("Emergency contact notice", reporter.getFullName() + " reported " + referenceNumber + ". Contact: " + contact.getName()));
        }
        auditService.log("INCIDENT_CREATED", actorEmail, "Incident", savedIncident.getId(), savedIncident.getType().name());
        return mapper.toIncidentResponse(savedIncident);
    }

    @Override
    @Transactional
    public IncidentResponse createPanicIncident(LocationRequest request, String actorEmail) {
        return createIncident(new IncidentRequest(IncidentType.OTHER, "critical", request.latitude(), request.longitude(), "GPS panic alert", "Panic button emergency alert", false, null, null, true, List.of()), actorEmail);
    }

    @Override
    @Transactional(readOnly = true)
    public List<IncidentResponse> myIncidents(String actorEmail) {
        User reporter = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("Reporter not found"));
        return incidentRepository.findByReporterOrderByReportedAtDesc(reporter).stream().map(mapper::toIncidentResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<IncidentResponse> queue() {
        return incidentRepository.findAll().stream()
                .filter(i -> i.getStatus() != IncidentStatus.RESOLVED && i.getStatus() != IncidentStatus.CANCELLED)
                .sorted(Comparator.comparing(Incident::getPriorityScore, Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(Incident::getReportedAt))
                .map(mapper::toIncidentResponse)
                .toList();
    }

    @Override
    @Transactional
    public IncidentResponse updateIncident(Long id, IncidentRequest request, String actorEmail) {
        validateIncidentRequest(request);
        User actor = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Incident incident = incidentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        validateCitizenCanManage(incident, actor, "edit");

        PriorityResult priority = score(request);
        incident.setType(request.type());
        incident.setSeverity(request.severity());
        incident.setLatitude(request.latitude());
        incident.setLongitude(request.longitude());
        incident.setManualLocation(request.manualLocation());
        incident.setDescription(request.description());
        incident.setAnonymousReport(request.anonymousReport());
        incident.setWitnessName(request.witnessName());
        incident.setWitnessPhone(request.witnessPhone());
        incident.setEmergencyContactsNotified(request.notifyEmergencyContacts());
        incident.setPriority(priority.level());
        incident.setPriorityScore(priority.score());
        incident.setAiConfidenceScore(priority.confidence());
        incident.setAiExplanation(priority.explanation());
        incident.setResourceSuggestion(priority.resourceSuggestion());

        incident = incidentRepository.save(incident);
        auditService.log("INCIDENT_EDITED", actorEmail, "Incident", incident.getId(), incident.getType().name());
        return mapper.toIncidentResponse(incident);
    }

    @Override
    @Transactional
    public void deleteIncident(Long id, String actorEmail) {
        User actor = userRepository.findByEmail(actorEmail).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Incident incident = incidentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        validateCitizenCanManage(incident, actor, "delete");
        incidentRepository.delete(incident);
        auditService.log("INCIDENT_DELETED", actorEmail, "Incident", id, incident.getReferenceNumber());
    }

    @Override
    @Transactional
    public IncidentResponse updateStatus(Long id, StatusUpdateRequest request, String actorEmail) {
        Incident incident = incidentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        if (request.incidentStatus() != null) {
            incident.setStatus(request.incidentStatus());
            if (request.incidentStatus() == IncidentStatus.RESOLVED) {
                incident.setResolvedAt(Instant.now());
            }
        }
        if (request.reason() != null && !request.reason().isBlank()) {
            incident.setPriorityOverrideReason(request.reason());
        }
        incident = incidentRepository.save(incident);
        auditService.log("INCIDENT_UPDATED", actorEmail, "Incident", incident.getId(), String.valueOf(incident.getStatus()));
        return mapper.toIncidentResponse(incident);
    }

    @Override
    @Transactional
    public List<AttachmentResponse> uploadAttachments(Long incidentId, MultipartFile[] files, String actorEmail) {
        Incident incident = incidentRepository.findById(incidentId).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        validateAttachmentUpload(incident, files);
        List<IncidentAttachment> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            try {
                IncidentAttachment attachment = IncidentAttachment.builder()
                        .incident(incident)
                        .fileName(file.getOriginalFilename())
                        .contentType(file.getContentType())
                        .sizeBytes(file.getSize())
                        .data(file.getBytes())
                        .build();
                attachment = incidentAttachmentRepository.save(attachment);
                attachment.setUrl("/api/incidents/attachments/" + attachment.getId() + "/download");
                saved.add(incidentAttachmentRepository.save(attachment));
            } catch (IOException exception) {
                throw new BadRequestException("Unable to store attachment");
            }
        }
        auditService.log("INCIDENT_ATTACHMENT_UPLOADED", actorEmail, "Incident", incident.getId(), String.valueOf(saved.size()));
        return saved.stream().map(mapper::toAttachmentResponse).toList();
    }

    private void validateIncidentRequest(IncidentRequest request) {
        boolean hasDescription = hasText(request.description()) && request.description().trim().length() >= 12;
        boolean hasManualLocation = hasText(request.manualLocation());
        boolean hasGps = request.latitude() != null && request.longitude() != null;
        if (!hasDescription) {
            throw new BadRequestException("Please describe what happened using at least 12 characters.");
        }
        if (!hasManualLocation && !hasGps) {
            throw new BadRequestException("Please provide GPS coordinates or enter the incident location manually.");
        }
        if (hasText(request.witnessPhone()) && !hasText(request.witnessName())) {
            throw new BadRequestException("Please add the witness name or remove the witness phone number.");
        }
    }

    private void validateAttachmentUpload(Incident incident, MultipartFile[] files) {
        if (files == null || files.length == 0) {
            throw new BadRequestException("Please choose at least one evidence file.");
        }
        long existingCount = incident.getAttachments().stream().filter(attachment -> attachment.getData() != null || hasText(attachment.getUrl())).count();
        if (existingCount + files.length > MAX_ATTACHMENT_COUNT) {
            throw new BadRequestException("Only five evidence files can be attached to one report.");
        }
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                throw new BadRequestException("Evidence files cannot be empty.");
            }
            if (file.getSize() > MAX_ATTACHMENT_BYTES) {
                throw new BadRequestException("Each evidence file must be 25 MB or smaller.");
            }
            String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
            boolean allowedType = ALLOWED_ATTACHMENT_PREFIXES.stream().anyMatch(contentType::startsWith);
            if (!allowedType) {
                throw new BadRequestException("Only photo and video evidence files are supported.");
            }
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void validateCitizenCanManage(Incident incident, User actor, String action) {
        boolean admin = actor.getRole() == Role.ADMIN;
        boolean owner = incident.getReporter() != null && incident.getReporter().getId().equals(actor.getId());
        if (!admin && !owner) {
            throw new BadRequestException("You can only " + action + " your own incident reports.");
        }
        if (!canCitizenManageStatus(incident.getStatus())) {
            String actionLabel = "delete".equals(action) ? "deleted" : action + "ed";
            throw new BadRequestException("This report is already being handled and can no longer be " + actionLabel + ".");
        }
    }

    private boolean canCitizenManageStatus(IncidentStatus status) {
        return status == IncidentStatus.PENDING || status == IncidentStatus.PRIORITIZED;
    }

    private PriorityResult score(IncidentRequest request) {
        List<String> factors = new ArrayList<>();
        int score = switch (request.type()) {
            case MEDICAL, FIRE -> {
                factors.add("High-risk incident type");
                yield 80;
            }
            case ACCIDENT, CRIME, NATURAL_DISASTER -> {
                factors.add("Potentially escalating incident type");
                yield 65;
            }
            case OTHER -> {
                factors.add("General emergency report");
                yield 40;
            }
        };
        String text = ((request.severity() == null ? "" : request.severity()) + " " + (request.description() == null ? "" : request.description())).toLowerCase(Locale.ROOT);
        if (text.matches(".*(unconscious|breathing|weapon|bleeding|trapped|explosion|critical).*")) {
            score += 20;
            factors.add("Critical keywords found in severity or description");
        }
        if (request.latitude() != null && request.longitude() != null) {
            score += 5;
            factors.add("GPS coordinates available for faster dispatch");
        }
        PriorityLevel level = score >= 90 ? PriorityLevel.CRITICAL : score >= 70 ? PriorityLevel.HIGH : score >= 45 ? PriorityLevel.MEDIUM : PriorityLevel.LOW;
        String resourceSuggestion = switch (request.type()) {
            case MEDICAL -> "Ambulance and nearest hospital handoff";
            case FIRE -> "Fire unit and ambulance standby";
            case ACCIDENT -> "Ambulance plus traffic/police support";
            case CRIME -> "Police unit with responder safety check";
            case NATURAL_DISASTER -> "Multi-agency response team";
            case OTHER -> "Dispatcher review for best available resource";
        };
        return new PriorityResult(Math.min(score, 100), level, Math.min(0.98, 0.55 + score / 200.0), String.join("; ", factors), resourceSuggestion);
    }

    private record PriorityResult(int score, PriorityLevel level, double confidence, String explanation, String resourceSuggestion) {}
}

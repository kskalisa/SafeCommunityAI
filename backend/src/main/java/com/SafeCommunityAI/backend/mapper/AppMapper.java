package com.SafeCommunityAI.backend.mapper;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.*;
import com.SafeCommunityAI.backend.enums.Role;
import com.SafeCommunityAI.backend.enums.ResponderStatus;
import com.SafeCommunityAI.backend.repository.DispatchAssignmentRepository;
import com.SafeCommunityAI.backend.repository.ResponderProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AppMapper {
    private final DispatchAssignmentRepository assignmentRepository;
    private final ResponderProfileRepository responderProfileRepository;

    public UserResponse toUserResponse(User user) {
        ResponderProfile profile = user.getRole() == Role.RESPONDER ? responderProfileRepository.findByUser(user).orElse(null) : null;
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getPhone(),
                user.isEnabled(),
                user.isAccountLocked(),
                user.getFailedLoginAttempts(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                profile == null ? null : profile.getOrganization(),
                profile == null ? null : profile.getCertificateFileName(),
                profile == null ? null : profile.getCertificateContentType(),
                profile == null ? null : profile.getCertificateSizeBytes(),
                profile == null || profile.getCertificateDataBase64() == null ? null : "/api/users/responders/" + user.getId() + "/certificate",
                profile == null ? List.of() : profile.getResources().stream().map(this::toResourceSummary).toList()
        );
    }

    public ResourceSummaryResponse toResourceSummary(Resource resource) {
        return new ResourceSummaryResponse(resource.getId(), resource.getName(), resource.getType(), resource.getStatus(), resource.getLocation());
    }

    public IncidentResponse toIncidentResponse(Incident incident) {
        String reporterName = incident.isAnonymousReport() || incident.getReporter() == null ? "Anonymous" : incident.getReporter().getFullName();
        DispatchAssignment assignment = assignmentRepository.findByIncident(incident).stream()
                .filter(item -> item.getStatus() != ResponderStatus.COMPLETED && item.getStatus() != ResponderStatus.OFFLINE)
                .max(java.util.Comparator.comparing(DispatchAssignment::getAssignedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .orElse(null);
        User responder = assignment == null ? null : assignment.getResponder();
        return new IncidentResponse(
                incident.getId(), incident.getReferenceNumber(), incident.getType(), incident.getStatus(), incident.getPriority(),
                incident.getPriorityScore(), incident.getAiConfidenceScore(), incident.getAiExplanation(), incident.getResourceSuggestion(),
                incident.getAiSource(), incident.getAiModel(), incident.getAiFallbackReason(),
                incident.getSeverity(), incident.getLatitude(), incident.getLongitude(),
                incident.getManualLocation(), incident.getDescription(), incident.isAnonymousReport(), incident.getWitnessName(), incident.getWitnessPhone(),
                Boolean.TRUE.equals(incident.getEmergencyContactsNotified()), incident.getAttachments().stream().map(this::toAttachmentResponse).toList(),
                reporterName,
                assignment == null ? null : assignment.getId(),
                responder == null ? null : responder.getId(),
                responder == null ? null : responder.getFullName(),
                responder == null ? null : responder.getEmail(),
                assignment == null ? null : assignment.getStatus(),
                assignment == null ? null : assignment.getEtaMinutes(),
                assignment == null ? null : assignment.getAssignedAt(),
                incident.getReportedAt(), incident.getResolvedAt()
        );
    }

    public AttachmentResponse toAttachmentResponse(IncidentAttachment attachment) {
        return new AttachmentResponse(attachment.getId(), attachment.getFileName(), attachment.getContentType(), attachment.getSizeBytes(), attachment.getUrl());
    }

    public NotificationResponse toNotificationResponse(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getTitle(), notification.getMessage(), notification.isBroadcast(), notification.isRead(), notification.getCreatedAt());
    }

    public HospitalResponse toHospitalResponse(Hospital hospital) {
        return new HospitalResponse(
                hospital.getId(), hospital.getName(), hospital.getAddress(), hospital.getContact(), hospital.getLatitude(), hospital.getLongitude(),
                hospital.getErBeds(), hospital.getIcuBeds(), hospital.getGeneralBeds(), hospital.isTraumaCenter(), hospital.isAmbulanceDiversion(),
                hospital.getAvgHandoffMinutes(), hospital.getPatientsReceivedToday(), hospital.getHandoffNotes()
        );
    }
}

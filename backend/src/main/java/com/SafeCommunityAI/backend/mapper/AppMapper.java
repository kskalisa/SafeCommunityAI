package com.SafeCommunityAI.backend.mapper;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.*;
import org.springframework.stereotype.Component;

@Component
public class AppMapper {
    public UserResponse toUserResponse(User user) {
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
                user.getCreatedAt()
        );
    }

    public IncidentResponse toIncidentResponse(Incident incident) {
        String reporterName = incident.isAnonymousReport() || incident.getReporter() == null ? "Anonymous" : incident.getReporter().getFullName();
        return new IncidentResponse(
                incident.getId(), incident.getReferenceNumber(), incident.getType(), incident.getStatus(), incident.getPriority(),
                incident.getPriorityScore(), incident.getAiConfidenceScore(), incident.getAiExplanation(), incident.getResourceSuggestion(),
                incident.getSeverity(), incident.getLatitude(), incident.getLongitude(),
                incident.getManualLocation(), incident.getDescription(), incident.isAnonymousReport(), incident.getWitnessName(), incident.getWitnessPhone(),
                Boolean.TRUE.equals(incident.getEmergencyContactsNotified()), incident.getAttachments().stream().map(this::toAttachmentResponse).toList(),
                reporterName, incident.getReportedAt(), incident.getResolvedAt()
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

package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.dto.*;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface IncidentService {
    IncidentResponse createIncident(IncidentRequest request, String actorEmail);
    IncidentResponse createPanicIncident(LocationRequest request, String actorEmail);
    List<IncidentResponse> myIncidents(String actorEmail);
    List<IncidentResponse> queue();
    IncidentResponse updateIncident(Long id, IncidentRequest request, String actorEmail);
    void deleteIncident(Long id, String actorEmail);
    IncidentResponse updateStatus(Long id, StatusUpdateRequest request, String actorEmail);
    List<AttachmentResponse> uploadAttachments(Long incidentId, MultipartFile[] files, String actorEmail);
}

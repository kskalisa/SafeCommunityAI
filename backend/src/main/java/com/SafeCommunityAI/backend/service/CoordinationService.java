package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.dto.*;
import java.util.List;
import java.util.Map;

public interface CoordinationService {
    Map<String, Object> assign(AssignmentRequest request, String actorEmail);
    Map<String, Object> updateAssignment(Long assignmentId, StatusUpdateRequest request, String actorEmail);
    List<Map<String, Object>> myAssignments(String actorEmail);
    List<DispatchRecommendationResponse> recommendations(Long incidentId);
    RouteResponse routeForAssignment(Long assignmentId);
    List<AssignmentMessageResponse> assignmentMessages(Long assignmentId, String actorEmail);
    AssignmentMessageResponse sendAssignmentMessage(Long assignmentId, AssignmentMessageRequest request, String actorEmail);
    void updateLocation(LocationRequest request, String actorEmail);
}

package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.IncidentStatus;
import com.SafeCommunityAI.backend.enums.ResponderStatus;

public record StatusUpdateRequest(IncidentStatus incidentStatus, ResponderStatus responderStatus, String reason) {}

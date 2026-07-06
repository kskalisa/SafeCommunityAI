package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.dto.IncidentRequest;

public interface AiTriageService {
    TriageResult analyze(IncidentRequest request, TriageResult fallback);
}

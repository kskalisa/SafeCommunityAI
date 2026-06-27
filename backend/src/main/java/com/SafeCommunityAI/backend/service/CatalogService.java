package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.dto.*;
import java.util.List;

public interface CatalogService {
    List<?> resources();
    Object saveResource(ResourceRequest request);
    Object updateResource(Long id, ResourceRequest request);
    void deleteResource(Long id);
    List<?> hospitals(String query);
    Object saveHospital(HospitalRequest request);
    Object updateHospital(Long id, HospitalRequest request);
    Object notifyHospital(Long id, String message);
}

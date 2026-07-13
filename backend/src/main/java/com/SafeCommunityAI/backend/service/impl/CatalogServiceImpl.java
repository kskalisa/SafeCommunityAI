package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.Hospital;
import com.SafeCommunityAI.backend.entity.Incident;
import com.SafeCommunityAI.backend.entity.Resource;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.*;
import com.SafeCommunityAI.backend.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogServiceImpl implements CatalogService {
    private final ResourceRepository resourceRepository;
    private final HospitalRepository hospitalRepository;
    private final IncidentRepository incidentRepository;
    private final AppMapper mapper;

    @Override
    public List<?> resources() {
        return resourceRepository.findAll().stream().map(mapper::toResourceSummary).toList();
    }

    @Override
    public Object saveResource(ResourceRequest request) {
        Incident incident = request.assignedIncidentId() == null ? null : incidentRepository.findById(request.assignedIncidentId()).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        Resource resource = resourceRepository.save(Resource.builder().name(request.name()).type(request.type()).status(request.status()).location(request.location()).assignedIncident(incident).build());
        return mapper.toResourceSummary(resource);
    }

    @Override
    public Object updateResource(Long id, ResourceRequest request) {
        Resource resource = resourceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        Incident incident = request.assignedIncidentId() == null ? null : incidentRepository.findById(request.assignedIncidentId()).orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        resource.setName(request.name());
        resource.setType(request.type());
        resource.setStatus(request.status());
        resource.setLocation(request.location());
        resource.setAssignedIncident(incident);
        return mapper.toResourceSummary(resourceRepository.save(resource));
    }

    @Override
    public void deleteResource(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found");
        }
        resourceRepository.deleteById(id);
    }

    @Override
    public List<?> hospitals(String query) {
        List<Hospital> hospitals = (query == null || query.isBlank()) ? hospitalRepository.findAll() : hospitalRepository.findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(query, query);
        return hospitals.stream().map(mapper::toHospitalResponse).toList();
    }

    @Override
    public Object saveHospital(HospitalRequest request) {
        Hospital hospital = new Hospital();
        applyHospitalRequest(hospital, request);
        return mapper.toHospitalResponse(hospitalRepository.save(hospital));
    }

    @Override
    public Object updateHospital(Long id, HospitalRequest request) {
        Hospital hospital = hospitalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));
        applyHospitalRequest(hospital, request);
        return mapper.toHospitalResponse(hospitalRepository.save(hospital));
    }

    @Override
    public Object notifyHospital(Long id, String message) {
        Hospital hospital = hospitalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hospital not found"));
        String existing = hospital.getHandoffNotes() == null ? "" : hospital.getHandoffNotes() + "\n";
        hospital.setHandoffNotes(existing + "Pre-hospital notice: " + message);
        hospital.setPatientsReceivedToday((hospital.getPatientsReceivedToday() == null ? 0 : hospital.getPatientsReceivedToday()) + 1);
        return mapper.toHospitalResponse(hospitalRepository.save(hospital));
    }

    private void applyHospitalRequest(Hospital hospital, HospitalRequest request) {
        hospital.setName(request.name());
        hospital.setAddress(request.address());
        hospital.setContact(request.contact());
        hospital.setLatitude(request.latitude());
        hospital.setLongitude(request.longitude());
        hospital.setErBeds(request.erBeds());
        hospital.setIcuBeds(request.icuBeds());
        hospital.setGeneralBeds(request.generalBeds());
        hospital.setTraumaCenter(request.traumaCenter());
        hospital.setAmbulanceDiversion(request.ambulanceDiversion());
        hospital.setAvgHandoffMinutes(request.avgHandoffMinutes());
        hospital.setPatientsReceivedToday(request.patientsReceivedToday());
        hospital.setHandoffNotes(request.handoffNotes());
    }
}

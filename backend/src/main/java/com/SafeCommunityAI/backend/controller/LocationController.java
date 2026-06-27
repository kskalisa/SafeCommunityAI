package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.LocationMarkerResponse;
import com.SafeCommunityAI.backend.dto.LocationRequest;
import com.SafeCommunityAI.backend.entity.LocationUpdate;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.repository.LocationUpdateRepository;
import com.SafeCommunityAI.backend.service.CoordinationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {
    private final CoordinationService coordinationService;
    private final LocationUpdateRepository locationUpdateRepository;

    @PostMapping("/me")
    public ResponseEntity<Void> update(@Valid @RequestBody LocationRequest request, @AuthenticationPrincipal User user) {
        coordinationService.updateLocation(request, user.getEmail());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/markers")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public List<LocationMarkerResponse> markers() {
        return locationUpdateRepository.findTop50ByConsentProvidedTrueOrderByCapturedAtDesc().stream()
                .map(this::toMarker)
                .toList();
    }

    @GetMapping("/history/me")
    public List<LocationMarkerResponse> myHistory(@AuthenticationPrincipal User user) {
        return locationUpdateRepository.findTop25ByUserOrderByCapturedAtDesc(user).stream()
                .map(this::toMarker)
                .toList();
    }

    private LocationMarkerResponse toMarker(LocationUpdate location) {
        User user = location.getUser();
        return new LocationMarkerResponse(
                location.getId(),
                user.getId(),
                user.getFullName(),
                user.getRole().name(),
                location.getLatitude(),
                location.getLongitude(),
                location.getAccuracyMeters(),
                location.isConsentProvided(),
                location.getCapturedAt()
        );
    }
}

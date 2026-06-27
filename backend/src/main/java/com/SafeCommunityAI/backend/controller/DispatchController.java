package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.service.CoordinationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dispatch")
@RequiredArgsConstructor
public class DispatchController {
    private final CoordinationService coordinationService;

    @PostMapping("/assignments")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public Map<String, Object> assign(@Valid @RequestBody AssignmentRequest request, @AuthenticationPrincipal User user) {
        return coordinationService.assign(request, user.getEmail());
    }

    @GetMapping("/assignments/mine")
    @PreAuthorize("hasRole('RESPONDER')")
    public List<Map<String, Object>> mine(@AuthenticationPrincipal User user) {
        return coordinationService.myAssignments(user.getEmail());
    }

    @GetMapping("/recommendations/{incidentId}")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public List<DispatchRecommendationResponse> recommendations(@PathVariable Long incidentId) {
        return coordinationService.recommendations(incidentId);
    }

    @GetMapping("/assignments/{id}/route")
    @PreAuthorize("hasRole('RESPONDER') or hasRole('DISPATCHER') or hasRole('ADMIN')")
    public RouteResponse route(@PathVariable Long id) {
        return coordinationService.routeForAssignment(id);
    }

    @PatchMapping("/assignments/{id}")
    @PreAuthorize("hasRole('RESPONDER') or hasRole('DISPATCHER') or hasRole('ADMIN')")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody StatusUpdateRequest request, @AuthenticationPrincipal User user) {
        return coordinationService.updateAssignment(id, request, user.getEmail());
    }

    @GetMapping("/assignments/{id}/messages")
    @PreAuthorize("hasRole('RESPONDER') or hasRole('DISPATCHER') or hasRole('ADMIN')")
    public List<AssignmentMessageResponse> messages(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return coordinationService.assignmentMessages(id, user.getEmail());
    }

    @PostMapping("/assignments/{id}/messages")
    @PreAuthorize("hasRole('RESPONDER') or hasRole('DISPATCHER') or hasRole('ADMIN')")
    public AssignmentMessageResponse sendMessage(@PathVariable Long id, @Valid @RequestBody AssignmentMessageRequest request, @AuthenticationPrincipal User user) {
        return coordinationService.sendAssignmentMessage(id, request, user.getEmail());
    }
}

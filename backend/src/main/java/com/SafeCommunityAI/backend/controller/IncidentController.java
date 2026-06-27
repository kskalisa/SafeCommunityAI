package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.Role;
import com.SafeCommunityAI.backend.exception.BadRequestException;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.repository.IncidentAttachmentRepository;
import com.SafeCommunityAI.backend.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {
    private final IncidentService incidentService;
    private final IncidentAttachmentRepository attachmentRepository;

    @PostMapping
    @PreAuthorize("hasRole('CITIZEN') or hasRole('DISPATCHER') or hasRole('ADMIN')")
    public IncidentResponse create(@Valid @RequestBody IncidentRequest request, @AuthenticationPrincipal User user) {
        return incidentService.createIncident(request, user.getEmail());
    }

    @PostMapping("/panic")
    @PreAuthorize("hasRole('CITIZEN')")
    public IncidentResponse panic(@Valid @RequestBody LocationRequest request, @AuthenticationPrincipal User user) {
        return incidentService.createPanicIncident(request, user.getEmail());
    }

    @GetMapping("/mine")
    public List<IncidentResponse> mine(@AuthenticationPrincipal User user) {
        return incidentService.myIncidents(user.getEmail());
    }

    @GetMapping("/queue")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public List<IncidentResponse> queue() {
        return incidentService.queue();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CITIZEN') or hasRole('ADMIN')")
    public IncidentResponse update(@PathVariable Long id, @Valid @RequestBody IncidentRequest request, @AuthenticationPrincipal User user) {
        return incidentService.updateIncident(id, request, user.getEmail());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CITIZEN') or hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        incidentService.deleteIncident(id, user.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public IncidentResponse status(@PathVariable Long id, @RequestBody StatusUpdateRequest request, @AuthenticationPrincipal User user) {
        return incidentService.updateStatus(id, request, user.getEmail());
    }

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CITIZEN') or hasRole('DISPATCHER') or hasRole('ADMIN')")
    public List<AttachmentResponse> uploadAttachments(@PathVariable Long id, @RequestParam("files") MultipartFile[] files, @AuthenticationPrincipal User user) {
        return incidentService.uploadAttachments(id, files, user.getEmail());
    }

    @GetMapping("/attachments/{id}/download")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable Long id, @AuthenticationPrincipal User user) {
        var attachment = attachmentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
        Role role = user.getRole();
        boolean dispatcherAccess = role == Role.DISPATCHER || role == Role.ADMIN;
        boolean citizenOwnsIncident = attachment.getIncident().getReporter() != null && attachment.getIncident().getReporter().getId().equals(user.getId());
        if (!dispatcherAccess && !citizenOwnsIncident) {
            throw new BadRequestException("You are not allowed to download this attachment");
        }
        MediaType mediaType = attachment.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(attachment.getContentType());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getFileName() + "\"")
                .body(attachment.getData());
    }
}

package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.EmergencyContactRequest;
import com.SafeCommunityAI.backend.dto.EmergencyContactResponse;
import com.SafeCommunityAI.backend.entity.EmergencyContact;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.repository.EmergencyContactRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emergency-contacts")
@RequiredArgsConstructor
public class EmergencyContactController {
    private final EmergencyContactRepository emergencyContactRepository;

    @GetMapping
    public List<EmergencyContactResponse> list(@AuthenticationPrincipal User user) {
        return emergencyContactRepository.findByOwnerOrderByNameAsc(user).stream().map(this::toResponse).toList();
    }

    @PostMapping
    public EmergencyContactResponse create(@Valid @RequestBody EmergencyContactRequest request, @AuthenticationPrincipal User user) {
        return toResponse(emergencyContactRepository.save(toEntity(new EmergencyContact(), request, user)));
    }

    @PutMapping("/{id}")
    public EmergencyContactResponse update(@PathVariable Long id, @Valid @RequestBody EmergencyContactRequest request, @AuthenticationPrincipal User user) {
        EmergencyContact contact = emergencyContactRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Emergency contact not found"));
        if (!contact.getOwner().getId().equals(user.getId())) throw new ResourceNotFoundException("Emergency contact not found");
        return toResponse(emergencyContactRepository.save(toEntity(contact, request, user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        EmergencyContact contact = emergencyContactRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Emergency contact not found"));
        if (!contact.getOwner().getId().equals(user.getId())) throw new ResourceNotFoundException("Emergency contact not found");
        emergencyContactRepository.delete(contact);
        return ResponseEntity.noContent().build();
    }

    private EmergencyContact toEntity(EmergencyContact contact, EmergencyContactRequest request, User user) {
        contact.setOwner(user);
        contact.setName(request.name());
        contact.setType(request.type());
        contact.setPhone(request.phone());
        contact.setEmail(request.email());
        contact.setNotifyOnEmergency(request.notifyOnEmergency());
        return contact;
    }

    private EmergencyContactResponse toResponse(EmergencyContact contact) {
        return new EmergencyContactResponse(contact.getId(), contact.getName(), contact.getType(), contact.getPhone(), contact.getEmail(), contact.isNotifyOnEmergency());
    }
}

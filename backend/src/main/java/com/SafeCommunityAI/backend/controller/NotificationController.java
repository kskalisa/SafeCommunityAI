package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.NotificationRequest;
import com.SafeCommunityAI.backend.dto.NotificationResponse;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.repository.UserRepository;
import com.SafeCommunityAI.backend.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping
    public List<NotificationResponse> list(@AuthenticationPrincipal User user) {
        return notificationService.list(user.getEmail());
    }

    @PostMapping
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public ResponseEntity<Void> send(@Valid @RequestBody NotificationRequest request) {
        if (request.recipientId() == null) {
            notificationService.broadcast(request.title(), request.message());
            return ResponseEntity.noContent().build();
        }
        User recipient = userRepository.findById(request.recipientId()).orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));
        notificationService.notify(recipient, request.title(), request.message());
        return ResponseEntity.noContent().build();
    }
}

package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.ResponderDetailResponse;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.Role;
import com.SafeCommunityAI.backend.exception.ResourceNotFoundException;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.ResponderProfileRepository;
import com.SafeCommunityAI.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserRepository userRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final AppMapper mapper;

    @GetMapping("/responders")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    public List<?> responders() {
        return userRepository.findByRole(Role.RESPONDER).stream().map(mapper::toUserResponse).toList();
    }

    @GetMapping("/responders/details")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<ResponderDetailResponse> responderDetails() {
        return userRepository.findByRole(Role.RESPONDER).stream().map(user -> {
            var profile = responderProfileRepository.findByUser(user).orElse(null);
            return new ResponderDetailResponse(
                    user.getId(),
                    user.getFullName(),
                    user.getEmail(),
                    user.getPhone(),
                    user.isEnabled(),
                    profile == null ? null : profile.getOrganization(),
                    profile == null ? null : profile.getCertificateFileName(),
                    profile == null ? null : profile.getCertificateContentType(),
                    profile == null ? null : profile.getCertificateSizeBytes(),
                    profile == null || profile.getCertificateDataBase64() == null ? null : "/api/users/responders/" + user.getId() + "/certificate",
                    profile == null ? List.of() : profile.getResources().stream().map(mapper::toResourceSummary).toList(),
                    profile == null ? null : profile.getVerificationStatus(),
                    profile == null ? null : profile.getAvailabilityStatus(),
                    user.getCreatedAt()
            );
        }).toList();
    }

    @GetMapping("/responders/{id}/certificate")
    @PreAuthorize("hasRole('DISPATCHER') or hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadResponderCertificate(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Responder not found"));
        var profile = responderProfileRepository.findByUser(user).orElseThrow(() -> new ResourceNotFoundException("Responder profile not found"));
        if (profile.getCertificateDataBase64() == null) {
            throw new ResourceNotFoundException("Certificate not found");
        }
        MediaType mediaType = profile.getCertificateContentType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(profile.getCertificateContentType());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + profile.getCertificateFileName() + "\"")
                .body(Base64.getDecoder().decode(profile.getCertificateDataBase64()));
    }
}

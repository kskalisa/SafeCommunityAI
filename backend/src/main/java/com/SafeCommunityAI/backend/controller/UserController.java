package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.ResponderDetailResponse;
import com.SafeCommunityAI.backend.enums.Role;
import com.SafeCommunityAI.backend.mapper.AppMapper;
import com.SafeCommunityAI.backend.repository.ResponderProfileRepository;
import com.SafeCommunityAI.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
                    profile == null ? null : profile.getCertificationLicense(),
                    profile == null ? null : profile.getVehicleNumber(),
                    profile == null ? null : profile.getVerificationStatus(),
                    profile == null ? null : profile.getAvailabilityStatus(),
                    user.getCreatedAt()
            );
        }).toList();
    }
}

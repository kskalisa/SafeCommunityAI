package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.entity.ResponderProfile;
import com.SafeCommunityAI.backend.entity.User;
import com.SafeCommunityAI.backend.enums.*;
import com.SafeCommunityAI.backend.exception.BadRequestException;
import com.SafeCommunityAI.backend.repository.ResponderProfileRepository;
import com.SafeCommunityAI.backend.repository.UserRepository;
import com.SafeCommunityAI.backend.security.JwtService;
import com.SafeCommunityAI.backend.service.AuditService;
import com.SafeCommunityAI.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuditService auditService;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email is already registered");
        }
        User user = User.builder()
                .fullName(request.fullName())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .phone(request.phone())
                .locationPrivacyConsent(Boolean.TRUE.equals(request.locationPrivacyConsent()))
                .enabled(true)
                .build();
        user = userRepository.save(user);
        if (user.getRole() == Role.RESPONDER) {
            responderProfileRepository.save(ResponderProfile.builder()
                    .user(user)
                    .organization(request.organization())
                    .certificationLicense(request.certificationLicense())
                    .vehicleNumber(request.vehicleNumber())
                    .verificationStatus(VerificationStatus.PENDING)
                    .availabilityStatus(ResponderStatus.OFFLINE)
                    .build());
        }
        auditService.log("USER_REGISTERED", user.getEmail(), "User", user.getId(), "Role: " + user.getRole());
        return response(user);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (RuntimeException ex) {
            userRepository.findByEmail(request.email()).ifPresent(user -> {
                user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
                userRepository.save(user);
            });
            throw ex;
        }
        User user = userRepository.findByEmail(request.email()).orElseThrow();
        user.setFailedLoginAttempts(0);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        auditService.log("LOGIN", user.getEmail(), "User", user.getId(), "Successful login");
        return response(user);
    }

    private AuthResponse response(User user) {
        return new AuthResponse(jwtService.generateToken(user), user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}

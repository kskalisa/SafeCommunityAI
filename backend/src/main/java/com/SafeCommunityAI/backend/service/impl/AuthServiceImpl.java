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
import com.SafeCommunityAI.backend.service.OtpDeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final int OTP_EXPIRATION_SECONDS = 300;
    private static final SecureRandom OTP_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final ResponderProfileRepository responderProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final OtpDeliveryService otpDeliveryService;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email is already registered");
        }
        if (request.role() == Role.ADMIN) {
            throw new BadRequestException("Admin accounts must be created by an existing administrator");
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
                    .verificationStatus(VerificationStatus.PENDING)
                    .availabilityStatus(ResponderStatus.AVAILABLE)
                    .build());
        }
        auditService.log("USER_REGISTERED", user.getEmail(), "User", user.getId(), "Role: " + user.getRole());
        return response(user);
    }

    @Override
    public OtpChallengeResponse login(LoginRequest request) {
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
        String otpCode = String.format("%06d", OTP_RANDOM.nextInt(1_000_000));
        user.setLoginOtpHash(passwordEncoder.encode(otpCode));
        user.setLoginOtpExpiresAt(Instant.now().plusSeconds(OTP_EXPIRATION_SECONDS));
        userRepository.save(user);
        otpDeliveryService.sendLoginOtp(user.getEmail(), user.getFullName(), otpCode);
        auditService.log("LOGIN_OTP_SENT", user.getEmail(), "User", user.getId(), "One-time password generated");
        return new OtpChallengeResponse(true, user.getEmail(), OTP_EXPIRATION_SECONDS, "A one-time password has been sent to your email.");
    }

    @Override
    public AuthResponse verifyLoginOtp(OtpVerificationRequest request) {
        User user = userRepository.findByEmail(request.email()).orElseThrow(() -> new BadRequestException("Invalid or expired OTP"));
        if (user.getLoginOtpHash() == null || user.getLoginOtpExpiresAt() == null || user.getLoginOtpExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired OTP");
        }
        if (!passwordEncoder.matches(request.otpCode(), user.getLoginOtpHash())) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            userRepository.save(user);
            throw new BadRequestException("Invalid or expired OTP");
        }
        user.setFailedLoginAttempts(0);
        user.setLastLoginAt(Instant.now());
        user.setLoginOtpHash(null);
        user.setLoginOtpExpiresAt(null);
        userRepository.save(user);
        auditService.log("LOGIN", user.getEmail(), "User", user.getId(), "Successful login");
        return response(user);
    }

    private AuthResponse response(User user) {
        return new AuthResponse(jwtService.generateToken(user), user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}


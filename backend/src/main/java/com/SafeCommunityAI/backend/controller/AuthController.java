package com.SafeCommunityAI.backend.controller;

import com.SafeCommunityAI.backend.dto.*;
import com.SafeCommunityAI.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public OtpChallengeResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/login/verify-otp")
    public AuthResponse verifyLoginOtp(@Valid @RequestBody OtpVerificationRequest request) {
        return authService.verifyLoginOtp(request);
    }
}

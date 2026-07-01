package com.SafeCommunityAI.backend.service;

import com.SafeCommunityAI.backend.dto.*;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    OtpChallengeResponse login(LoginRequest request);
    AuthResponse verifyLoginOtp(OtpVerificationRequest request);
}

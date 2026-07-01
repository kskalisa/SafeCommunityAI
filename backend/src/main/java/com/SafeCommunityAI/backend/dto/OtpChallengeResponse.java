package com.SafeCommunityAI.backend.dto;

public record OtpChallengeResponse(boolean otpRequired, String email, int expiresInSeconds, String message) {}

package com.SafeCommunityAI.backend.service;

public interface OtpDeliveryService {
    void sendLoginOtp(String email, String fullName, String otpCode);
}

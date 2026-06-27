package com.SafeCommunityAI.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record EmergencyContactRequest(@NotBlank String name, @NotBlank String type, @NotBlank String phone, String email, boolean notifyOnEmergency) {}

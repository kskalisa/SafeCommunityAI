package com.SafeCommunityAI.backend.dto;

public record EmergencyContactResponse(Long id, String name, String type, String phone, String email, boolean notifyOnEmergency) {}

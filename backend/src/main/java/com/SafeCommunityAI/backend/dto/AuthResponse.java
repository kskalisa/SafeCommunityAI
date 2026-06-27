package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.Role;

public record AuthResponse(String token, Long userId, String fullName, String email, Role role) {}

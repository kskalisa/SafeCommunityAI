package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminUserRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @Size(min = 6) String password,
        @NotNull Role role,
        String phone,
        Boolean enabled,
        Boolean accountLocked,
        String organization,
        String certificationLicense,
        String vehicleNumber
) {}

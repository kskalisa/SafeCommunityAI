package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminUserRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @Size(min = 6) String password,
        @NotNull Role role,
        String phone,
        Boolean enabled,
        Boolean accountLocked,
        String organization,
        List<Long> resourceIds
) {}

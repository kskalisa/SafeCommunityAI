package com.SafeCommunityAI.backend.dto;

import com.SafeCommunityAI.backend.enums.IncidentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record IncidentRequest(
        @NotNull IncidentType type,
        @Size(max = 40, message = "Severity must be 40 characters or less")
        String severity,
        @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
        BigDecimal latitude,
        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
        BigDecimal longitude,
        @Size(max = 255, message = "Manual location must be 255 characters or less")
        String manualLocation,
        @Size(max = 2000, message = "Description must be 2000 characters or less")
        String description,
        boolean anonymousReport,
        @Size(max = 120, message = "Witness name must be 120 characters or less")
        String witnessName,
        @Pattern(regexp = "^$|^[+0-9()\\-\\s]{7,24}$", message = "Witness phone must be a valid phone number")
        String witnessPhone,
        boolean notifyEmergencyContacts,
        @Size(max = 5, message = "Only five evidence files can be attached to one report")
        List<@Valid AttachmentRequest> attachments
) {}

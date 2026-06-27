package com.SafeCommunityAI.backend.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record HospitalRequest(@NotBlank String name, String address, String contact, BigDecimal latitude, BigDecimal longitude, Integer erBeds, Integer icuBeds, Integer generalBeds, boolean traumaCenter, boolean ambulanceDiversion, Integer avgHandoffMinutes, Integer patientsReceivedToday, String handoffNotes) {}

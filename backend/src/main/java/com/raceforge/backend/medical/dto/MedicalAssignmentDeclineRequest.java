package com.raceforge.backend.medical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MedicalAssignmentDeclineRequest(
        @NotBlank(message = "Decline reason is required")
        @Size(min = 10, max = 500, message = "Decline reason must be between 10 and 500 characters")
        String reason
) { }

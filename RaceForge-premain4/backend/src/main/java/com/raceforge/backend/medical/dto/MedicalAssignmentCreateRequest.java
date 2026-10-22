package com.raceforge.backend.medical.dto;

import jakarta.validation.constraints.NotBlank;

public record MedicalAssignmentCreateRequest(@NotBlank String veterinarianId) { }

package com.raceforge.backend.medical.dto;

import jakarta.validation.constraints.NotNull;

public record MedicalAssignmentCreateRequest(@NotNull Integer veterinarianId) { }

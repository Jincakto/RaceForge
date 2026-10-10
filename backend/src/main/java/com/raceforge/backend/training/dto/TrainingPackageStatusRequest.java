package com.raceforge.backend.training.dto;

import jakarta.validation.constraints.NotBlank;

public record TrainingPackageStatusRequest(@NotBlank String status) {}

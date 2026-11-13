package com.raceforge.backend.training.dto;

public record TrainingAssessmentItemResponse(
        String code, String label, boolean passed, String failNote) {
}

package com.raceforge.backend.training.dto;

import java.util.List;
import java.util.Map;

public record TrainingAssessmentTemplateResponse(
        String version, List<Criterion> criteria, Map<String, String> labels) {
    public record Criterion(String code, String label, String helpText) {
    }
}

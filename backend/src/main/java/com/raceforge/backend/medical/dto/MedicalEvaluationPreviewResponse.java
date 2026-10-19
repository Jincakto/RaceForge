package com.raceforge.backend.medical.dto;

/** A recommendation, NOT a veterinarian decision or a confirmed medical record. */
public record MedicalEvaluationPreviewResponse(
        String level,
        String suggestedConclusion,
        String systemNote,
        String trainingNote,
        boolean suggestedLock
) {}

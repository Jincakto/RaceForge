package com.raceforge.backend.medical.service;

public record MedicalEvaluationResult(
        EvaluationLevel level,
        String systemNote,
        String trainingNote,
        boolean suggestedLock
) {

    public enum EvaluationLevel {
        NORMAL,
        WARNING,
        CRITICAL,
        INCOMPLETE
    }
}

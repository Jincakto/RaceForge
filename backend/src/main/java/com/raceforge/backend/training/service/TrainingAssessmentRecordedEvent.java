package com.raceforge.backend.training.service;

import com.raceforge.backend.training.entity.TrainingSessionAssessment;

/** Synchronous in-process event. Listeners join completion's transaction; no external delivery. */
public record TrainingAssessmentRecordedEvent(TrainingSessionAssessment assessment) {
}

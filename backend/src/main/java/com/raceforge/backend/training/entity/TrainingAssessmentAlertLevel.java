package com.raceforge.backend.training.entity;

/** RaceForge demonstration policy, not a validated veterinary scoring system. */
public enum TrainingAssessmentAlertLevel {
    NO_ALERT_DETECTED("Normal", 0),
    VET_REVIEW_REQUIRED("Vet Check Recommended", 1),
    URGENT_VET_REVIEW("Urgent Vet Check", 2);

    private final String label;
    private final int priority;

    TrainingAssessmentAlertLevel(String label, int priority) {
        this.label = label;
        this.priority = priority;
    }

    public String label() { return label; }
    public int priority() { return priority; }
}

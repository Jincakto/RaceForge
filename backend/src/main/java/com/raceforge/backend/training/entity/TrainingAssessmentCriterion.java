package com.raceforge.backend.training.entity;

/** Fixed observational checklist; passing a check is not veterinary clearance. */
public enum TrainingAssessmentCriterion {
    ALERTNESS("Alertness and responsiveness", "Observe alertness and usual responses."),
    COORDINATION("Balance and coordination", "Check for newly observed instability or loss of balance."),
    BREATHING_EFFORT("Breathing and recovery", "Observe breathing effort and recovery after exercise."),
    GAIT("Gait and movement", "Observe any newly uneven movement or lameness."),
    LIMB_CONDITION("Leg condition", "Check for new swelling, unusual local heat or signs of discomfort."),
    MUSCLE_COMFORT("Muscle comfort", "Observe unusual stiffness, spasms or muscle discomfort."),
    EXTERNAL_INJURY("Visible injuries", "Check for new wounds, abrasions or equipment-related injuries."),
    SWEATING("Sweating pattern", "Consider sweating in the context of exercise and weather."),
    MUCOUS_MEMBRANES("Gum color and moisture", "If trained to do so safely, observe unusual gum color or dryness."),
    NASAL_BLEEDING("Nasal bleeding", "Check whether blood is visible at either nostril.");

    private final String label;
    private final String helpText;

    TrainingAssessmentCriterion(String label, String helpText) {
        this.label = label;
        this.helpText = helpText;
    }

    public String label() { return label; }
    public String helpText() { return helpText; }
}

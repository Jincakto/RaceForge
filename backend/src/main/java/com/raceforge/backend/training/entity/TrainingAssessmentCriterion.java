package com.raceforge.backend.training.entity;

/** Fixed performance checklist; passing a check is not veterinary clearance. */
public enum TrainingAssessmentCriterion {
    TASK_COMPLETION("Task Completion", "Complete the exercise assigned for this session."),
    SPEED_CONTROL("Speed Control", "Maintain the speed requested by the trainer."),
    MOVEMENT_STABILITY("Movement Stability", "Move steadily with minimal interruptions."),
    BALANCE("Balance", "Maintain balance while moving."),
    COMMAND_RESPONSE("Command Response", "Respond to the trainer's commands."),
    FOCUS("Focus", "Stay focused throughout the exercise."),
    STAMINA("Stamina", "Maintain effort until the end of the exercise."),
    SPEED_TRANSITION("Speed Transition", "Increase or decrease speed as requested."),
    COOPERATION("Cooperation", "Cooperate with the trainer during the exercise."),
    PERFORMANCE_CONSISTENCY("Performance Consistency", "Maintain consistent performance throughout the session.");

    private final String label;
    private final String helpText;

    TrainingAssessmentCriterion(String label, String helpText) {
        this.label = label;
        this.helpText = helpText;
    }

    public String label() { return label; }
    public String helpText() { return helpText; }
}

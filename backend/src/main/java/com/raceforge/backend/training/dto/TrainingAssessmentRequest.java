package com.raceforge.backend.training.dto;

import java.util.Map;
import tools.jackson.databind.annotation.JsonDeserialize;

@JsonDeserialize(using = TrainingAssessmentRequestDeserializer.class)
public record TrainingAssessmentRequest(
        String checklistVersion,
        @io.swagger.v3.oas.annotations.media.Schema(description = "All ten POST_TRAINING_V1 performance answers (TASK_COMPLETION, SPEED_CONTROL, MOVEMENT_STABILITY, BALANCE, COMMAND_RESPONSE, FOCUS, STAMINA, SPEED_TRANSITION, COOPERATION, PERFORMANCE_CONSISTENCY): true means Pass; false means Concern observed. Each false answer requires a reason in failNotes.")
        Map<String, Boolean> checks,
        @io.swagger.v3.oas.annotations.media.Schema(description = "Per-check observation reasons, required for every false answer; each reason is at most 1,000 characters.", requiredMode = io.swagger.v3.oas.annotations.media.Schema.RequiredMode.NOT_REQUIRED)
        Map<String, String> failNotes) {
}

package com.raceforge.backend.training.dto;

import java.util.Map;
import tools.jackson.databind.annotation.JsonDeserialize;

@JsonDeserialize(using = TrainingAssessmentRequestDeserializer.class)
public record TrainingAssessmentRequest(
        String checklistVersion,
        @io.swagger.v3.oas.annotations.media.Schema(description = "All ten POST_TRAINING_V1 performance answers (TASK_COMPLETION, SPEED_CONTROL, MOVEMENT_STABILITY, BALANCE, COMMAND_RESPONSE, FOCUS, STAMINA, SPEED_TRANSITION, COOPERATION, PERFORMANCE_CONSISTENCY): true means Pass; false means Concern observed. Neither answer requires an individual note.")
        Map<String, Boolean> checks,
        @io.swagger.v3.oas.annotations.media.Schema(description = "Optional legacy per-check observation notes retained for backward compatibility. New clients can omit this map and use the session performanceNotes for optional overall notes.", requiredMode = io.swagger.v3.oas.annotations.media.Schema.RequiredMode.NOT_REQUIRED)
        Map<String, String> failNotes) {
}

package com.raceforge.backend.training.dto;

public record TrainingVetNotificationResponse(
        String sessionId, String requestStatus, boolean startBlocked, String message) {
}

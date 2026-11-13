package com.raceforge.backend.training.dto;

public record TrainingNotificationTargetResponse(
        String sessionId, String horseId, String targetType, String targetPath) {
}

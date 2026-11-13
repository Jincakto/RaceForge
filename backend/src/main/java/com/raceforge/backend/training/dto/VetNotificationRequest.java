package com.raceforge.backend.training.dto;

/** Manual-only reason rules are applied after trimming by the notification service. */
public record VetNotificationRequest(String reason) {
}
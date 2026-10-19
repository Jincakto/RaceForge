package com.raceforge.backend.training.dto;

/** Normal stop uses server time. Historical stop is only for a medical-lock interruption. */
public record StopSessionRequest(java.time.LocalDateTime stoppedAt, String interruptionLockId) { }

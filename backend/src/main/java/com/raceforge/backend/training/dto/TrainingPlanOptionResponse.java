package com.raceforge.backend.training.dto;
import java.time.LocalDate;

/** Dates and assignment status belong to Horse_Plan, not Training_Plan. */
public record TrainingPlanOptionResponse(String planId, String horseId, String planName,
        String status, String horsePlanStatus, LocalDate startDate, LocalDate endDate) {}

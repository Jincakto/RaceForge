package com.raceforge.backend.medical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TrainingUnlockRequest {

    @NotBlank(message = "Unlock reason is required")
    @Size(max = 1000, message = "Unlock reason must not exceed 1000 characters")
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

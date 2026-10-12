package com.raceforge.backend.account.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class RegistrationReviewDtos {

    private RegistrationReviewDtos() {
    }

    public record ApproveRequest(@Size(max = 500) String note) {
    }

    public record RejectRequest(@NotBlank @Size(max = 500) String reason) {
    }
}

package com.raceforge.backend.account.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLinkRequest(@NotBlank String idToken) {
}

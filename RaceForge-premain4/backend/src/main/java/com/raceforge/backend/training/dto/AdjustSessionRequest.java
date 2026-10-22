package com.raceforge.backend.training.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
public record AdjustSessionRequest(@NotNull LocalDateTime scheduledStart,@NotNull LocalDateTime scheduledEnd,
 @NotBlank String intensity,@NotBlank @Size(max=600) String reason) { }

package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.service.HorseAdmissionService;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/horses/{horseId}")
public class HorseAdmissionController {

    private final HorseAdmissionService service;

    public HorseAdmissionController(HorseAdmissionService service) {
        this.service = service;
    }

    public record Review(@Size(max = 500) String note) {
    }

    public enum ScreeningDecision { PASSED, NEEDS_CORRECTION, REJECTED }
    public record Screening(@NotNull ScreeningDecision decision, @Size(max = 500) String reason) {}

    @PostMapping("/admission/screening")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<HorseResponse> screen(@PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor, @Valid @RequestBody Screening body) {
        return ApiResponse.success("Screening decision recorded",
                service.screen(horseId, actor.userId(), body.decision().name(), body.reason()));
    }

    @PostMapping("/admission")
    @PreAuthorize("@horseAccess.owns(authentication, #horseId)")
    public ApiResponse<HorseResponse> submit(
            @PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor
    ) {
        return ApiResponse.success(
                "Horse submitted",
                service.submit(horseId, actor.userId())
        );
    }

    @PostMapping("/admission/approve")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<HorseResponse> approve(
            @PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody Review body
    ) {
        return ApiResponse.success(
                "Admission approved",
                service.review(horseId, actor.userId(), true, body.note())
        );
    }

    @PostMapping("/admission/reject")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<HorseResponse> reject(
            @PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody Review body
    ) {
        return ApiResponse.success(
                "Admission rejected",
                service.review(horseId, actor.userId(), false, body.note())
        );
    }

    @GetMapping("/health-profile")
    @PreAuthorize("@horseAccess.read(authentication, #horseId)")
    public ApiResponse<String> profile(@PathVariable String horseId) {
        return ApiResponse.success(
                "Health profile",
                service.profile(horseId)
        );
    }
}

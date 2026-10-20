package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.service.HorseAdmissionService;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
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

    @PostMapping("/admission")
    @PreAuthorize("@horseAccess.owns(authentication, #horseId)")
<<<<<<< HEAD
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
=======
    public ApiResponse<HorseResponse> submit(@PathVariable String horseId,@AuthenticationPrincipal AuthenticatedUser actor){return ApiResponse.success("Horse submitted",service.submit(horseId,actor.userId()));}
    @PostMapping("/admission/approve")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<HorseResponse> approve(@PathVariable String horseId,@AuthenticationPrincipal AuthenticatedUser actor,@Valid @RequestBody Review body){return ApiResponse.success("Admission approved",service.review(horseId,actor.userId(),true,body.note()));}
    @PostMapping("/admission/reject")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ApiResponse<HorseResponse> reject(@PathVariable String horseId,@AuthenticationPrincipal AuthenticatedUser actor,@Valid @RequestBody Review body){return ApiResponse.success("Admission rejected",service.review(horseId,actor.userId(),false,body.note()));}
    @GetMapping("/health-profile")
    @PreAuthorize("@horseAccess.read(authentication, #horseId)")
    public ApiResponse<String> profile(@PathVariable String horseId){return ApiResponse.success("Health profile",service.profile(horseId));}
>>>>>>> 76de6e5 (luu code)
}

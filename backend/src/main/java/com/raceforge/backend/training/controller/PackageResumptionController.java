package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.dto.ResumeOriginalPackageRequest;
import com.raceforge.backend.training.service.PackageResumptionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/horse-packages")
@Tag(name = "Package Resumption")
public class PackageResumptionController {

    private final PackageResumptionService service;

    public PackageResumptionController(PackageResumptionService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @PostMapping("/{recoveryId}/resume-original")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> resumeOriginal(
            @PathVariable Integer recoveryId,
            @Valid @RequestBody ResumeOriginalPackageRequest request,
            @AuthenticationPrincipal(expression = "userId") String managerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Original training package resumed",
                service.resumeOriginalPackage(recoveryId, request.reason(), managerId)
        ));
    }

    /**
     * CM approves resumption when Vet unlocked before Recovery was activated.
     * The path contains the original HORSE_PACKAGE registration ID, not a
     * Recovery registration ID.
     */
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @PostMapping("/{originalId}/resume-after-unlock")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> resumeWithoutRecovery(
            @PathVariable Integer originalId,
            @Valid @RequestBody ResumeOriginalPackageRequest request,
            @AuthenticationPrincipal(expression = "userId") Integer managerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Original training package resumed without Recovery",
                service.resumeWithoutRecovery(originalId, request.reason(), managerId)
        ));
    }
}

package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.dto.ResumeOriginalPackageRequest;
import com.raceforge.backend.training.service.PackageResumptionService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/horse-packages")
public class PackageResumptionController {

    private final PackageResumptionService service;

    public PackageResumptionController(PackageResumptionService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @PostMapping("/{recoveryId}/resume-original")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> resumeOriginal(
            @PathVariable String recoveryId,
            @Valid @RequestBody ResumeOriginalPackageRequest request,
            @AuthenticationPrincipal(expression = "userId") String managerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Original training package resumed",
                service.resumeOriginalPackage(recoveryId, request.reason(), managerId)
        ));
    }
}

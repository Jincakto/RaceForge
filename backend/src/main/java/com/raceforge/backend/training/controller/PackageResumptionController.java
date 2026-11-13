package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.dto.TrainerResumptionResponse;
import com.raceforge.backend.training.service.PackageResumptionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/horse-packages/resumptions")
@PreAuthorize("hasAuthority('HEAD_TRAINER')")
@Tag(name = "Trainer Resumption")
public class PackageResumptionController {
    private final PackageResumptionService service;
    public PackageResumptionController(PackageResumptionService service) { this.service = service; }

    @GetMapping("/mine")
    public ApiResponse<List<TrainerResumptionResponse>> pending(
            @AuthenticationPrincipal(expression = "userId") String trainerId) {
        return ApiResponse.success("Pending medical resumptions", service.myPending(trainerId));
    }

    @GetMapping("/{originalId}")
    public ApiResponse<TrainerResumptionResponse> detail(@PathVariable String originalId,
            @AuthenticationPrincipal(expression = "userId") String trainerId) {
        return ApiResponse.success("Resumption request", service.detail(originalId, trainerId));
    }

    @PostMapping("/{originalId}/accept")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> accept(@PathVariable String originalId,
            @AuthenticationPrincipal(expression = "userId") String trainerId) {
        return ResponseEntity.ok(ApiResponse.success("Training package resumed by assigned trainer",
                service.accept(originalId, trainerId)));
    }
}

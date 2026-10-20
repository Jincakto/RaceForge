package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.service.TrainingPackageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/training-packages")
@Tag(name = "Training Packages")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('CLUB_MANAGER','HEAD_TRAINER','HORSE_OWNER')")
public class TrainingPackageController {

    private final TrainingPackageService service;

    public TrainingPackageController(TrainingPackageService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TrainingPackageResponse>>> listActive() {
        return ResponseEntity.ok(ApiResponse.success("Active packages retrieved", service.getActivePackages()));
    }

    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<TrainingPackageResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.success("All packages retrieved", service.getAllPackages()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TrainingPackageResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Package retrieved", service.getPackage(id)));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @PostMapping
    public ResponseEntity<ApiResponse<TrainingPackageResponse>> create(
            @Valid @RequestBody TrainingPackageCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Package created", service.create(request)));
    }
}

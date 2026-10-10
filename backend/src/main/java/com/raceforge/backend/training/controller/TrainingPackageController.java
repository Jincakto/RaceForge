package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.service.TrainingPackageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/training-packages")
public class TrainingPackageController {

    private final TrainingPackageService service;

    public TrainingPackageController(TrainingPackageService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TrainingPackageResponse>>> listActive() {
        return ResponseEntity.ok(ApiResponse.success("Active packages retrieved", service.getActivePackages()));
    }

    // TODO: restrict this endpoint to CLUB_MANAGER in the merged security configuration.
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<TrainingPackageResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.success("All packages retrieved", service.getAllPackages()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TrainingPackageResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Package retrieved", service.getPackage(id)));
    }

    // TODO: apply CLUB_MANAGER authorization before deployment.
    @PostMapping
    public ResponseEntity<ApiResponse<TrainingPackageResponse>> create(
            @Valid @RequestBody TrainingPackageCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Package created", service.create(request)));
    }

    // TODO: apply CLUB_MANAGER authorization before deployment.
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TrainingPackageResponse>> update(
            @PathVariable String id, @Valid @RequestBody TrainingPackageUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Package updated", service.update(id, request)));
    }

    // TODO: apply CLUB_MANAGER authorization before deployment.
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<TrainingPackageResponse>> changeStatus(
            @PathVariable String id, @Valid @RequestBody TrainingPackageStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Package status updated", service.changeStatus(id, request)));
    }
}

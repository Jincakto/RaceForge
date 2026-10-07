package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.service.HorseService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horses")
public class HorseController {

    private final HorseService horseService;

    public HorseController(HorseService horseService) {
        this.horseService = horseService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HorseResponse>> createHorse(
            @RequestParam String ownerId,
            @Valid @RequestBody HorseCreateRequest request) {

        HorseResponse horse =
                horseService.createHorse(ownerId, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse.success(
                                "Horse created successfully",
                                horse
                        )
                );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<HorseResponse>>> getAllHorses() {

        List<HorseResponse> horses =
                horseService.getAllHorses();

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Horses retrieved successfully",
                        horses
                )
        );
    }

    @GetMapping("/{horseId}")
    public ResponseEntity<ApiResponse<HorseResponse>> getHorseById(
            @PathVariable String horseId) {

        HorseResponse horse =
                horseService.getHorseById(horseId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Horse retrieved successfully",
                        horse
                )
        );
    }

    @PutMapping("/{horseId}")
    public ResponseEntity<ApiResponse<HorseResponse>> updateHorse(
            @PathVariable String horseId,
            @Valid @RequestBody HorseUpdateRequest request) {

        HorseResponse horse =
                horseService.updateHorse(horseId, request);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Horse updated successfully",
                        horse
                )
        );
    }

    @PatchMapping("/{horseId}/activate")
    public ResponseEntity<ApiResponse<HorseResponse>> activateHorse(
            @PathVariable String horseId) {

        HorseResponse horse =
                horseService.activateHorse(horseId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Horse activated successfully",
                        horse
                )
        );
    }

    @PatchMapping("/{horseId}/deactivate")
    public ResponseEntity<ApiResponse<HorseResponse>> deactivateHorse(
            @PathVariable String horseId) {

        HorseResponse horse =
                horseService.deactivateHorse(horseId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Horse deactivated successfully",
                        horse
                )
        );
    }
}

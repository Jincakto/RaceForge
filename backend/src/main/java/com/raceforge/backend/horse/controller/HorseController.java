package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.service.HorseService;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/horses")
@Tag(name = "Horses")
public class HorseController {

    private final HorseService horseService;

    public HorseController(HorseService horseService) {
        this.horseService = horseService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HorseResponse>> createHorse(
            @RequestParam(required = false) @jakarta.validation.constraints.Pattern(regexp = "(?:OWN|VET|HTR|CM|ADM|GRM)-[0-9]{3}") String ownerId,
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
            @PathVariable @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId) {

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
            @PathVariable @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId,
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
            @PathVariable @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId) {

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
            @PathVariable @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId) {

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

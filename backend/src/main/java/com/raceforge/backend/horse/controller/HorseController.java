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

@RestController
@RequestMapping("/api/horses")
@Tag(name = "Horses")
public class HorseController {

    @org.springframework.beans.factory.annotation.Autowired
    private com.raceforge.backend.horse.service.HorseAccess access;
    private final HorseService horseService;

    public HorseController(HorseService horseService) {
        this.horseService = horseService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HorseResponse>> createHorse(
            @RequestParam Integer ownerId,
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
    public ResponseEntity<ApiResponse<List<HorseResponse>>> getAllHorses(org.springframework.security.core.Authentication authentication) {

        List<HorseResponse> horses =
                horseService.getAllHorses().stream().filter(h -> access.read(authentication, h.getHorseId())).toList();

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Horses retrieved successfully",
                        horses
                )
        );
    }

    @org.springframework.security.access.prepost.PreAuthorize("@horseAccess.read(authentication, #horseId)")
    @GetMapping("/{horseId}")
    public ResponseEntity<ApiResponse<HorseResponse>> getHorseById(
            @PathVariable Integer horseId) {

        HorseResponse horse =
                horseService.getHorseById(horseId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Horse retrieved successfully",
                        horse
                )
        );
    }

    @org.springframework.security.access.prepost.PreAuthorize("@horseAccess.owns(authentication, #horseId)")
    @PutMapping("/{horseId}")
    public ResponseEntity<ApiResponse<HorseResponse>> updateHorse(
            @PathVariable Integer horseId,
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

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @PatchMapping("/{horseId}/activate")
    public ResponseEntity<ApiResponse<HorseResponse>> activateHorse(
            @PathVariable Integer horseId) {

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
            @PathVariable Integer horseId) {

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

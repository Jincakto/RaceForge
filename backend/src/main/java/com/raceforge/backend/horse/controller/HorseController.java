/**
 * REST controllers for horse profile, ownership, stall, and stall-assignment APIs.
 */
package com.raceforge.backend.horse.controller;

import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.service.HorseService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/horses")
public class HorseController {

    private final HorseService horseService;

    public HorseController(HorseService horseService) {
        this.horseService = horseService;
    }

   @PostMapping
    public ResponseEntity<HorseResponse> createHorse(
            @RequestParam String ownerId,
            @Valid @RequestBody HorseCreateRequest request) {
    
        HorseResponse response =
                horseService.createHorse(ownerId, request);
    
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<HorseResponse>> getAllHorses() {

        return ResponseEntity.ok(
                horseService.getAllHorses()
        );
    }

    @GetMapping("/{horseId}")
    public ResponseEntity<HorseResponse> getHorseById(
            @PathVariable String horseId) {

        return ResponseEntity.ok(
                horseService.getHorseById(horseId)
        );
    }

    @PutMapping("/{horseId}")
    public ResponseEntity<HorseResponse> updateHorse(
            @PathVariable String horseId,
            @Valid @RequestBody HorseUpdateRequest request) {
    
        return ResponseEntity.ok(
                horseService.updateHorse(horseId, request)
        );
    }

    @PatchMapping("/{horseId}/activate")
    public ResponseEntity<HorseResponse> activateHorse(
            @PathVariable String horseId) {

        return ResponseEntity.ok(
                horseService.activateHorse(horseId)
        );
    }

    @PatchMapping("/{horseId}/deactivate")
    public ResponseEntity<HorseResponse> deactivateHorse(
            @PathVariable String horseId) {

        return ResponseEntity.ok(
                horseService.deactivateHorse(horseId)
        );
    }

    @PostMapping("/{horseId}/race-history")
    public ResponseEntity<HorseRaceHistoryResponse> createRaceHistory(
            @PathVariable String horseId,
            @Valid @RequestBody HorseRaceHistoryCreateRequest request) {
    
        HorseRaceHistoryResponse response =
                raceHistoryService.createRaceHistory(
                        horseId,
                        request
                );
    
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PutMapping("/race-history/{raceHistoryId}")
    public ResponseEntity<HorseRaceHistoryResponse> updateRaceHistory(
            @PathVariable String raceHistoryId,
            @Valid @RequestBody HorseRaceHistoryUpdateRequest request) {
    
        return ResponseEntity.ok(
                raceHistoryService.updateRaceHistory(
                        raceHistoryId,
                        request
                )
        );
    }
}

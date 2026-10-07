package com.raceforge.backend.horse.controller;

import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;
import com.raceforge.backend.horse.service.HorseRaceHistoryService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horses")
public class HorseRaceHistoryController {

    private final HorseRaceHistoryService raceHistoryService;

    public HorseRaceHistoryController(
            HorseRaceHistoryService raceHistoryService) {

        this.raceHistoryService = raceHistoryService;
    }

    @PostMapping("/{horseId}/race-history")
    public ResponseEntity<HorseRaceHistoryResponse> createRaceHistory(
            @PathVariable String horseId,
            @RequestBody HorseRaceHistoryCreateRequest request) {

        HorseRaceHistoryResponse response =
                raceHistoryService.createRaceHistory(
                        horseId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/{horseId}/race-history")
    public ResponseEntity<List<HorseRaceHistoryResponse>>
    getRaceHistoryByHorse(
            @PathVariable String horseId) {

        return ResponseEntity.ok(
                raceHistoryService
                        .getRaceHistoryByHorse(horseId)
        );
    }

    @GetMapping("/race-history/{raceHistoryId}")
    public ResponseEntity<HorseRaceHistoryResponse>
    getRaceHistoryById(
            @PathVariable String raceHistoryId) {

        return ResponseEntity.ok(
                raceHistoryService
                        .getRaceHistoryById(raceHistoryId)
        );
    }

    @PutMapping("/race-history/{raceHistoryId}")
    public ResponseEntity<HorseRaceHistoryResponse>
    updateRaceHistory(
            @PathVariable String raceHistoryId,
            @RequestBody HorseRaceHistoryUpdateRequest request) {

        return ResponseEntity.ok(
                raceHistoryService.updateRaceHistory(
                        raceHistoryId,
                        request
                )
        );
    }

    @DeleteMapping("/race-history/{raceHistoryId}")
    public ResponseEntity<Void> deleteRaceHistory(
            @PathVariable String raceHistoryId) {

        raceHistoryService.deleteRaceHistory(raceHistoryId);

        return ResponseEntity.noContent().build();
    }
}

package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;
import com.raceforge.backend.horse.service.HorseRaceHistoryService;

import jakarta.validation.Valid;

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
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>>
    createRaceHistory(
            @PathVariable String horseId,
            @Valid @RequestBody HorseRaceHistoryCreateRequest request) {

        HorseRaceHistoryResponse history =
                raceHistoryService.createRaceHistory(
                        horseId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse.success(
                                "Race history created successfully",
                                history
                        )
                );
    }

    @GetMapping("/{horseId}/race-history")
    public ResponseEntity<ApiResponse<List<HorseRaceHistoryResponse>>>
    getRaceHistoryByHorse(
            @PathVariable String horseId) {

        List<HorseRaceHistoryResponse> histories =
                raceHistoryService.getRaceHistoryByHorse(horseId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Race history retrieved successfully",
                        histories
                )
        );
    }

    @GetMapping("/race-history/{raceHistoryId}")
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>>
    getRaceHistoryById(
            @PathVariable String raceHistoryId) {

        HorseRaceHistoryResponse history =
                raceHistoryService.getRaceHistoryById(raceHistoryId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Race history retrieved successfully",
                        history
                )
        );
    }

    @PutMapping("/race-history/{raceHistoryId}")
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>>
    updateRaceHistory(
            @PathVariable String raceHistoryId,
            @Valid @RequestBody HorseRaceHistoryUpdateRequest request) {

        HorseRaceHistoryResponse history =
                raceHistoryService.updateRaceHistory(
                        raceHistoryId,
                        request
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Race history updated successfully",
                        history
                )
        );
    }

    @DeleteMapping("/race-history/{raceHistoryId}")
    public ResponseEntity<ApiResponse<Void>> deleteRaceHistory(
            @PathVariable String raceHistoryId) {

        raceHistoryService.deleteRaceHistory(raceHistoryId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Race history deleted successfully",
                        null
                )
        );
    }
}

package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;
import com.raceforge.backend.horse.service.HorseRaceHistoryService;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/horses")
@Tag(name = "Horse Race History")
public class HorseRaceHistoryController {

    private final HorseRaceHistoryService raceHistoryService;

    public HorseRaceHistoryController(
            HorseRaceHistoryService raceHistoryService) {

        this.raceHistoryService = raceHistoryService;
    }

    @PostMapping("/{horseId}/race-history")
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>>
    createRaceHistory(
            @PathVariable @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId,
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
            @PathVariable @jakarta.validation.constraints.Pattern(regexp = "HOR-[0-9]{3}") String horseId) {

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
            @PathVariable Integer raceHistoryId) {

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
            @PathVariable Integer raceHistoryId,
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
            @PathVariable Integer raceHistoryId) {

        raceHistoryService.deleteRaceHistory(raceHistoryId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Race history deleted successfully",
                        null
                )
        );
    }
}

package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryResponse;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;
import com.raceforge.backend.horse.service.HorseRaceHistoryService;
import com.raceforge.backend.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horses")
@Tag(name = "Horse Race History")
public class HorseRaceHistoryController {

    private final HorseRaceHistoryService raceHistoryService;

    public HorseRaceHistoryController(HorseRaceHistoryService raceHistoryService) {
        this.raceHistoryService = raceHistoryService;
    }

    @PostMapping("/{horseId}/race-history")
    @PreAuthorize("@horseAccess.owns(authentication, #horseId)")
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>> createRaceHistory(
            @PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody HorseRaceHistoryCreateRequest request) {

        HorseRaceHistoryResponse history = raceHistoryService.createRaceHistory(
                horseId, actor.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Race history created successfully", history));
    }

    @GetMapping("/{horseId}/race-history")
    @PreAuthorize("@horseAccess.read(authentication, #horseId)")
    public ResponseEntity<ApiResponse<List<HorseRaceHistoryResponse>>> getRaceHistoryByHorse(
            @PathVariable String horseId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Race history retrieved successfully", raceHistoryService.getRaceHistoryByHorse(horseId)));
    }

    @GetMapping("/race-history/{raceHistoryId}")
    @PreAuthorize("@horseAccess.readRaceHistory(authentication, #raceHistoryId)")
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>> getRaceHistoryById(
            @PathVariable String raceHistoryId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Race history retrieved successfully", raceHistoryService.getRaceHistoryById(raceHistoryId)));
    }

    @PutMapping("/race-history/{raceHistoryId}")
    @PreAuthorize("@horseAccess.ownsRaceHistory(authentication, #raceHistoryId)")
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>> updateRaceHistory(
            @PathVariable String raceHistoryId,
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody HorseRaceHistoryUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Race history updated successfully",
                raceHistoryService.updateRaceHistory(raceHistoryId, actor.userId(), request)));
    }

    @DeleteMapping("/race-history/{raceHistoryId}")
    @PreAuthorize("@horseAccess.ownsRaceHistory(authentication, #raceHistoryId)")
    public ResponseEntity<ApiResponse<Void>> deleteRaceHistory(
            @PathVariable String raceHistoryId,
            @AuthenticationPrincipal AuthenticatedUser actor) {
        raceHistoryService.deleteRaceHistory(raceHistoryId, actor.userId());
        return ResponseEntity.ok(ApiResponse.success("Race history deleted successfully", null));
    }
}

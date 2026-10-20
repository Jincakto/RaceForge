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
<<<<<<< HEAD
    @PreAuthorize("@horseAccess.owns(authentication, #horseId)")
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>> createRaceHistory(
            @PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor,
=======
    public ResponseEntity<ApiResponse<HorseRaceHistoryResponse>>
    createRaceHistory(
            @PathVariable String horseId,
>>>>>>> 76de6e5 (luu code)
            @Valid @RequestBody HorseRaceHistoryCreateRequest request) {

        HorseRaceHistoryResponse history = raceHistoryService.createRaceHistory(
                horseId, actor.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Race history created successfully", history));
    }

    @GetMapping("/{horseId}/race-history")
<<<<<<< HEAD
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
=======
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
>>>>>>> 76de6e5 (luu code)
            @Valid @RequestBody HorseRaceHistoryUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Race history updated successfully",
                raceHistoryService.updateRaceHistory(raceHistoryId, actor.userId(), request)));
    }

    @DeleteMapping("/race-history/{raceHistoryId}")
    @PreAuthorize("@horseAccess.ownsRaceHistory(authentication, #raceHistoryId)")
    public ResponseEntity<ApiResponse<Void>> deleteRaceHistory(
<<<<<<< HEAD
            @PathVariable String raceHistoryId,
            @AuthenticationPrincipal AuthenticatedUser actor) {
        raceHistoryService.deleteRaceHistory(raceHistoryId, actor.userId());
        return ResponseEntity.ok(ApiResponse.success("Race history deleted successfully", null));
=======
            @PathVariable String raceHistoryId) {

        raceHistoryService.deleteRaceHistory(raceHistoryId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Race history deleted successfully",
                        null
                )
        );
>>>>>>> 76de6e5 (luu code)
    }
}

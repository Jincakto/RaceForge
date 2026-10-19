package com.raceforge.backend.horse.controller;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.service.HorseAccess;
import com.raceforge.backend.horse.service.HorseService;
import com.raceforge.backend.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horses")
@Tag(name = "Horses")
public class HorseController {

    private final HorseService horseService;
    private final HorseAccess horseAccess;

    public HorseController(HorseService horseService, HorseAccess horseAccess) {
        this.horseService = horseService;
        this.horseAccess = horseAccess;
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('HORSE_OWNER') and #ownerId == authentication.principal.userId")
    @PostMapping
    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    public ResponseEntity<ApiResponse<HorseResponse>> createHorse(
<<<<<<< HEAD
            @RequestParam(required = false) String ownerId,
            @AuthenticationPrincipal AuthenticatedUser actor,
=======
            @RequestParam String ownerId,
>>>>>>> 76de6e5 (luu code)
            @Valid @RequestBody HorseCreateRequest request) {

        if (ownerId != null && !ownerId.equals(actor.userId())) {
            throw new BusinessRuleException("Owner ID must match the logged-in account");
        }

        HorseResponse horse = horseService.createHorse(actor.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Horse created successfully", horse));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<HorseResponse>>> getAllHorses(
            @RequestParam(required = false) String keyword,
            Authentication authentication) {

        List<HorseResponse> horses = horseService.searchHorses(keyword).stream()
                .filter(horse -> horseAccess.read(authentication, horse.getHorseId()))
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Horses retrieved successfully", horses));
    }

    @GetMapping("/{horseId}")
<<<<<<< HEAD
    @PreAuthorize("@horseAccess.read(authentication, #horseId)")
    public ResponseEntity<ApiResponse<HorseResponse>> getHorseById(@PathVariable String horseId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Horse retrieved successfully", horseService.getHorseById(horseId)));
=======
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
>>>>>>> 76de6e5 (luu code)
    }

    @PutMapping("/{horseId}")
    @PreAuthorize("@horseAccess.owns(authentication, #horseId)")
    public ResponseEntity<ApiResponse<HorseResponse>> updateHorse(
            @PathVariable String horseId,
<<<<<<< HEAD
            @AuthenticationPrincipal AuthenticatedUser actor,
=======
>>>>>>> 76de6e5 (luu code)
            @Valid @RequestBody HorseUpdateRequest request) {

        return ResponseEntity.ok(ApiResponse.success(
                "Horse updated successfully", horseService.updateHorse(horseId, actor.userId(), request)));
    }

    @PatchMapping("/{horseId}/activate")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ResponseEntity<ApiResponse<HorseResponse>> activateHorse(
<<<<<<< HEAD
            @PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor) {
=======
            @PathVariable String horseId) {
>>>>>>> 76de6e5 (luu code)

        return ResponseEntity.ok(ApiResponse.success(
                "Horse activated successfully", horseService.activateHorse(horseId, actor.userId())));
    }

    @PatchMapping("/{horseId}/deactivate")
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    public ResponseEntity<ApiResponse<HorseResponse>> deactivateHorse(
<<<<<<< HEAD
            @PathVariable String horseId,
            @AuthenticationPrincipal AuthenticatedUser actor) {
=======
            @PathVariable String horseId) {
>>>>>>> 76de6e5 (luu code)

        return ResponseEntity.ok(ApiResponse.success(
                "Horse deactivated successfully", horseService.deactivateHorse(horseId, actor.userId())));
    }
}

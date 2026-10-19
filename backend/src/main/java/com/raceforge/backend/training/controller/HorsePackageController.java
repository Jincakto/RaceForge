package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.HorsePackagePaymentRequest;
import com.raceforge.backend.training.dto.HorsePackageRegisterRequest;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.service.HorsePackageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horse-packages")
@Tag(name = "Horse Packages")
public class HorsePackageController {

    private final HorsePackageService service;

    public HorsePackageController(HorsePackageService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> register(
            @Valid @RequestBody HorsePackageRegisterRequest request,
            @AuthenticationPrincipal(expression = "userId") Integer ownerId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration created", service.register(request, ownerId)));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @PostMapping("/{id}/simulate-payment")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> simulatePayment(
            @PathVariable Integer id,
            @Valid @RequestBody HorsePackagePaymentRequest request,
            @AuthenticationPrincipal(expression = "userId") Integer ownerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Payment simulation processed",
                service.simulatePayment(id, request.successful(), ownerId)
        ));
    }

    /** CM oversight: unlike Owner history, this endpoint has no ownership filter. */
    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @GetMapping("/manage/horse/{horseId}")
    public ResponseEntity<ApiResponse<List<HorsePackageResponse>>> managerHistory(
            @PathVariable String horseId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Horse package history for Club Manager", service.historyForManager(horseId)
        ));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @GetMapping("/horse/{horseId}")
    public ResponseEntity<ApiResponse<List<HorsePackageResponse>>> history(
            @PathVariable String horseId,
            @AuthenticationPrincipal(expression = "userId") Integer ownerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Horse package history retrieved", service.history(horseId, ownerId)
        ));
    }
}

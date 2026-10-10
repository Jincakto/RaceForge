package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.HorsePackagePaymentRequest;
import com.raceforge.backend.training.dto.HorsePackageRegisterRequest;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.service.HorsePackageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horse-packages")
public class HorsePackageController {

    private final HorsePackageService service;

    public HorsePackageController(HorsePackageService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> register(
            @Valid @RequestBody HorsePackageRegisterRequest request,
            @AuthenticationPrincipal(expression = "userId") String ownerId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration created", service.register(request, ownerId)));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @PostMapping("/{id}/simulate-payment")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> simulatePayment(
            @PathVariable String id,
            @Valid @RequestBody HorsePackagePaymentRequest request,
            @AuthenticationPrincipal(expression = "userId") String ownerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Payment simulation processed",
                service.simulatePayment(id, request.successful(), ownerId)
        ));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @GetMapping("/horse/{horseId}")
    public ResponseEntity<ApiResponse<List<HorsePackageResponse>>> history(
            @PathVariable String horseId,
            @AuthenticationPrincipal(expression = "userId") String ownerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Horse package history retrieved", service.history(horseId, ownerId)
        ));
    }
}

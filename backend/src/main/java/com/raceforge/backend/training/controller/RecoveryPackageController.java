package com.raceforge.backend.training.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.training.dto.HorsePackagePaymentRequest;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.dto.RecoveryApprovalRequest;
import com.raceforge.backend.training.service.RecoveryPackageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/horse-packages")
public class RecoveryPackageController {

    private final RecoveryPackageService service;

    public RecoveryPackageController(RecoveryPackageService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('CLUB_MANAGER')")
    @PostMapping("/horse/{horseId}/approve-recovery")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> approveRecovery(
            @PathVariable String horseId,
            @Valid @RequestBody RecoveryApprovalRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Recovery transition approved; awaiting simulated payment",
                service.approveRecovery(horseId, request)
        ));
    }

    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    @PostMapping("/{id}/simulate-recovery-payment")
    public ResponseEntity<ApiResponse<HorsePackageResponse>> simulateRecoveryPayment(
            @PathVariable String id,
            @Valid @RequestBody HorsePackagePaymentRequest request,
            @AuthenticationPrincipal(expression = "userId") String ownerId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Recovery payment simulation processed",
                service.simulateRecoveryPayment(id, request.successful(), ownerId)
        ));
    }
}

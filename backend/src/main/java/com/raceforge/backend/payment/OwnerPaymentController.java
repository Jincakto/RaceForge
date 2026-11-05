package com.raceforge.backend.payment;

import com.raceforge.backend.common.response.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class OwnerPaymentController {
    private final OwnerPayments payments;

    public OwnerPaymentController(OwnerPayments payments) { this.payments = payments; }

    @PostMapping("/horse-packages/{id}/payment-link")
    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    public ApiResponse<OwnerPayments.Payment> checkout(@PathVariable String id,
            @AuthenticationPrincipal(expression = "userId") String owner) {
        return ApiResponse.success("Owner checkout", payments.checkout(id, owner));
    }

    @PostMapping("/horse-packages/{id}/payment-sync")
    @PreAuthorize("hasAuthority('HORSE_OWNER')")
    public ApiResponse<OwnerPayments.Payment> sync(@PathVariable String id,
            @AuthenticationPrincipal(expression = "userId") String owner) {
        return ApiResponse.success("Payment checked", payments.reconcile(id, owner));
    }

    @PostMapping("/payments/payos/webhook")
    public ApiResponse<Void> webhook(@RequestBody PayOsGateway.Notice notice) {
        payments.webhook(notice);
        return ApiResponse.success("Received", null);
    }

    @GetMapping({"/payments/payos/return", "/payments/payos/cancel"})
    public String returned() {
        return "Return to RaceForge and check the payment status for your registration.";
    }
}

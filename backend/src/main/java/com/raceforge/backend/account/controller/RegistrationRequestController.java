package com.raceforge.backend.account.controller;

import com.raceforge.backend.account.dto.AuthDtos.PageResponse;
import com.raceforge.backend.account.dto.AuthDtos.RegistrationRequestResponse;
import com.raceforge.backend.account.dto.RegistrationReviewDtos.ApproveRequest;
import com.raceforge.backend.account.dto.RegistrationReviewDtos.RejectRequest;
import com.raceforge.backend.account.service.RegistrationRequestService;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/registration-requests")
public class RegistrationRequestController {

    private final RegistrationRequestService service;

    public RegistrationRequestController(RegistrationRequestService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<RegistrationRequestResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success("Registration requests", service.list(search, status, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<RegistrationRequestResponse> get(@PathVariable String id) {
        return ApiResponse.success("Registration request", service.get(id));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<RegistrationRequestResponse> approve(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable String id,
            @Valid @RequestBody(required = false) ApproveRequest request
    ) {
        return ApiResponse.success("Registration approved", service.approve(id, currentUser.userId(), request == null ? null : request.note()));
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<RegistrationRequestResponse> reject(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable String id,
            @Valid @RequestBody RejectRequest request
    ) {
        return ApiResponse.success("Registration rejected", service.reject(id, currentUser.userId(), request.reason()));
    }
}

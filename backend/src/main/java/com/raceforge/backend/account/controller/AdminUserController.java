package com.raceforge.backend.account.controller;

import com.raceforge.backend.account.dto.AuthDtos.MessageResponse;
import com.raceforge.backend.account.dto.AuthDtos.UserResponse;
import com.raceforge.backend.account.dto.UserDtos.CreateStaffRequest;
import com.raceforge.backend.account.service.StaffAccountService;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/admin/users")
@Tag(name = "Admin Users")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminUserController {
    private final StaffAccountService service;
    public AdminUserController(StaffAccountService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create staff and email a single-use password setup link",
            description = "Active ADMIN only. roleId: ROL-001 CLUB_MANAGER, ROL-002 HEAD_TRAINER, ROL-003 VETERINARIAN, ROL-004 GROOM. Account remains INVITED until password setup.")
    public ApiResponse<UserResponse> create(@AuthenticationPrincipal AuthenticatedUser admin,
            @Valid @RequestBody CreateStaffRequest request) {
        return ApiResponse.success("Staff invitation sent", service.create(admin.userId(), request));
    }

    @PostMapping("/{id}/invitation")
    @Operation(summary = "Resend staff invitation and invalidate previous links")
    public ApiResponse<MessageResponse> resend(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable @jakarta.validation.constraints.Pattern(regexp = "USR-(?!000)[0-9]{3}") String id) {
        return ApiResponse.success("Invitation sent", service.resend(admin.userId(), id));
    }
}

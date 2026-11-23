package com.raceforge.backend.permission.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.permission.service.PermissionService;
import com.raceforge.backend.security.AuthenticatedUser;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only current-role grants, with no admin privilege required. */
@RestController
@RequestMapping("/api/permissions")
public class CurrentPermissionsController {
    private final PermissionService permissions;

    public CurrentPermissionsController(PermissionService permissions) {
        this.permissions = permissions;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Set<String>>> mine(@AuthenticationPrincipal AuthenticatedUser actor) {
        if (actor == null || !"ACTIVE".equals(actor.status()) || actor.roleName() == null)
            throw new AccessDeniedException("An active account is required");
        return ResponseEntity.ok(ApiResponse.success("Current permissions retrieved",
                permissions.getPermissionsForRole(actor.roleName())));
    }
}

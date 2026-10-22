package com.raceforge.backend.permission.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.permission.dto.GrantPermissionRequest;
import com.raceforge.backend.permission.dto.PermissionAuditLogResponse;
import com.raceforge.backend.permission.service.PermissionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import com.raceforge.backend.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/admin/permissions")
@PreAuthorize("hasAuthority('ADMIN') and @permissionAccess.has(authentication, 'MANAGE_PERMISSION')")
@Tag(name = "Permissions")
public class PermissionController {

  @Autowired
  private PermissionService permissionService;

  @PostMapping("/grant")
  public ResponseEntity<ApiResponse<Void>> grant(@Valid @RequestBody GrantPermissionRequest request,
          @AuthenticationPrincipal AuthenticatedUser user) {
      permissionService.grant(request, user.userId());
      return ResponseEntity.ok(ApiResponse.success("Permission granted", null));
  }

  @DeleteMapping("/revoke")
  public ResponseEntity<ApiResponse<Void>> revoke(
          @RequestParam String roleName,
          @RequestParam String permissionCode,
          @AuthenticationPrincipal AuthenticatedUser user) {
      permissionService.revoke(roleName, permissionCode, user.userId());
      return ResponseEntity.ok(ApiResponse.success("Permission revoked", null));
  }

  @GetMapping("/{roleName}")
  public ResponseEntity<ApiResponse<Set<String>>> list(@PathVariable String roleName) {
      return ResponseEntity.ok(ApiResponse.success("Permissions retrieved", permissionService.getPermissionsForRole(roleName)));
  }

  @GetMapping("/{roleName}/audit-log")
  public ResponseEntity<ApiResponse<List<PermissionAuditLogResponse>>> auditLog(@PathVariable String roleName) {
      return ResponseEntity.ok(ApiResponse.success("Audit log retrieved", permissionService.getAuditLog(roleName)));
  }
}

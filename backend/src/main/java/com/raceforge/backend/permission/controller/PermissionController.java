package com.raceforge.backend.permission.controller;

import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.permission.dto.GrantPermissionRequest;
import com.raceforge.backend.permission.dto.PermissionAuditLogResponse;
import com.raceforge.backend.permission.service.PermissionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// TODO: once JWT auth + login exist, restrict this whole controller to CLUB_MANAGER and read
// performedBy from the authenticated principal instead of a request field/param.
@RestController
@RequestMapping("/api/admin/permissions")
public class PermissionController {

  @Autowired
  private PermissionService permissionService;

  @PostMapping("/grant")
  public ResponseEntity<ApiResponse<Void>> grant(@Valid @RequestBody GrantPermissionRequest request) {
      permissionService.grant(request);
      return ResponseEntity.ok(ApiResponse.success("Permission granted", null));
  }

  @DeleteMapping("/revoke")
  public ResponseEntity<ApiResponse<Void>> revoke(
          @RequestParam String roleName,
          @RequestParam String permissionCode,
          @RequestParam @NotNull Long performedBy) {
      permissionService.revoke(roleName, permissionCode, performedBy);
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

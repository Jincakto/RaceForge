package com.raceforge.backend.permission.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.permission.dto.GrantPermissionRequest;
import com.raceforge.backend.permission.dto.PermissionAuditLogResponse;
import com.raceforge.backend.permission.entity.Permission;
import com.raceforge.backend.permission.entity.PermissionAuditLog;
import com.raceforge.backend.permission.entity.Role;
import com.raceforge.backend.permission.entity.RolePermission;
import com.raceforge.backend.permission.entity.RolePermissionId;
import com.raceforge.backend.permission.mapper.PermissionAuditLogMapper;
import com.raceforge.backend.permission.repository.PermissionAuditLogRepository;
import com.raceforge.backend.permission.repository.PermissionRepository;
import com.raceforge.backend.permission.repository.RolePermissionRepository;
import com.raceforge.backend.permission.repository.RoleRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single-club system: no club_id anywhere here. Roles are granted permissions by name/code
 * (both are String primary keys), not by numeric id.
 *
 * MANAGE_PERMISSION is exclusive to CLUB_MANAGER: it can never be granted to any other role,
 * and it can never be revoked from CLUB_MANAGER — either would leave nobody able to configure
 * permissions.
 */
@Service
public class PermissionService {

  private static final String MANAGE_PERMISSION_CODE = "MANAGE_PERMISSION";
  private static final String CLUB_MANAGER_ROLE = "CLUB_MANAGER";

  @Autowired
  private RoleRepository roleRepository;

  @Autowired
  private PermissionRepository permissionRepository;

  @Autowired
  private RolePermissionRepository rolePermissionRepository;

  @Autowired
  private PermissionAuditLogRepository auditLogRepository;

  @Autowired
  private PermissionAuditLogMapper auditLogMapper;

  @Transactional
  public void grant(GrantPermissionRequest request) {
      String roleName = request.getRoleName();
      String permissionCode = request.getPermissionCode();

      Role role = roleRepository.findById(roleName)
              .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
      Permission permission = permissionRepository.findById(permissionCode)
              .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionCode));

      if (MANAGE_PERMISSION_CODE.equals(permissionCode) && !CLUB_MANAGER_ROLE.equals(roleName)) {
          throw new BusinessRuleException(
                  "MANAGE_PERMISSION is exclusive to CLUB_MANAGER, cannot grant it to " + roleName);
      }

      RolePermissionId id = new RolePermissionId(roleName, permissionCode);
      if (rolePermissionRepository.existsById(id)) {
          return; // idempotent, no change -> no new audit entry
      }

      RolePermission rp = new RolePermission();
      rp.setId(id);
      rp.setRole(role);
      rp.setPermission(permission);
      rp.setGrantedBy(request.getPerformedBy());
      rp.setGrantedAt(LocalDateTime.now());
      rolePermissionRepository.save(rp);

      writeAuditLog("GRANT", roleName, permissionCode, request.getPerformedBy());
  }

  @Transactional
  public void revoke(String roleName, String permissionCode, Long performedBy) {
      if (MANAGE_PERMISSION_CODE.equals(permissionCode) && CLUB_MANAGER_ROLE.equals(roleName)) {
          throw new BusinessRuleException(
                  "Cannot revoke MANAGE_PERMISSION from CLUB_MANAGER — would leave nobody able to configure permissions.");
      }

      RolePermissionId id = new RolePermissionId(roleName, permissionCode);
      if (!rolePermissionRepository.existsById(id)) {
          return; // nothing to revoke, no new audit entry
      }

      rolePermissionRepository.deleteById(id);
      writeAuditLog("REVOKE", roleName, permissionCode, performedBy);
  }

  public Set<String> getPermissionsForRole(String roleName) {
      return rolePermissionRepository.findById_RoleName(roleName).stream()
              .map(rp -> rp.getId().getPermissionCode())
              .collect(Collectors.toSet());
  }

  public boolean hasPermission(String roleName, String permissionCode) {
      return rolePermissionRepository.existsById(new RolePermissionId(roleName, permissionCode));
  }

  public List<PermissionAuditLogResponse> getAuditLog(String roleName) {
      return auditLogRepository.findByRoleNameOrderByPerformedAtDesc(roleName).stream()
              .map(auditLogMapper::toResponse)
              .collect(Collectors.toList());
  }

  private void writeAuditLog(String action, String roleName, String permissionCode, Long performedBy) {
      PermissionAuditLog log = new PermissionAuditLog();
      log.setAction(action);
      log.setRoleName(roleName);
      log.setPermissionCode(permissionCode);
      log.setPerformedBy(performedBy);
      log.setPerformedAt(LocalDateTime.now());
      auditLogRepository.save(log);
  }
}

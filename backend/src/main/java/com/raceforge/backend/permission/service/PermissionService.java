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
 * Single-club system: no club_id anywhere here. Roles and permissions use INT ids (role_id,
 * permission_id) like the database; the API still accepts role/permission names and resolves
 * them to ids here.
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

      Role role = roleRepository.findByRoleName(roleName)
              .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
      Permission permission = permissionRepository.findByPermissionName(permissionCode)
              .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionCode));

      if (MANAGE_PERMISSION_CODE.equals(permissionCode) && !CLUB_MANAGER_ROLE.equals(roleName)) {
          throw new BusinessRuleException(
                  "MANAGE_PERMISSION is exclusive to CLUB_MANAGER, cannot grant it to " + roleName);
      }

      RolePermissionId id = new RolePermissionId(role.getRoleId(), permission.getPermissionId());
      if (rolePermissionRepository.existsById(id)) {
          return; // idempotent, no change -> no new audit entry
      }

      RolePermission rp = new RolePermission();
      rp.setId(id);
      rp.setRole(role);
      rp.setPermission(permission);
      rolePermissionRepository.save(rp);

      writeAuditLog("GRANT", role, permission, request.getPerformedBy());
  }

  @Transactional
  public void revoke(String roleName, String permissionCode, Integer performedBy) {
      if (MANAGE_PERMISSION_CODE.equals(permissionCode) && CLUB_MANAGER_ROLE.equals(roleName)) {
          throw new BusinessRuleException(
                  "Cannot revoke MANAGE_PERMISSION from CLUB_MANAGER — would leave nobody able to configure permissions.");
      }

      Role role = roleRepository.findByRoleName(roleName)
              .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
      Permission permission = permissionRepository.findByPermissionName(permissionCode)
              .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionCode));

      RolePermissionId id = new RolePermissionId(role.getRoleId(), permission.getPermissionId());
      if (!rolePermissionRepository.existsById(id)) {
          return; // nothing to revoke, no new audit entry
      }

      rolePermissionRepository.deleteById(id);
      writeAuditLog("REVOKE", role, permission, performedBy);
  }

  public Set<String> getPermissionsForRole(String roleName) {
      Role role = roleRepository.findByRoleName(roleName)
              .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
      return rolePermissionRepository.findById_RoleId(role.getRoleId()).stream()
              .map(rp -> rp.getPermission().getPermissionName())
              .collect(Collectors.toSet());
  }

  public boolean hasPermission(String roleName, String permissionCode) {
      return roleRepository.findByRoleName(roleName)
              .flatMap(role -> permissionRepository.findByPermissionName(permissionCode)
                      .map(permission -> rolePermissionRepository.existsById(
                              new RolePermissionId(role.getRoleId(), permission.getPermissionId()))))
              .orElse(false);
  }

  public List<PermissionAuditLogResponse> getAuditLog(String roleName) {
      Role role = roleRepository.findByRoleName(roleName)
              .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
      return auditLogRepository
              .findByEntityTypeAndEntityIdOrderByCreatedAtDesc(PermissionAuditLog.ENTITY_TYPE, role.getRoleId())
              .stream()
              .map(log -> auditLogMapper.toResponse(log, roleName))
              .collect(Collectors.toList());
  }

  private void writeAuditLog(String action, Role role, Permission permission, Integer performedBy) {
      PermissionAuditLog log = new PermissionAuditLog();
      log.setUserId(performedBy);
      log.setAction(action);
      log.setEntityType(PermissionAuditLog.ENTITY_TYPE);
      log.setEntityId(role.getRoleId());
      log.setResult("SUCCESS");
      log.setReason(permission.getPermissionName());
      log.setCreatedAt(LocalDateTime.now());
      auditLogRepository.save(log);
  }
}

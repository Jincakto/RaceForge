package com.raceforge.backend.permission.config;

import com.raceforge.backend.permission.entity.Permission;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.permission.entity.RolePermission;
import com.raceforge.backend.permission.entity.RolePermissionId;
import com.raceforge.backend.permission.repository.PermissionRepository;
import com.raceforge.backend.permission.repository.RolePermissionRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Idempotently grants MANAGE_PERMISSION to the manager role seeded by the account migrations.
 */
@Component
public class PermissionDataSeeder implements CommandLineRunner {

  private static final String MANAGE_PERMISSION = "MANAGE_PERMISSION";
  private static final String CLUB_MANAGER = "CLUB_MANAGER";

  @Autowired
  private RoleRepository roleRepository;

  @Autowired
  private PermissionRepository permissionRepository;

  @Autowired
  private RolePermissionRepository rolePermissionRepository;

  @Override
  @Transactional
  public void run(String... args) {
      Role clubManager = roleRepository.findByRoleName(CLUB_MANAGER)
              .orElseThrow(() -> new IllegalStateException("CLUB_MANAGER is missing; run the account migrations first."));

      Permission managePermission = permissionRepository.findByPermissionName(MANAGE_PERMISSION)
              .orElseGet(() -> permissionRepository.save(new Permission(MANAGE_PERMISSION,
                      "Grant or revoke permissions for any role. Exclusive to CLUB_MANAGER.")));

      RolePermissionId id = new RolePermissionId(clubManager.getRoleId(), managePermission.getPermissionId());
      if (!rolePermissionRepository.existsById(id)) {
          RolePermission grant = new RolePermission();
          grant.setId(id);
          grant.setRole(clubManager);
          grant.setPermission(managePermission);
          rolePermissionRepository.save(grant);
      }
  }
}

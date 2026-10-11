package com.raceforge.backend.permission.config;

import com.raceforge.backend.permission.entity.Permission;
import com.raceforge.backend.permission.entity.Role;
import com.raceforge.backend.permission.entity.RolePermission;
import com.raceforge.backend.permission.entity.RolePermissionId;
import com.raceforge.backend.permission.repository.PermissionRepository;
import com.raceforge.backend.permission.repository.RolePermissionRepository;
import com.raceforge.backend.permission.repository.RoleRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Runs on every startup and is idempotent. The SQL script already inserts the business roles;
 * this only fills in anything missing: the roles, the MANAGE_PERMISSION permission, and its grant
 * to CLUB_MANAGER (without it nobody could ever call /grant).
 */
@Component
public class PermissionDataSeeder implements CommandLineRunner {

  private static final String MANAGE_PERMISSION = "MANAGE_PERMISSION";
  private static final String CLUB_MANAGER = "CLUB_MANAGER";

  private static final List<String> ROLE_NAMES = List.of(
          CLUB_MANAGER, "HEAD_TRAINER", "VETERINARIAN", "GROOM", "HORSE_OWNER"
  );

  @Autowired
  private RoleRepository roleRepository;

  @Autowired
  private PermissionRepository permissionRepository;

  @Autowired
  private RolePermissionRepository rolePermissionRepository;

  @Override
  public void run(String... args) {
      for (String roleName : ROLE_NAMES) {
          if (roleRepository.findByRoleName(roleName).isEmpty()) {
              roleRepository.save(new Role(roleName));
          }
      }

      Permission managePermission = permissionRepository.findByPermissionName(MANAGE_PERMISSION)
              .orElseGet(() -> permissionRepository.save(new Permission(MANAGE_PERMISSION,
                      "Grant or revoke permissions for any role. Exclusive to CLUB_MANAGER.")));

      Role clubManager = roleRepository.findByRoleName(CLUB_MANAGER).orElseThrow();

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

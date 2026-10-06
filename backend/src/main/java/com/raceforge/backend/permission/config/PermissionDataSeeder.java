package com.raceforge.backend.permission.config;

import com.raceforge.backend.permission.entity.Permission;
import com.raceforge.backend.permission.entity.Role;
import com.raceforge.backend.permission.entity.RolePermission;
import com.raceforge.backend.permission.entity.RolePermissionId;
import com.raceforge.backend.permission.repository.PermissionRepository;
import com.raceforge.backend.permission.repository.RolePermissionRepository;
import com.raceforge.backend.permission.repository.RoleRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Runs once on startup. Seeds the 6 fixed roles, the MANAGE_PERMISSION permission, and grants it
 * to CLUB_MANAGER — without this, nobody could ever call /grant, since granting itself requires
 * MANAGE_PERMISSION and nobody would have it yet.
 */
@Component
public class PermissionDataSeeder implements CommandLineRunner {

  private static final List<String> ROLE_NAMES = List.of(
          "CLUB_MANAGER", "HEAD_TRAINER", "TRAINER", "VETERINARIAN", "GROOM", "HORSE_OWNER"
  );

  @Autowired
  private RoleRepository roleRepository;

  @Autowired
  private PermissionRepository permissionRepository;

  @Autowired
  private RolePermissionRepository rolePermissionRepository;

  @Override
  public void run(String... args) {
      if (roleRepository.count() > 0) {
          return; // already seeded
      }

      for (String roleName : ROLE_NAMES) {
          roleRepository.save(new Role(roleName));
      }

      Permission managePermission = permissionRepository.save(
              new Permission("MANAGE_PERMISSION", "Grant or revoke permissions for any role. Exclusive to CLUB_MANAGER.")
      );

      Role clubManager = roleRepository.findById("CLUB_MANAGER").orElseThrow();

      RolePermission grant = new RolePermission();
      grant.setId(new RolePermissionId("CLUB_MANAGER", "MANAGE_PERMISSION"));
      grant.setRole(clubManager);
      grant.setPermission(managePermission);
      grant.setGrantedBy(0L); // system seed, no real user yet
      grant.setGrantedAt(LocalDateTime.now());
      rolePermissionRepository.save(grant);
  }
}

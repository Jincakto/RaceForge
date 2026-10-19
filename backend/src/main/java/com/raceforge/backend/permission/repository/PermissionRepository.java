package com.raceforge.backend.permission.repository;

import com.raceforge.backend.permission.entity.Permission;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, String> {

  Optional<Permission> findByPermissionName(String permissionName);
}

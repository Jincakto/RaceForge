package com.raceforge.backend.permission.repository;

import com.raceforge.backend.permission.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, String> {
}

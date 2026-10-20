package com.raceforge.backend.permission.repository;

import com.raceforge.backend.permission.entity.Role;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

@Repository("permissionRoleRepository")
public interface RoleRepository extends JpaRepository<Role, Integer> {

  Optional<Role> findByRoleName(String roleName);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from PermissionRole r where r.roleName = :name")
  Optional<Role> findByRoleNameForUpdate(@Param("name") String name);
}

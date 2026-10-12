package com.raceforge.backend.permission.repository;

import com.raceforge.backend.permission.entity.Role;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("permissionRoleRepository")
public interface RoleRepository extends JpaRepository<Role, Integer> {

  Optional<Role> findByRoleName(String roleName);
}

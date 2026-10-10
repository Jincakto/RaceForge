package com.raceforge.backend.account.repository;

import com.raceforge.backend.account.entity.Role;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, String> {

    Optional<Role> findByRoleName(String roleName);
}

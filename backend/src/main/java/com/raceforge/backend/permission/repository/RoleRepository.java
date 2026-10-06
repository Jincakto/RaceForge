package com.raceforge.backend.permission.repository;

import com.raceforge.backend.permission.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, String> {
}

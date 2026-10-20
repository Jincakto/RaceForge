package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to table Role: role_id INT IDENTITY, role_name VARCHAR(50) UNIQUE.
@Entity(name = "PermissionRole")
@Table(name = "[Role]")
public class Role extends com.raceforge.backend.common.id.BusinessEntity {

  @Id
  @Column(name = "role_id")
  private String roleId;

  @Column(name = "role_name", nullable = false, unique = true, length = 50)
  private String roleName;

  public Role() {
  }

  public Role(String roleName) {
      this.roleName = roleName;
  }

  public String getRoleId() {
      return roleId;
  }

  public void setRoleId(String roleId) {
      this.roleId = roleId;
  }

  public String getRoleName() {
      return roleName;
  }

  public void setRoleName(String roleName) {
      this.roleName = roleName;
  }
}

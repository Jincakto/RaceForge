package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to table Role: role_id INT IDENTITY, role_name VARCHAR(50) UNIQUE.
@Entity
@Table(name = "role")
public class Role {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "role_id")
  private Integer roleId;

  @Column(name = "role_name", nullable = false, unique = true, length = 50)
  private String roleName;

  public Role() {
  }

  public Role(String roleName) {
      this.roleName = roleName;
  }

  public Integer getRoleId() {
      return roleId;
  }

  public void setRoleId(Integer roleId) {
      this.roleId = roleId;
  }

  public String getRoleName() {
      return roleName;
  }

  public void setRoleName(String roleName) {
      this.roleName = roleName;
  }
}

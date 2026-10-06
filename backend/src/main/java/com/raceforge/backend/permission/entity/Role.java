package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Keyed by its own name (e.g. "CLUB_MANAGER", "HEAD_TRAINER") instead of a numeric id —
// role names are fixed and small in number, so the string itself is a fine natural key.
@Entity
@Table(name = "role")
public class Role {

  @Id
  @Column(name = "role_name")
  private String roleName;

  public Role() {
  }

  public Role(String roleName) {
      this.roleName = roleName;
  }

  public String getRoleName() {
      return roleName;
  }

  public void setRoleName(String roleName) {
      this.roleName = roleName;
  }
}

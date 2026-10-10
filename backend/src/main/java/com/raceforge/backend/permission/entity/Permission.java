package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Keyed by its own code (e.g. "MANAGE_PERMISSION", "TRAINING_SESSION_CREATE") instead of a
// numeric id, so codes stay human-readable wherever they appear (requests, guards, logs).
@Entity
@Table(name = "permission")
public class Permission {

  @Id
  @Column(name = "permission_code")
  private String permissionCode;

  @Column(name = "description")
  private String description;

  public Permission() {
  }

  public Permission(String permissionCode, String description) {
      this.permissionCode = permissionCode;
      this.description = description;
  }

  public String getPermissionCode() {
      return permissionCode;
  }

  public void setPermissionCode(String permissionCode) {
      this.permissionCode = permissionCode;
  }

  public String getDescription() {
      return description;
  }

  public void setDescription(String description) {
      this.description = description;
  }
}

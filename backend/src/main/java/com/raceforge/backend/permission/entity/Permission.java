package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Maps to table Permission: permission_id INT IDENTITY, permission_name VARCHAR(100) UNIQUE,
// description NVARCHAR(500).
@Entity
@Table(name = "permission")
public class Permission {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "permission_id")
  private Integer permissionId;

  @Column(name = "permission_name", nullable = false, unique = true, length = 100)
  private String permissionName;

  @Column(name = "description", length = 500)
  private String description;

  public Permission() {
  }

  public Permission(String permissionName, String description) {
      this.permissionName = permissionName;
      this.description = description;
  }

  public Integer getPermissionId() {
      return permissionId;
  }

  public void setPermissionId(Integer permissionId) {
      this.permissionId = permissionId;
  }

  public String getPermissionName() {
      return permissionName;
  }

  public void setPermissionName(String permissionName) {
      this.permissionName = permissionName;
  }

  public String getDescription() {
      return description;
  }

  public void setDescription(String description) {
      this.description = description;
  }
}

package com.raceforge.backend.permission.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

// Maps to table Role_Permission (role_id, permission_id). Who granted/revoked goes to Audit_Log.
@Entity
@Table(name = "role_permission")
public class RolePermission {

  @EmbeddedId
  private RolePermissionId id;

  @ManyToOne
  @MapsId("roleId")
  @JoinColumn(name = "role_id")
  private Role role;

  @ManyToOne
  @MapsId("permissionId")
  @JoinColumn(name = "permission_id")
  private Permission permission;

  public RolePermission() {
  }

  public RolePermissionId getId() {
      return id;
  }

  public void setId(RolePermissionId id) {
      this.id = id;
  }

  public Role getRole() {
      return role;
  }

  public void setRole(Role role) {
      this.role = role;
  }

  public Permission getPermission() {
      return permission;
  }

  public void setPermission(Permission permission) {
      this.permission = permission;
  }
}

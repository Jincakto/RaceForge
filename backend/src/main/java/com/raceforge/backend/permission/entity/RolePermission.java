package com.raceforge.backend.permission.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// One row per (role, permission) currently granted. userId is assumed to already exist
// elsewhere — no User entity here, grantedBy is just the raw id.
@Entity
@Table(name = "role_permission")
public class RolePermission {

  @EmbeddedId
  private RolePermissionId id;

  @ManyToOne
  @MapsId("roleName")
  @JoinColumn(name = "role_name")
  private Role role;

  @ManyToOne
  @MapsId("permissionCode")
  @JoinColumn(name = "permission_code")
  private Permission permission;

  @Column(name = "granted_by", nullable = false)
  private Long grantedBy;

  @Column(name = "granted_at", nullable = false)
  private LocalDateTime grantedAt;

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

  public Long getGrantedBy() {
      return grantedBy;
  }

  public void setGrantedBy(Long grantedBy) {
      this.grantedBy = grantedBy;
  }

  public LocalDateTime getGrantedAt() {
      return grantedAt;
  }

  public void setGrantedAt(LocalDateTime grantedAt) {
      this.grantedAt = grantedAt;
  }
}

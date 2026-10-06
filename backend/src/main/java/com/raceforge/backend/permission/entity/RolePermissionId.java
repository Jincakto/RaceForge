package com.raceforge.backend.permission.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class RolePermissionId implements Serializable {

  private String roleName;
  private String permissionCode;

  public RolePermissionId() {
  }

  public RolePermissionId(String roleName, String permissionCode) {
      this.roleName = roleName;
      this.permissionCode = permissionCode;
  }

  public String getRoleName() {
      return roleName;
  }

  public void setRoleName(String roleName) {
      this.roleName = roleName;
  }

  public String getPermissionCode() {
      return permissionCode;
  }

  public void setPermissionCode(String permissionCode) {
      this.permissionCode = permissionCode;
  }

  @Override
  public boolean equals(Object o) {
      if (this == o) return true;
      if (!(o instanceof RolePermissionId that)) return false;
      return Objects.equals(roleName, that.roleName)
              && Objects.equals(permissionCode, that.permissionCode);
  }

  @Override
  public int hashCode() {
      return Objects.hash(roleName, permissionCode);
  }
}

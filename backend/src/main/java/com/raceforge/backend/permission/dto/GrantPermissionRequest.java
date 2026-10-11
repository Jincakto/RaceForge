package com.raceforge.backend.permission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class GrantPermissionRequest {

  @NotBlank
  private String roleName;

  @NotBlank
  private String permissionCode;

  @NotNull
  private Integer performedBy;

  public GrantPermissionRequest() {
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

  public Integer getPerformedBy() {
      return performedBy;
  }

  public void setPerformedBy(Integer performedBy) {
      this.performedBy = performedBy;
  }
}

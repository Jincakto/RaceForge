package com.raceforge.backend.permission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class GrantPermissionRequest {

  @NotBlank
  @Size(max = 50)
  private String roleName;

  @NotBlank
  @Size(max = 100)
  private String permissionCode;

  // Legacy field accepted for compatibility, but the controller uses the authenticated actor.
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

package com.raceforge.backend.permission.service;
import com.raceforge.backend.horse.service.HorseAccess;
import com.raceforge.backend.security.AuthenticatedUser;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Reuses N horse access, then applies Training's accepted paid-package scope. */
@Component("permissionAccess")
public class PermissionAccess {
 private final PermissionService permissions;
 private final HorseAccess horses;
 public PermissionAccess(PermissionService permissions,HorseAccess horses,com.raceforge.backend.training.service.TrainingReadAccess trainingReads){
  this.permissions=permissions;this.horses=horses;this.trainingReads=trainingReads;
 }
 public boolean has(Authentication authentication,String code){
  return authentication!=null && authentication.isAuthenticated()
   && authentication.getPrincipal() instanceof AuthenticatedUser user
   && "ACTIVE".equals(user.status()) && user.roleName()!=null
   && permissions.hasPermission(user.roleName(),code);
 }
 private final com.raceforge.backend.training.service.TrainingReadAccess trainingReads;
 public boolean canReadHorse(Authentication authentication,String horseId){
  if(!has(authentication,"VIEW_TRAINING"))return false;
  var user=(AuthenticatedUser)authentication.getPrincipal();
  if("HEAD_TRAINER".equals(user.roleName()))return trainingReads.canReadHorse(user.userId(),horseId);
  return horses.read(authentication,horseId)
   && ("CLUB_MANAGER".equals(user.roleName()) || "HORSE_OWNER".equals(user.roleName()));
 }
}
package com.raceforge.backend.account.controller;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.*;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.audit.service.AuditService;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/accounts")
@PreAuthorize("hasAuthority('ADMIN') and @permissionAccess.has(authentication,'MANAGE_ACCOUNTS')")
public class AdminAccountsController {
 private final UserRepository users;private final RoleRepository roles;private final PasswordEncoder passwords;private final AuditService audit;
 public AdminAccountsController(UserRepository users,RoleRepository roles,PasswordEncoder passwords,AuditService audit){this.users=users;this.roles=roles;this.passwords=passwords;this.audit=audit;}
 public record Create(@NotBlank @Size(max=150) String fullName,@NotBlank @Email @Size(max=255) String email,@NotBlank @Size(min=8,max=72) String password,@NotBlank String roleName,@Size(max=20) String phone){}
 @PostMapping @Transactional
 public Object create(@Valid @RequestBody Create body,@AuthenticationPrincipal AuthenticatedUser actor){
  if(!java.util.Set.of("ADMIN","CLUB_MANAGER","HEAD_TRAINER","VETERINARIAN","GROOM").contains(body.roleName()))throw new BusinessRuleException("Staff role must be ADMIN, CLUB_MANAGER, HEAD_TRAINER, VETERINARIAN or GROOM");
  String email=body.email().trim().toLowerCase(java.util.Locale.ROOT);if(users.existsByEmail(email))throw new BusinessRuleException("Email already exists");
  var role=roles.findByRoleName(body.roleName()).orElseThrow(()->new ResourceNotFoundException("Role not found"));
  User user=new User();user.setFullName(body.fullName().trim());user.setEmail(email);user.setPassword(passwords.encode(body.password()));user.setRole(role);user.setStatus("ACTIVE");user.setEmailVerified(true);user.setPhone(body.phone());users.saveAndFlush(user);
  audit.record(actor.userId(),"STAFF_ACCOUNT_CREATED","USER",user.getUserId(),"SUCCESS",body.roleName());
  return ApiResponse.success("Staff account provisioned by administrator",java.util.Map.of("userId",user.getUserId(),"fullName",user.getFullName(),"roleName",role.getRoleName(),"profileId",user.getRoleProfiles().stream().filter(p->p.getRoleName().equals(role.getRoleName())).map(com.raceforge.backend.account.entity.AccountRoleProfile::getProfileId).findFirst().orElse("")));
 }
 @org.springframework.beans.factory.annotation.Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;
 public record RoleChange(@NotBlank String roleName){}
 @PatchMapping("/{id}/role") @Transactional
 public Object changeRole(@PathVariable String id,@Valid @RequestBody RoleChange body,@AuthenticationPrincipal AuthenticatedUser actor){
  if(actor.userId().equals(id))throw new BusinessRuleException("Administrators cannot change their own role");
  jdbc.queryForList("SELECT role_id FROM dbo.Role WITH(UPDLOCK,HOLDLOCK) WHERE role_name='ADMIN'");
  var user=users.findByIdForUpdate(id).orElseThrow(()->new ResourceNotFoundException("User not found"));
  var role=roles.findByRoleName(body.roleName()).orElseThrow(()->new ResourceNotFoundException("Role not found"));
  if("USER".equals(role.getRoleName()))throw new BusinessRuleException("The retired public USER role cannot be assigned");
  if("ADMIN".equals(user.getRole().getRoleName())&&!"ADMIN".equals(role.getRoleName())&&jdbc.queryForObject("SELECT COUNT(*) FROM dbo.[User] u JOIN dbo.Role r ON r.role_id=u.role_id WHERE r.role_name='ADMIN' AND u.status='ACTIVE'",Integer.class)<=1)throw new BusinessRuleException("Cannot remove the last active administrator");
  if(!"HEAD_TRAINER".equals(role.getRoleName())){
   jdbc.update("UPDATE dbo.Horse_Assignment SET status='CANCELLED',reason=N'Account role changed by administrator' WHERE assignee_id=? AND kind='TRAINER' AND status IN ('ASSIGNED','ACCEPTED')",id);
   jdbc.update("UPDATE ta SET ended_at=SYSDATETIME() FROM dbo.Training_Assignment ta JOIN dbo.Horse_Assignment a ON a.id=ta.assignment_id WHERE a.assignee_id=? AND a.kind='TRAINER' AND a.status='CANCELLED' AND ta.ended_at IS NULL",id);
   jdbc.update("DELETE ht FROM dbo.Horse_Trainer ht JOIN dbo.Trainer p ON p.trainer_id=ht.trainer_id WHERE p.user_id=?",id);
   jdbc.update("UPDATE d SET status='INACTIVE' FROM dbo.Trainer_Detail d JOIN dbo.Trainer p ON p.trainer_id=d.trainer_id WHERE p.user_id=?",id);
  }
  user.setRole(role);users.saveAndFlush(user);audit.record(actor.userId(),"USER_ROLE_CHANGED","USER",id,"SUCCESS",role.getRoleName());
  return ApiResponse.success("Account role updated; account and trainer profile identifiers remain unchanged",java.util.Map.of("userId",id,"roleName",role.getRoleName()));
 }
}

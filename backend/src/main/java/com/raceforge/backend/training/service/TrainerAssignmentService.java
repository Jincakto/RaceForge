package com.raceforge.backend.training.service;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.*;
import com.raceforge.backend.audit.service.AuditLogService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @Transactional
public class TrainerAssignmentService {
 private final JdbcTemplate jdbc; private final TrainingWorkflowGuard guard; private final AuditLogService audit;
 public TrainerAssignmentService(JdbcTemplate jdbc,TrainingWorkflowGuard guard,AuditLogService audit){this.jdbc=jdbc;this.guard=guard;this.audit=audit;}
 private static final String PROFILE="SELECT p.trainer_id,p.user_id,d.bio,d.qualifications,d.status,d.created_at,u.full_name,u.email FROM dbo.Trainer p JOIN dbo.Trainer_Detail d ON d.trainer_id=p.trainer_id JOIN dbo.[User] u ON u.user_id=p.user_id";
 public Map<String,Object> createProfile(ProfileRequest body){
  var users=jdbc.queryForList("SELECT user_id FROM dbo.[User] WITH(UPDLOCK,HOLDLOCK) WHERE user_id=? AND role_id='ROL-002' AND status='ACTIVE' AND email_verified=1",body.userId());
  if(users.isEmpty())throw new BusinessRuleException("Profile requires an active verified HEAD_TRAINER account");
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Trainer WHERE user_id=?",Integer.class,body.userId())>0)throw new BusinessRuleException("Trainer profile already exists");
  String id=com.raceforge.backend.common.id.BusinessIds.next("HTR-");
  jdbc.update("INSERT dbo.Trainer(trainer_id,user_id) VALUES(?,?)",id,body.userId());
  jdbc.update("INSERT dbo.Trainer_Detail(trainer_id,bio,qualifications) VALUES(?,?,?)",id,body.bio(),body.qualifications());return profile(id);
 }
 public Map<String,Object> updateProfile(String id,ProfileUpdate body){
  var p=profile(id);var actor=guard.actor();if(!"ADMIN".equals(actor.roleName())&&!actor.userId().equals(p.get("user_id")))throw new org.springframework.security.access.AccessDeniedException("Only the profile owner or admin can update the trainer profile");
  jdbc.update("UPDATE dbo.Trainer_Detail SET bio=?,qualifications=? WHERE trainer_id=?",body.bio(),body.qualifications(),id);return profile(id);
 }
 public Map<String,Object> profileStatus(String id,String status){
  profile(id);if(!Set.of("ACTIVE","INACTIVE").contains(status))throw new BusinessRuleException("Profile status must be ACTIVE or INACTIVE");
  jdbc.update("UPDATE dbo.Trainer_Detail SET status=? WHERE trainer_id=?",status,id);
  if("INACTIVE".equals(status))jdbc.update("DELETE FROM dbo.Horse_Trainer WHERE trainer_id=?",id);
  else jdbc.update("INSERT dbo.Horse_Trainer(horse_id,trainer_id) SELECT DISTINCT a.horse_id,p.trainer_id FROM dbo.Horse_Assignment a JOIN dbo.Trainer p ON p.user_id=a.assignee_id WHERE p.trainer_id=? AND a.kind='TRAINER' AND a.status='ACCEPTED' AND NOT EXISTS(SELECT 1 FROM dbo.Horse_Trainer ht WHERE ht.horse_id=a.horse_id AND ht.trainer_id=p.trainer_id)",id);
  return profile(id);
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> profiles(){return jdbc.queryForList(PROFILE+" ORDER BY u.full_name");}
 @Transactional(readOnly=true) public Map<String,Object> profile(String id){return one(PROFILE+" WHERE p.trainer_id=?",id);}
 public Map<String,Object> assign(AssignmentRequest body){
  var pack=guard.paidPackage(body.horsePackageId());
  var p=one(PROFILE+" WHERE p.trainer_id=? AND d.status='ACTIVE' AND u.role_id='ROL-002' AND u.status='ACTIVE' AND u.email_verified=1",body.trainerId());
  String user=(String)p.get("user_id");
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse_Assignment a JOIN dbo.Training_Assignment ta ON ta.assignment_id=a.id WHERE a.kind='TRAINER' AND ta.horse_package_id=? AND a.assignee_id=? AND a.status IN ('ASSIGNED','ACCEPTED')",Integer.class,body.horsePackageId(),user)>0)throw new BusinessRuleException("This trainer already has an open assignment for the package");
  String id=com.raceforge.backend.common.id.BusinessIds.next("ASN-");
  jdbc.update("INSERT dbo.Horse_Assignment(id,horse_id,kind,assigned_by,assignee_id,status,created_at) VALUES(?,?,'TRAINER',?,?,'ASSIGNED',SYSDATETIME())",id,pack.getHorse().getHorseId(),guard.actor().userId(),user);
  jdbc.update("INSERT dbo.Training_Assignment(assignment_id,horse_package_id) VALUES(?,?)",id,body.horsePackageId());
  audit.record(guard.actor().userId(),pack.getHorse().getHorseId(),"HORSE_ASSIGNMENT",id.toString(),"TRAINER_ASSIGNED","SUCCESS",body.trainerId().toString());return details(id);
 }
 public Map<String,Object> respond(String id,Decision decision){
  var row=locked(id);if(!guard.actor().userId().equals(row.get("assignee_id")))throw new org.springframework.security.access.AccessDeniedException("Only the assigned trainer can respond");
  if(!"ASSIGNED".equals(row.get("status")))throw new BusinessRuleException("Only assigned requests can be answered");
  if(!decision.accepted()&&(decision.reason()==null||decision.reason().isBlank()))throw new BusinessRuleException("A rejection reason is required");
  if(decision.accepted()){
   guard.paidPackage((String)row.get("horse_package_id"));
   var p=profile((String)row.get("trainer_id"));if(!"ACTIVE".equals(p.get("status")))throw new BusinessRuleException("Trainer profile is inactive");
   one("SELECT user_id FROM dbo.[User] WHERE user_id=? AND role_id='ROL-002' AND status='ACTIVE' AND email_verified=1",guard.actor().userId());
   jdbc.update("INSERT dbo.Horse_Trainer(horse_id,trainer_id) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM dbo.Horse_Trainer WITH(UPDLOCK,HOLDLOCK) WHERE horse_id=? AND trainer_id=?)",row.get("horse_id"),row.get("trainer_id"),row.get("horse_id"),row.get("trainer_id"));
  }
  jdbc.update("UPDATE dbo.Horse_Assignment SET status=?,responded_at=SYSDATETIME(),reason=? WHERE id=? AND kind='TRAINER'",decision.accepted()?"ACCEPTED":"DECLINED",decision.reason(),id);
  audit.record(guard.actor().userId(),(String)row.get("horse_id"),"HORSE_ASSIGNMENT",id.toString(),decision.accepted()?"TRAINER_ACCEPTED":"TRAINER_DECLINED","SUCCESS",decision.reason());return details(id);
 }
 public Map<String,Object> end(String id,String reason){return close(id,reason,"CANCELLED");}
 private Map<String,Object> close(String id,String reason,String status){
  var row=locked(id);if(!Set.of("ASSIGNED","ACCEPTED").contains(row.get("status")))throw new BusinessRuleException("Assignment is already closed");
  jdbc.update("UPDATE dbo.Horse_Assignment SET status=?,reason=? WHERE id=? AND kind='TRAINER'",status,reason,id);
  jdbc.update("UPDATE dbo.Training_Assignment SET ended_at=SYSDATETIME() WHERE assignment_id=?",id);
  jdbc.update("DELETE ht FROM dbo.Horse_Trainer ht JOIN dbo.Trainer p ON p.trainer_id=ht.trainer_id WHERE ht.horse_id=? AND p.user_id=? AND NOT EXISTS(SELECT 1 FROM dbo.Horse_Assignment a WHERE a.kind='TRAINER' AND a.status='ACCEPTED' AND a.horse_id=ht.horse_id AND a.assignee_id=p.user_id)",row.get("horse_id"),row.get("assignee_id"));
  audit.record(guard.actor().userId(),(String)row.get("horse_id"),"HORSE_ASSIGNMENT",id.toString(),"TRAINER_ASSIGNMENT_"+status,"SUCCESS",reason);return details(id);
 }
 public Map<String,Object> replace(String id,Replacement body){var old=locked(id);if(body.trainerId().equals(old.get("trainer_id")))throw new BusinessRuleException("Select a different trainer");close(id,body.reason(),"REASSIGNED");return assign(new AssignmentRequest((String)old.get("horse_package_id"),body.trainerId()));}
 @Transactional(readOnly=true) public List<Map<String,Object>> mine(){return jdbc.queryForList(SELECT+" WHERE a.kind='TRAINER' AND a.assignee_id=? ORDER BY a.created_at DESC",guard.actor().userId());}
 @Transactional(readOnly=true) public List<Map<String,Object>> history(String trainerId){authorizeProfile(trainerId);return jdbc.queryForList(SELECT+" WHERE a.kind='TRAINER' AND p.trainer_id=? ORDER BY a.created_at DESC",trainerId);}
 @Transactional(readOnly=true) public List<Map<String,Object>> forPackage(String id){
  var actor=guard.actor();var row=one("SELECT h.owner_id FROM dbo.HORSE_PACKAGE hp JOIN dbo.Horse h ON h.horse_id=hp.horse_id WHERE hp.horse_package_id=?",id);
  if(!Set.of("CLUB_MANAGER","ADMIN").contains(actor.roleName())&&!actor.userId().equals(row.get("owner_id"))&&!guard.canAccessPackage(id,actor.userId()))throw new org.springframework.security.access.AccessDeniedException("Package assignment history is restricted");
  return jdbc.queryForList(SELECT+" WHERE a.kind='TRAINER' AND ta.horse_package_id=? ORDER BY a.created_at DESC",id);
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> sessionHistory(String id){var p=authorizeProfile(id);return jdbc.queryForList("SELECT ts.*,h.horse_name,p.plan_name,p.horse_package_id FROM dbo.Training_Session ts JOIN dbo.Training_Plan p ON p.plan_id=ts.plan_id JOIN dbo.Horse h ON h.horse_id=ts.horse_id WHERE ts.recorded_by=? ORDER BY ts.actual_end DESC,ts.scheduled_start DESC",p.get("user_id"));}
 private Map<String,Object> authorizeProfile(String id){var p=profile(id);var actor=guard.actor();if(!Set.of("ADMIN","CLUB_MANAGER").contains(actor.roleName())&&!actor.userId().equals(p.get("user_id")))throw new org.springframework.security.access.AccessDeniedException("Trainer history is restricted");return p;}
 private static final String SELECT="SELECT a.*,a.id AS assignment_id,ta.horse_package_id,ta.ended_at,p.trainer_id,p.user_id,u.full_name AS trainer_name,h.horse_name,tp.package_name,manager.full_name AS assigned_by_name FROM dbo.Horse_Assignment a JOIN dbo.Training_Assignment ta ON ta.assignment_id=a.id JOIN dbo.Trainer p ON p.user_id=a.assignee_id JOIN dbo.[User] u ON u.user_id=a.assignee_id JOIN dbo.[User] manager ON manager.user_id=a.assigned_by JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=ta.horse_package_id JOIN dbo.Horse h ON h.horse_id=a.horse_id JOIN dbo.TRAINING_PACKAGE tp ON tp.package_id=hp.package_id";
 private Map<String,Object> details(String id){return one(SELECT+" WHERE a.id=? AND a.kind='TRAINER'",id);}
 private Map<String,Object> locked(String id){var row=details(id);jdbc.queryForList("SELECT horse_id FROM dbo.Horse WITH(UPDLOCK,HOLDLOCK) WHERE horse_id=?",row.get("horse_id"));jdbc.queryForList("SELECT horse_package_id FROM dbo.HORSE_PACKAGE WITH(UPDLOCK,HOLDLOCK) WHERE horse_package_id=?",row.get("horse_package_id"));jdbc.queryForList("SELECT id FROM dbo.Horse_Assignment WITH(UPDLOCK,HOLDLOCK) WHERE id=?",id);return details(id);}
 private Map<String,Object> one(String sql,Object... args){var rows=jdbc.queryForList(sql,args);if(rows.isEmpty())throw new ResourceNotFoundException("Trainer profile or assignment not found");return rows.get(0);}
}

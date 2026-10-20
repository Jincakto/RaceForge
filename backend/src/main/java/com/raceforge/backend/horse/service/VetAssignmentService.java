package com.raceforge.backend.horse.service;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.audit.service.AuditLogService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @Transactional
public class VetAssignmentService {
 private final JdbcTemplate jdbc;private final AuditLogService audit;
 public VetAssignmentService(JdbcTemplate jdbc,AuditLogService audit){this.jdbc=jdbc;this.audit=audit;}
 public Map<String,Object> assign(String horseId,String userId,String actor){
  lockHorse(horseId);
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.[User] u JOIN dbo.Role r ON r.role_id=u.role_id WHERE u.user_id=? AND r.role_name='VETERINARIAN' AND u.status='ACTIVE' AND u.email_verified=1",Integer.class,userId)!=1)throw new BusinessRuleException("Select an active verified veterinarian");
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse_Assignment WHERE horse_id=? AND kind='VET' AND status IN ('ASSIGNED','ACCEPTED')",Integer.class,horseId)>0)throw new BusinessRuleException("Close or replace the existing veterinary assignment first");
  String id=com.raceforge.backend.common.id.BusinessIds.next("ASN-");
  jdbc.update("INSERT dbo.Horse_Assignment(id,horse_id,kind,assigned_by,assignee_id,status,created_at) VALUES(?,?,'VET',?,?,'ASSIGNED',SYSDATETIME())",id,horseId,actor,userId);
  audit.record(actor,horseId,"HORSE_ASSIGNMENT",id.toString(),"VET_ASSIGNED","SUCCESS",userId);return one(id);
 }
 public Map<String,Object> respond(String id,String actor,boolean accepted,String reason){
  var row=locked(id);if(!actor.equals(row.get("assignee_id")))throw new org.springframework.security.access.AccessDeniedException("Only the assigned veterinarian may respond");
  if(!"ASSIGNED".equals(row.get("status")))throw new BusinessRuleException("Only assigned requests may be answered");
  if(!accepted&&(reason==null||reason.isBlank()))throw new BusinessRuleException("A decline reason is required");
  jdbc.update("UPDATE dbo.Horse_Assignment SET status=?,responded_at=SYSDATETIME(),reason=? WHERE id=?",accepted?"ACCEPTED":"DECLINED",reason,id);
  audit.record(actor,(String)row.get("horse_id"),"HORSE_ASSIGNMENT",id.toString(),accepted?"VET_ACCEPTED":"VET_DECLINED","SUCCESS",reason);return one(id);
 }
 public Map<String,Object> replace(String id,String newVet,String actor,String reason){
  var row=locked(id);if(!Set.of("ASSIGNED","ACCEPTED").contains(row.get("status")))throw new BusinessRuleException("Only open assignments may be replaced");
  if(newVet.equals(row.get("assignee_id")))throw new BusinessRuleException("Choose another veterinarian");
  jdbc.update("UPDATE dbo.Medical_Record SET status='CANCELLED',updated_at=SYSDATETIME() WHERE medical_record_id=? AND status='DRAFT'",row.get("medical_record_id"));
  jdbc.update("UPDATE dbo.Horse_Assignment SET status='REASSIGNED',reason=? WHERE id=?",reason,id);
  audit.record(actor,(String)row.get("horse_id"),"HORSE_ASSIGNMENT",id.toString(),"VET_REASSIGNED","SUCCESS",reason);
  return assign((String)row.get("horse_id"),newVet,actor);
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> mine(String user){return jdbc.queryForList("SELECT a.*,h.horse_name FROM dbo.Horse_Assignment a JOIN dbo.Horse h ON h.horse_id=a.horse_id WHERE a.kind='VET' AND a.assignee_id=? ORDER BY a.created_at DESC",user);}
 public String requireAccepted(String horseId,String user,String id){
  lockHorse(horseId);
  var rows=jdbc.queryForList("SELECT id,medical_record_id FROM dbo.Horse_Assignment WITH(UPDLOCK,HOLDLOCK) WHERE horse_id=? AND assignee_id=? AND kind='VET' AND status='ACCEPTED' AND (? IS NULL OR id=?)",horseId,user,id,id);
  if(rows.size()!=1)throw new BusinessRuleException("Select one accepted veterinary assignment for this horse");
  return (String)rows.get(0).get("id");
 }
 public Map<String,Object> attachDraft(String id,String record,String actor){
  var assignment=locked(id);
  if(!actor.equals(assignment.get("assignee_id")))throw new org.springframework.security.access.AccessDeniedException("Only the assigned veterinarian may link a draft");
  requireAccepted((String)assignment.get("horse_id"),actor,id);
  var rows=jdbc.queryForList("SELECT mr.medical_record_id FROM dbo.Medical_Record mr JOIN dbo.Health_Profile hp ON hp.profile_id=mr.profile_id WHERE mr.medical_record_id=? AND mr.veterinarian_id=? AND mr.status='DRAFT' AND hp.horse_id=?",record,actor,assignment.get("horse_id"));
  if(rows.size()!=1)throw new BusinessRuleException("Select your draft for the assigned horse");
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse_Assignment WHERE medical_record_id=? AND kind='VET'",Integer.class,record)>0)throw new BusinessRuleException("This draft already belongs to an assignment");
  attach(id,record);audit.record(actor,(String)assignment.get("horse_id"),"HORSE_ASSIGNMENT",id.toString(),"VET_DRAFT_LINKED","SUCCESS",record);return one(id);
 }
 public void attach(String id,String record){
  var row=one(id);if(row.get("medical_record_id")!=null)throw new BusinessRuleException("This assignment already has an examination record; update its draft instead");
  jdbc.update("UPDATE dbo.Horse_Assignment SET medical_record_id=? WHERE id=?",record,id);
 }
 public void requireRecord(String horseId,String user,String record){
  lockHorse(horseId);
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse_Assignment WITH(UPDLOCK,HOLDLOCK) WHERE horse_id=? AND assignee_id=? AND kind='VET' AND status='ACCEPTED' AND medical_record_id=?",Integer.class,horseId,user,record)!=1)throw new BusinessRuleException("An accepted current veterinary assignment is required for this draft");
 }
 public void complete(String record){jdbc.update("UPDATE dbo.Horse_Assignment SET status='COMPLETED' WHERE medical_record_id=? AND kind='VET' AND status='ACCEPTED'",record);}
 private void lockHorse(String id){if(jdbc.queryForList("SELECT horse_id FROM dbo.Horse WITH(UPDLOCK,HOLDLOCK) WHERE horse_id=?",id).isEmpty())throw new ResourceNotFoundException("Horse not found");}
 private Map<String,Object> locked(String id){var row=one(id);lockHorse((String)row.get("horse_id"));jdbc.queryForList("SELECT id FROM dbo.Horse_Assignment WITH(UPDLOCK,HOLDLOCK) WHERE id=?",id);return one(id);}
 private Map<String,Object> one(String id){var rows=jdbc.queryForList("SELECT * FROM dbo.Horse_Assignment WHERE id=? AND kind='VET'",id);if(rows.isEmpty())throw new ResourceNotFoundException("Veterinary assignment not found");return rows.get(0);}
}

package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Map;

/** Central business guard, used by every plan/session write path. */
@Service
public class TrainingWorkflowGuard {
 private final JdbcTemplate jdbc;
 private final HorsePackageRepository packages;
 @org.springframework.beans.factory.annotation.Autowired private com.raceforge.backend.training.support.TrainingMedicalReader medicalReader;
 @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
 public TrainingWorkflowGuard(JdbcTemplate jdbc,HorsePackageRepository packages){this.jdbc=jdbc;this.packages=packages;}
 public AuthenticatedUser actor(){
  var auth=SecurityContextHolder.getContext().getAuthentication();
  if(auth==null||!auth.isAuthenticated()||!(auth.getPrincipal() instanceof AuthenticatedUser user)||!"ACTIVE".equals(user.status()))throw new org.springframework.security.access.AccessDeniedException("Active authenticated account required");
  return user;
 }
 public HorsePackage paidPackage(String id){
  if(id==null||id.isBlank())throw new BusinessRuleException("A paid horse package is required");
  HorsePackage pack=packages.findById(id).orElseThrow(()->new ResourceNotFoundException("Horse package not found"));
  // Use the same lock order as payment: horse -> package -> assignment.
  jdbc.queryForList("SELECT horse_id FROM dbo.Horse WITH(UPDLOCK,HOLDLOCK) WHERE horse_id=?",pack.getHorse().getHorseId());
  jdbc.queryForList("SELECT horse_package_id FROM dbo.HORSE_PACKAGE WITH(UPDLOCK,HOLDLOCK) WHERE horse_package_id=?",id);
  entityManager.refresh(pack.getHorse());entityManager.refresh(pack);
  if(!"ACTIVE".equals(pack.getStatus())||!"PAID".equals(pack.getPaymentStatus())||pack.getStartDate()==null||pack.getEndDate()==null||pack.getEndDate().isBefore(pack.getStartDate())||pack.getEndDate().isBefore(LocalDate.now()))throw new BusinessRuleException("Horse package must be active, paid and within its valid period");
  requireHealthy(pack.getHorse());return pack;
 }
 public Map<String,Object> medical(Horse horse){return medicalReader.snapshot(horse.getHorseId());}
 public void requireHealthy(Horse horse){
  if(!"APPROVED".equals(horse.getAdmissionStatus())||!"ACTIVE".equals(horse.getStatus())||Boolean.TRUE.equals(horse.getTrainingLocked())||!"READY".equals(horse.getHealthStatus()))throw new BusinessRuleException("Horse must be admitted, active, medically ready and unlocked");
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Lock WHERE horse_id=? AND unlocked_at IS NULL",Integer.class,horse.getHorseId())>0)throw new BusinessRuleException("Horse has an active medical training lock");
  var medical=medical(horse);
  if(!Boolean.TRUE.equals(medical.get("training_eligible"))||(medical.get("final_conclusion")==null || !java.util.Set.of("FIT","FIT_WITH_MONITORING").contains(medical.get("final_conclusion"))))throw new BusinessRuleException("Latest confirmed examination does not authorize training");
 }
 public java.math.BigDecimal weight(Horse horse){return medicalReader.weight(horse.getHorseId());}
 public boolean canAccessPackage(String packageId,String userId){
  return jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse_Assignment a JOIN dbo.Training_Assignment ta ON ta.assignment_id=a.id JOIN dbo.Trainer p ON p.user_id=a.assignee_id JOIN dbo.Trainer_Detail d ON d.trainer_id=p.trainer_id JOIN dbo.Horse_Trainer ht ON ht.horse_id=a.horse_id AND ht.trainer_id=p.trainer_id JOIN dbo.[User] u ON u.user_id=p.user_id WHERE a.kind='TRAINER' AND ta.horse_package_id=? AND p.user_id=? AND a.status='ACCEPTED' AND d.status='ACTIVE' AND u.status='ACTIVE' AND u.email_verified=1 AND u.role_id=(SELECT role_id FROM dbo.Role WHERE role_name='HEAD_TRAINER')",Integer.class,packageId,userId)>0;
 }
 public HorsePackage assignedPackage(String packageId){
  var user=actor();if(!"HEAD_TRAINER".equals(user.roleName())||!canAccessPackage(packageId,user.userId()))throw new org.springframework.security.access.AccessDeniedException("An accepted trainer assignment is required");
  var pack=paidPackage(packageId);
  if(!canAccessPackage(packageId,user.userId()))throw new org.springframework.security.access.AccessDeniedException("An accepted current trainer assignment is required for this package");
  return pack;
 }
 public HorsePackage visiblePackage(String packageId){
  var user=actor();if(!"HEAD_TRAINER".equals(user.roleName())||!canAccessPackage(packageId,user.userId()))throw new org.springframework.security.access.AccessDeniedException("An accepted trainer assignment is required");
  return packages.findById(packageId).orElseThrow(()->new ResourceNotFoundException("Horse package not found"));
 }
 public HorsePackage assignment(String assignmentId,String horseId){
  var rows=jdbc.queryForList("SELECT ta.horse_package_id,a.assignee_id AS user_id FROM dbo.Horse_Assignment a JOIN dbo.Training_Assignment ta ON ta.assignment_id=a.id WHERE a.id=? AND a.kind='TRAINER' AND a.status='ACCEPTED'",assignmentId);
  if(rows.isEmpty()||!actor().userId().equals(rows.get(0).get("user_id")))throw new org.springframework.security.access.AccessDeniedException("Select your accepted trainer assignment");
  var pack=assignedPackage((String)rows.get(0).get("horse_package_id"));
  if(!pack.getHorse().getHorseId().equals(horseId))throw new BusinessRuleException("Assignment belongs to another horse");return pack;
 }
 public void requirePlan(TrainingPlan plan){
  if(!"ACTIVE".equals(plan.getStatus()))throw new BusinessRuleException("Training plan must be active");
  var pack=assignedPackage(plan.getHorsePackageId());
  if(plan.getPackageType()!=null&&!plan.getPackageType().equals(pack.getTrainingPackage().getPackageType()))throw new BusinessRuleException("Package type changed after this plan was created; review and create a new matching roadmap");
 }
 public void authorizePlan(TrainingPlan plan){
  var user=actor();if(!"HEAD_TRAINER".equals(user.roleName())||plan.getHorsePackageId()==null||!canAccessPackage(plan.getHorsePackageId(),user.userId()))throw new org.springframework.security.access.AccessDeniedException("An accepted current trainer assignment is required");
 }
 public void requirePackageDate(TrainingPlan plan,String horseId,LocalDate day){
  var pack=assignedPackage(plan.getHorsePackageId());
  if(!pack.getHorse().getHorseId().equals(horseId)||day.isBefore(pack.getStartDate())||day.isAfter(pack.getEndDate()))throw new BusinessRuleException("Session must belong to the horse and date range of the paid plan package");
 }
}

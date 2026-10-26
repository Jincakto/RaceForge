package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only package templates and current medical context; no stored suggestion snapshots. */
@Service
@Transactional(readOnly=true)
public class TrainingPackageContextService {
 private final JdbcTemplate jdbc;
 private final TrainingWorkflowGuard guard;
 private final PackageRoadmapPolicy packageRoadmaps;
 public TrainingPackageContextService(JdbcTemplate jdbc, TrainingWorkflowGuard guard, PackageRoadmapPolicy packageRoadmaps) {
  this.jdbc=jdbc;this.guard=guard;this.packageRoadmaps=packageRoadmaps;
 }
 @Transactional(readOnly=true) public Map<String,Object> context(String packageId){
  var pack=guard.visiblePackage(packageId);var horse=pack.getHorse();Map<String,Object> result=new LinkedHashMap<>();
  result.put("horseId",horse.getHorseId());result.put("horseName",horse.getHorseName());result.put("weightKg",guard.weight(horse));result.put("height",horse.getHeight());result.put("dateOfBirth",horse.getDateOfBirth());result.put("breed",horse.getBreed());result.put("gender",horse.getGender());result.put("healthStatus",horse.getHealthStatus());result.put("trainingLocked",horse.getTrainingLocked());result.put("admissionStatus",horse.getAdmissionStatus());
  result.put("horsePackageId",packageId);result.put("packageName",pack.getTrainingPackage().getPackageName());result.put("packageStatus",pack.getStatus());result.put("paymentStatus",pack.getPaymentStatus());result.put("startDate",pack.getStartDate());result.put("endDate",pack.getEndDate());
  List<String> reasons=new ArrayList<>();Map<String,Object> medical=null;
  try{medical=guard.medical(horse);}catch(BusinessRuleException ex){reasons.add(ex.getMessage());}
  Map<String,Object> fitness=new LinkedHashMap<>();
  if(medical!=null){for(String field:List.of("medical_record_id","veterinarian_name","examined_at","fitness_conclusion","training_eligible","body_temperature","resting_heart_rate","resting_respiratory_rate","body_condition_score","ideal_weight","measured_weight"))fitness.put(field,medical.get(field));}
  result.put("latestMedical",fitness);
  result.put("packageType",pack.getTrainingPackage().getPackageType());
  result.put("roadmapTemplate",registeredTemplate(packageId));
  try{guard.requireHealthy(horse);}catch(BusinessRuleException ex){if(!reasons.contains(ex.getMessage()))reasons.add(ex.getMessage());}
  if(!"ACTIVE".equals(pack.getStatus())||!"PAID".equals(pack.getPaymentStatus())||pack.getEndDate()==null||pack.getEndDate().isBefore(java.time.LocalDate.now()))reasons.add("Package is not currently active, paid and valid");
  result.put("trainingAllowed",reasons.isEmpty());result.put("blockingReasons",reasons);return result;
 }
 @Transactional(readOnly=true) public PackageRoadmapPolicy.Template registeredTemplate(String packageId){
  var pack=guard.visiblePackage(packageId);
  if(pack.getStartDate()==null||pack.getEndDate()==null)throw new BusinessRuleException("Registered package dates are required");
  return packageRoadmaps.template(pack.getTrainingPackage().getPackageType(),(int)java.time.temporal.ChronoUnit.DAYS.between(pack.getStartDate(),pack.getEndDate())+1);
 }
 @Transactional(readOnly=true) public PackageRoadmapPolicy.Template catalogTemplate(String packageId){
  var rows=jdbc.queryForList("SELECT package_type,duration_days FROM dbo.TRAINING_PACKAGE WHERE package_id=?",packageId);
  if(rows.isEmpty())throw new ResourceNotFoundException("Training package not found");
  return packageRoadmaps.template((String)rows.get(0).get("package_type"),((Number)rows.get(0).get("duration_days")).intValue());
 }
}

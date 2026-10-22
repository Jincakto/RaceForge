package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.training.service.TrainingIds;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.*;

/** Package curriculum suggestions reviewed and confirmed by the assigned trainer. */
@Service
@Transactional
public class TrainingRecommendationService {
 @org.springframework.beans.factory.annotation.Autowired private PackageRoadmapPolicy packageRoadmaps;
 private final JdbcTemplate jdbc;private final TrainingWorkflowGuard guard;private final ObjectMapper json;
 public TrainingRecommendationService(JdbcTemplate jdbc,TrainingWorkflowGuard guard,ObjectMapper json){this.jdbc=jdbc;this.guard=guard;this.json=json;}
 public String encode(Object value){return json.writeValueAsString(value);}
 public List<Stage> decodeStages(String text){return Arrays.asList(json.readValue(text,Stage[].class));}
 public static void validateStages(List<Stage> stages,int days){
  if(stages==null||stages.isEmpty()||stages.size()>100)throw new BusinessRuleException("Provide 1..100 roadmap stages");
  int last=0;
  for(Stage s:stages.stream().sorted(Comparator.comparingInt(Stage::startDay)).toList()){
   if(s.startDay()<1||s.endDay()<s.startDay()||s.endDay()>days||s.startDay()<=last||s.activityName()==null||s.activityName().isBlank()||s.activityName().length()>500||s.daysOfWeek()==null||s.daysOfWeek().isEmpty()||s.daysOfWeek().size()>6||s.daysOfWeek().stream().anyMatch(Objects::isNull)||s.sessionTime()==null||s.sessionEndTime()==null||!s.sessionEndTime().isAfter(s.sessionTime())||!Set.of("LOW","MODERATE","HIGH").contains(s.intensity()))throw new BusinessRuleException("Stages must be non-overlapping, within the allowed period, with valid activity, one to six weekdays, start/end time and intensity");
   last=s.endDay();
  }
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
 @Transactional(readOnly=true) public Map<String,Object> savedRecommendation(String id){
  var row=one("SELECT * FROM dbo.Training_Recommendation WHERE recommendation_id=?",id);guard.visiblePackage((String)row.get("horse_package_id"));
  @SuppressWarnings("unchecked") Map<String,Object> value=json.readValue((String)row.get("snapshot_json"),Map.class);value.put("recommendationId",id);value.put("createdAt",row.get("created_at"));return value;
 }
 public Map<String,Object> recommend(String packageId,RecommendationRequest request){
  var pack=guard.assignedPackage(packageId);var horse=pack.getHorse();var accepted=guard.assignment(request.assignmentId(),horse.getHorseId());
  if(!accepted.getHorsePackageId().equals(packageId))throw new BusinessRuleException("Assignment must belong to the selected package");
  if(guard.weight(horse)==null||guard.weight(horse).signum()<=0)throw new BusinessRuleException("A measured horse weight in kg is required before automatic suggestions");
  var medical=guard.medical(horse);
  Map<String,Object> snapshot=new LinkedHashMap<>();snapshot.put("horseId",horse.getHorseId());snapshot.put("horseName",horse.getHorseName());snapshot.put("weightKg",guard.weight(horse));snapshot.put("height",horse.getHeight());snapshot.put("dateOfBirth",horse.getDateOfBirth());snapshot.put("breed",horse.getBreed());snapshot.put("healthStatus",horse.getHealthStatus());
  snapshot.put("medicalRecordId",medical.get("medical_record_id"));snapshot.put("examinedAt",medical.get("examined_at"));snapshot.put("veterinarianName",medical.get("veterinarian_name"));snapshot.put("fitnessConclusion",medical.get("fitness_conclusion"));snapshot.put("bodyTemperatureC",medical.get("body_temperature"));snapshot.put("restingHeartRateBpm",medical.get("resting_heart_rate"));snapshot.put("restingRespiratoryRate",medical.get("resting_respiratory_rate"));snapshot.put("bodyConditionScore",medical.get("body_condition_score"));snapshot.put("idealWeightKg",medical.get("ideal_weight"));snapshot.put("veterinarianMeasuredWeightKg",medical.get("measured_weight"));
  int packageDays=(int)java.time.temporal.ChronoUnit.DAYS.between(pack.getStartDate(),pack.getEndDate())+1;
  var template=packageRoadmaps.template(pack.getTrainingPackage().getPackageType(),packageDays);
  var suggestedStages=packageRoadmaps.suggestedStages(template);
  snapshot.put("packageType",pack.getTrainingPackage().getPackageType());snapshot.put("roadmapVersion",PackageRoadmapPolicy.VERSION);
  snapshot.put("roadmapStages",packageRoadmaps.apply(pack.getTrainingPackage().getPackageType(),suggestedStages,packageDays));
  snapshot.put("packageName",pack.getTrainingPackage().getPackageName());snapshot.put("startDate",pack.getStartDate());snapshot.put("endDate",pack.getEndDate());
  snapshot.put("stages",suggestedStages);snapshot.put("sources",template.sources());snapshot.put("rationale",template.goal());snapshot.put("requiresTrainerConfirmation",true);
  snapshot.put("ruleVersion","PACKAGE_SUGGESTION_V1");snapshot.put("limitations","Draft planning defaults only, not a veterinary prescription. Weight and resting heart rate are displayed for trainer review; they do not automatically determine workload. The trainer must review and adjust activities, intensity and times before generating sessions.");
  String id=TrainingIds.next("REC-");jdbc.update("INSERT dbo.Training_Recommendation(recommendation_id,horse_package_id,assignment_id,medical_record_id,generated_by,snapshot_json) VALUES(?,?,?,?,?,?)",id,packageId,request.assignmentId(),medical.get("medical_record_id"),guard.actor().userId(),encode(snapshot));
  snapshot.put("recommendationId",id);return snapshot;
 }
 @Transactional(readOnly=true) public List<Stage> stagesForPlan(String id,String packageId,String assignmentId){
  var row=one("SELECT * FROM dbo.Training_Recommendation WHERE recommendation_id=?",id);
  if(!packageId.equals(row.get("horse_package_id"))||!assignmentId.equals(row.get("assignment_id"))||!guard.actor().userId().equals(row.get("generated_by")))throw new BusinessRuleException("Recommendation belongs to another package, assignment or trainer");
  var pack=guard.assignedPackage(packageId);var latest=guard.medical(pack.getHorse());var snapshot=json.readTree((String)row.get("snapshot_json"));
  if(!PackageRoadmapPolicy.VERSION.equals(snapshot.path("roadmapVersion").asText())||!pack.getTrainingPackage().getPackageType().equals(snapshot.path("packageType").asText())||!"PACKAGE_SUGGESTION_V1".equals(snapshot.path("ruleVersion").asText())||!latest.get("medical_record_id").equals(row.get("medical_record_id"))||guard.weight(pack.getHorse())==null||guard.weight(pack.getHorse()).compareTo(snapshot.get("weightKg").decimalValue())!=0||!pack.getStartDate().toString().equals(snapshot.get("startDate").asText())||!pack.getEndDate().toString().equals(snapshot.get("endDate").asText()))throw new BusinessRuleException("Recommendation is stale after medical, weight or package changes; generate a new suggestion");
  return Arrays.asList(json.treeToValue(snapshot.get("stages"),Stage[].class));
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
 private Map<String,Object> one(String query,Object... args){var rows=jdbc.queryForList(query,args);if(rows.isEmpty())throw new ResourceNotFoundException("Training protocol or recommendation not found");return rows.get(0);}
}

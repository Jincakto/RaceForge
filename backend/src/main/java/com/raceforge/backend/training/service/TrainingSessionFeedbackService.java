package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

/** Descriptive decision support only; no diagnosis, clinical cutoffs or automatic schedule changes. */
@Service
public class TrainingSessionFeedbackService {
 private final TrainingSessionRepository sessions;private final TrainingWorkflowGuard guard;private final JdbcTemplate jdbc;
 public TrainingSessionFeedbackService(TrainingSessionRepository sessions,TrainingWorkflowGuard guard,JdbcTemplate jdbc){this.sessions=sessions;this.guard=guard;this.jdbc=jdbc;}
 @Transactional(readOnly=true)
 public Map<String,Object> feedback(String id){
  var s=sessions.findById(id).orElseThrow(()->new ResourceNotFoundException("Training session not found"));guard.authorizePlan(s.getPlan());
  Map<String,Object> result=new LinkedHashMap<>();
  result.put("sessionId",id);result.put("horsePackageId",s.getPlan().getHorsePackageId());
  result.put("restingHeartRate",s.getRestingHeartRate());result.put("restingMedicalRecordId",s.getRestingMedicalRecordId());result.put("restingMeasuredAt",s.getRestingMeasuredAt());
  result.put("requiresTrainerConfirmation",true);result.put("automaticScheduleChange",false);
  List<String> observations=new ArrayList<>();
  if(s.getRestingHeartRate()==null)observations.add("No resting heart rate is available from confirmed medical records; no normal value is assumed.");
  else observations.add("Resting heart rate is a dated medical observation, not a measurement immediately before this workout.");
  Long delay=s.getActualEnd()!=null && s.getRecoveryMeasuredAt()!=null?java.time.Duration.between(s.getActualEnd(),s.getRecoveryMeasuredAt()).getSeconds():null;
  result.put("recoveryDelaySeconds",delay);
  boolean measured="COMPLETED".equals(s.getStatus()) && s.getEndExerciseHeartRate()!=null && s.getRecoveryHeartRate2Min()!=null && delay!=null;
  Integer drop=measured?s.getEndExerciseHeartRate()-s.getRecoveryHeartRate2Min():null;result.put("heartRateDrop2Min",drop);
  List<Map<String,Object>> history=List.of();
  if(measured && delay==120L && s.getTrainingStage()!=null){
   history=jdbc.queryForList("SELECT TOP 5 ts.session_id,ts.actual_end,ts.distance,ts.avg_speed,ts.actual_start,ts.end_exercise_heart_rate,ts.recovery_heart_rate_2_min,ts.resting_heart_rate FROM dbo.Training_Session ts JOIN dbo.Training_Stage st ON st.stage_id=ts.training_stage_id JOIN dbo.Training_Plan p ON p.plan_id=ts.plan_id WHERE ts.horse_id=? AND p.horse_package_id=? AND ts.session_id<>? AND ts.status='COMPLETED' AND ts.actual_end<? AND ts.end_exercise_heart_rate IS NOT NULL AND ts.recovery_heart_rate_2_min IS NOT NULL AND ts.recovery_measured_at=DATEADD(second,120,ts.actual_end) AND st.activity_name=? AND ts.intensity=? AND ts.distance=? ORDER BY ts.actual_end DESC",s.getHorse().getHorseId(),s.getPlan().getHorsePackageId(),id,s.getActualEnd(),s.getTrainingStage().getActivityName(),s.getIntensity(),s.getDistance());
  }
  result.put("candidateHistory",history);
  if(!measured)observations.add("Complete timestamped workout results before reviewing recovery.");
  else if(delay!=120L)observations.add("Reading was not taken exactly at two minutes; show its actual delay and do not treat it as a standardized two-minute comparison.");
  else if(history.isEmpty())observations.add("No prior matching activity, intensity, distance and two-minute timing in this registered package. Establish a baseline; do not automatically increase workload.");
  else {
   double mean=history.stream().mapToInt(row->((Number)row.get("end_exercise_heart_rate")).intValue()-((Number)row.get("recovery_heart_rate_2_min")).intValue()).average().orElse(0);
   result.put("previousMeanDropBpm",mean);
   observations.add(drop<mean?"The measured heart-rate fall is smaller than in the candidate history. Review workout conditions and consider whether reduced workload or veterinary assessment is appropriate.":"The measured heart-rate fall is equal to or greater than the candidate-history mean. This alone does not authorize increasing workload.");
  }
  observations.add("Trainer must compare speed, actual duration, surface, weather and symptoms before deciding to maintain, reduce or increase future work. Matching data do not prove clinical equivalence.");
  result.put("observations",observations);result.put("decision","TRAINER_REVIEW");
  result.put("sources",List.of("https://pmc.ncbi.nlm.nih.gov/articles/PMC11083884/","https://horses.extension.org/basic-conditioning-of-the-equine-athlete/"));
  result.put("limitations","The matching-history query and arithmetic mean are application heuristics, not a validated clinical prediction model. No universal 100 bpm cutoff is used.");
  return result;
 }
}

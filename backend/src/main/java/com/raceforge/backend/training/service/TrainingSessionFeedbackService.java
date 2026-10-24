package com.raceforge.backend.training.service;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
/** Configurable application heuristic from two entered readings; not a diagnosis. */
@Service
public class TrainingSessionFeedbackService {
 private final TrainingSessionRepository sessions;
 private final TrainingWorkflowGuard guard;
 @Value("${raceforge.training.feedback.reduction-ratio:0.20}") private double reductionRatio=0.20;
 @Value("${raceforge.training.feedback.increase-ratio:0.40}") private double increaseRatio=0.40;
 public TrainingSessionFeedbackService(TrainingSessionRepository sessions,TrainingWorkflowGuard guard){this.sessions=sessions;this.guard=guard;}
 @jakarta.annotation.PostConstruct void validateThresholds(){if(!(reductionRatio>0&&reductionRatio<increaseRatio&&increaseRatio<1))throw new IllegalStateException("Feedback ratios must satisfy 0 < reduction < increase < 1");}
 @Transactional(readOnly=true)
 public Map<String,Object> feedback(String id){
  var s=sessions.findById(id).orElseThrow(()->new ResourceNotFoundException("Training session not found"));guard.authorizePlan(s.getPlan());
  Integer end=s.getEndExerciseHeartRate(),recovery=s.getRecoveryHeartRate2Min();
  String action="INSUFFICIENT_DATA",note="Complete both heart-rate readings before reviewing recovery.";
  if("COMPLETED".equals(s.getStatus())&&end!=null&&recovery!=null&&end>0&&recovery>0){
   var drop=java.math.BigDecimal.valueOf((long)end-recovery);var base=java.math.BigDecimal.valueOf(end);
   if(recovery>end){action="REVIEW_REDUCTION";note="Recovery heart rate is higher than the end-of-exercise reading. Check the measurements and consider reducing workload.";}
   else if(drop.compareTo(base.multiply(java.math.BigDecimal.valueOf(reductionRatio)))<0){action="REVIEW_REDUCTION";note="Limited heart-rate recovery. Consider reducing the next workout.";}
   else if(drop.compareTo(base.multiply(java.math.BigDecimal.valueOf(increaseRatio)))<0){action="REVIEW_MAINTENANCE";note="Moderate heart-rate recovery. Consider maintaining the current workload.";}
   else{action="REVIEW_INCREASE";note="Greater heart-rate recovery. Consider a gradual increase after trainer review.";}
  }
  Map<String,Object> result=new LinkedHashMap<>();result.put("sessionId",id);result.put("suggestedAction",action);result.put("note",note);result.put("requiresTrainerConfirmation",true);result.put("automaticScheduleChange",false);return result;
 }
}

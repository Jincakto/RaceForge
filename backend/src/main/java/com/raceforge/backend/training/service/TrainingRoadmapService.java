package com.raceforge.backend.training.service;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.training.support.TrainingIds;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import com.raceforge.backend.training.repository.TrainingPlanRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional
public class TrainingRoadmapService {
 @org.springframework.beans.factory.annotation.Autowired private PackageRoadmapPolicy packageRoadmaps;
 private final JdbcTemplate jdbc;private final TrainingWorkflowGuard guard;private final TrainingPlanRepository plans;
 private final TrainingRecommendationService recommendations;private final TrainingSessionService sessions;
 public TrainingRoadmapService(JdbcTemplate jdbc,TrainingWorkflowGuard guard,TrainingPlanRepository plans,TrainingRecommendationService recommendations,TrainingSessionService sessions){this.jdbc=jdbc;this.guard=guard;this.plans=plans;this.recommendations=recommendations;this.sessions=sessions;}
 public List<Map<String,Object>> replace(String planId,List<Stage> stages){
  lock(planId);var plan=plan(planId);guard.requirePlan(plan);
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Session WHERE plan_id=?",Integer.class,planId)>0)throw new BusinessRuleException("Cannot replace stages after sessions have been scheduled");
  var pack=guard.assignedPackage(plan.getHorsePackageId());int days=(int)ChronoUnit.DAYS.between(pack.getStartDate(),pack.getEndDate())+1;
  TrainingRecommendationService.validateStages(stages,days);
  TrainingCalendarRules.requireSixDayWeek(TrainingCalendarRules.plannedDates(stages,pack.getStartDate()));
  jdbc.update("DELETE FROM dbo.Training_Stage WHERE plan_id=?",planId);
  String type=pack.getTrainingPackage().getPackageType();
  if(plan.getPackageType()==null){plan.setPackageType(type);plan.setRoadmapVersion(PackageRoadmapPolicy.VERSION);plans.saveAndFlush(plan);}
  int ordinal=0;
  for(var part:packageRoadmaps.apply(type,stages,days)){
   Stage stage=part.activity();var phase=part.phase();
   jdbc.update("INSERT dbo.Training_Stage(stage_id,plan_id,stage_order,start_day,end_day,activity_name,intensity,weekdays_json,session_time,phase_code,title,objective,session_end_time) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",TrainingIds.next("STG-"),planId,++ordinal,stage.startDay(),stage.endDay(),stage.activityName(),stage.intensity(),recommendations.encode(stage.daysOfWeek()),java.sql.Time.valueOf(stage.sessionTime()),phase.phaseCode(),phase.title(),phase.objective(),java.sql.Time.valueOf(stage.sessionEndTime()));
  }
  return stages(planId);
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> stages(String planId){guard.authorizePlan(plan(planId));return jdbc.queryForList("SELECT * FROM dbo.Training_Stage WHERE plan_id=? ORDER BY stage_order",planId);}
 public List<TrainingSessionResponse> generate(String planId){
  lock(planId);var plan=plan(planId);guard.requirePlan(plan);var pack=guard.assignedPackage(plan.getHorsePackageId());
  var rows=stages(planId);if(rows.isEmpty())throw new BusinessRuleException("A roadmap with stages is required");
  List<TrainingSessionResponse> created=new ArrayList<>();
  for(var row:rows){
   String[] days=new tools.jackson.databind.ObjectMapper().readValue((String)row.get("weekdays_json"),String[].class);
   Set<String> weekdays=Set.of(days);LocalTime time=((java.sql.Time)row.get("session_time")).toLocalTime();
   for(int day=((Number)row.get("start_day")).intValue();day<=((Number)row.get("end_day")).intValue();day++){
    LocalDate date=pack.getStartDate().plusDays(day-1L);if(!weekdays.contains(date.getDayOfWeek().name()))continue;
    var request=new ScheduleSessionRequest();request.setPlanId(planId);request.setHorseId(pack.getHorse().getHorseId());request.setScheduledTime(LocalDateTime.of(date,time));
    created.add(sessions.scheduleSession(request));
   }
  }
  if(created.isEmpty())throw new BusinessRuleException("No roadmap weekday matches the package period");return created;
 }
 private void lock(String id){jdbc.queryForList("SELECT plan_id FROM dbo.Training_Plan WITH(UPDLOCK,HOLDLOCK) WHERE plan_id=?",id);}
 private com.raceforge.backend.training.entity.TrainingPlan plan(String id){return plans.findById(id).orElseThrow(()->new ResourceNotFoundException("Training plan not found"));}
}

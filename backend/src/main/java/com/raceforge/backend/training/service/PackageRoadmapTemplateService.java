package com.raceforge.backend.training.service;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.dto.PackageRoadmapDto;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
@Service @Transactional
public class PackageRoadmapTemplateService {
 private final PackageRoadmapTemplateRepository roadmaps; private final PackageStageTemplateRepository stages; private final ObjectMapper json;
 public PackageRoadmapTemplateService(PackageRoadmapTemplateRepository roadmaps,PackageStageTemplateRepository stages,ObjectMapper json){this.roadmaps=roadmaps;this.stages=stages;this.json=json;}
 public void validate(PackageRoadmapDto dto,int days){
  if(dto==null||dto.title()==null||dto.title().isBlank()||dto.title().length()>150||dto.goal()==null||dto.goal().isBlank()||dto.goal().length()>500)throw new BusinessRuleException("A roadmap title and goal are required (150/500 characters maximum)");
  TrainingStageValidator.validateStages(dto.stages(),days);
  // Catalogs have no calendar anchor: validate all possible starting weekdays.
  for(int i=0;i<7;i++)TrainingCalendarRules.requireSixDayWeek(TrainingCalendarRules.plannedDates(dto.stages(),LocalDate.of(2026,1,5).plusDays(i)));
 }
 public PackageRoadmapDto create(String packageId,PackageRoadmapDto dto,int days){
  validate(dto,days);var r=new PackageRoadmapTemplate();r.id=UUID.randomUUID().toString();r.packageId=packageId;r.title=dto.title();r.goal=dto.goal();r.revision=1;r.createdAt=LocalDateTime.now();r.updatedAt=r.createdAt;roadmaps.saveAndFlush(r);
  int order=0;for(var s:dto.stages().stream().sorted(Comparator.comparingInt(Stage::startDay)).toList()){var row=new PackageStageTemplate();row.id=UUID.randomUUID().toString();row.roadmapId=r.id;row.stageOrder=++order;row.startDay=s.startDay();row.endDay=s.endDay();row.phaseCode=s.phaseCode();row.title=s.title();row.objective=s.objective();row.activityName=s.activityName();row.intensity=s.intensity();row.weekdaysJson=json.writeValueAsString(s.daysOfWeek());row.sessionTime=s.sessionTime();row.sessionEndTime=s.sessionEndTime();stages.save(row);}stages.flush();return read(packageId);
 }
 @Transactional(readOnly=true) public PackageRoadmapDto read(String packageId){
  var r=roadmaps.findByPackageId(packageId).orElseThrow(()->new BusinessRuleException("Package roadmap is not configured. Ask the manager to configure this package."));
  var rows=stages.findByRoadmapIdOrderByStageOrderAsc(r.id);if(rows.isEmpty())throw new BusinessRuleException("Package roadmap has no stages");
  var result=rows.stream().map(s->new Stage(s.startDay,s.endDay,s.activityName,s.intensity,new HashSet<>(Arrays.asList(json.readValue(s.weekdaysJson,DayOfWeek[].class))),s.sessionTime,s.sessionEndTime,s.title,s.objective,s.phaseCode)).toList();
  return new PackageRoadmapDto(r.title,r.goal,r.revision,result);
 }
}

package com.raceforge.backend.training.service;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.*;
import com.raceforge.backend.common.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class PackageRoadmapTemplateServiceTest {
 final PackageRoadmapTemplateRepository roadmaps=mock(PackageRoadmapTemplateRepository.class);
 final PackageStageTemplateRepository stages=mock(PackageStageTemplateRepository.class);
 final PackageRoadmapTemplateService service=new PackageRoadmapTemplateService(roadmaps,stages,new ObjectMapper());
 @org.junit.jupiter.api.BeforeEach void packageOwner(){
  var packages=mock(TrainingPackageRepository.class);
  var owner=new TrainingPackage();owner.setDurationDays(30);
  when(packages.findById(any())).thenReturn(Optional.of(owner));
  org.springframework.test.util.ReflectionTestUtils.setField(service,"packages",packages);
 }
 Stage stage(int a,int b,Set<DayOfWeek> days){return new Stage(a,b,"Custom activity","HIGH",days,LocalTime.of(9,0),LocalTime.of(9,40),"Custom stage","Individual goal","CUSTOM");}
 PackageRoadmapDto dto(List<Stage> s){return new PackageRoadmapDto("Custom roadmap","Individual goal",1,s);}
 @Test void missingRoadmapDoesNotFallBackToJava(){assertThrows(BusinessRuleException.class,()->service.read("PKG-001"));}
 @Test void gapsAndCustomMetadataAreAllowed(){assertDoesNotThrow(()->service.validate(dto(List.of(stage(2,5,Set.of(DayOfWeek.MONDAY)),stage(10,20,Set.of(DayOfWeek.TUESDAY)))),30));}
 @Test void rejectsOverlapOutOfPeriodAndOvernight(){assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(stage(1,10,Set.of(DayOfWeek.MONDAY)),stage(10,20,Set.of(DayOfWeek.TUESDAY)))),30));assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(stage(1,31,Set.of(DayOfWeek.MONDAY)))),30));var s=new Stage(1,30,"Activity","LOW",Set.of(DayOfWeek.MONDAY),LocalTime.of(23,0),LocalTime.of(1,0));assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(s)),30));}
 @Test void adjacentStagesCannotCombineIntoSevenDayWeek(){var a=stage(1,3,Set.of(DayOfWeek.MONDAY,DayOfWeek.TUESDAY,DayOfWeek.WEDNESDAY));var b=stage(4,7,Set.of(DayOfWeek.THURSDAY,DayOfWeek.FRIDAY,DayOfWeek.SATURDAY,DayOfWeek.SUNDAY));assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(a,b)),7));}
 @Test void packageIdentityDeterminesRoadmapEvenForSameType(){var a=new PackageRoadmapTemplate();a.id="A";a.title="First";a.goal="First goal";a.revision=1;var b=new PackageRoadmapTemplate();b.id="B";b.title="Second";b.goal="Second goal";b.revision=1;when(roadmaps.findByPackageId("PKG-001")).thenReturn(Optional.of(a));when(roadmaps.findByPackageId("PKG-002")).thenReturn(Optional.of(b));var s=new PackageStageTemplate();s.startDay=1;s.endDay=30;s.activityName="Custom";s.title="Title";s.phaseCode="CODE";s.intensity="HIGH";s.weekdaysJson="[\"MONDAY\"]";s.sessionTime=LocalTime.of(9,0);s.sessionEndTime=LocalTime.of(9,40);when(stages.findByRoadmapIdOrderByStageOrderAsc(any())).thenReturn(List.of(s));assertEquals("First",service.read("PKG-001").title());assertEquals("Second",service.read("PKG-002").title());}
 @Test void inspectionSeparatesMissingEmptyInvalidAndTechnicalFailure(){
  assertEquals("ROADMAP_MISSING",service.inspect("P").reason());
  var r=new PackageRoadmapTemplate();r.id="R";r.title="Roadmap";r.goal="Goal";
  when(roadmaps.findByPackageId("P")).thenReturn(Optional.of(r));
  assertEquals("STAGES_MISSING",service.inspect("P").reason());
  var row=new PackageStageTemplate();row.startDay=1;row.endDay=31;row.activityName="Activity";row.title="Title";row.phaseCode="CUSTOM";row.intensity="LOW";row.weekdaysJson="[\"MONDAY\"]";row.sessionTime=LocalTime.of(9,0);row.sessionEndTime=LocalTime.of(9,30);
  when(stages.findByRoadmapIdOrderByStageOrderAsc("R")).thenReturn(List.of(row));
  assertEquals("ROADMAP_INVALID",service.inspect("P").reason());
  row.endDay=30;assertTrue(service.inspect("P").configured());
  row.weekdaysJson="invalid";assertEquals("ROADMAP_INVALID",service.inspect("P").reason());
  when(roadmaps.findByPackageId("P")).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("Offline"));
  assertThrows(org.springframework.dao.DataAccessResourceFailureException.class,()->service.inspect("P"));
 }
 @Test void workloadWarningIsNotConfigurationFailure(){
  var r=new PackageRoadmapTemplate();r.id="R";r.title="Roadmap";r.goal="Goal";
  when(roadmaps.findByPackageId("P")).thenReturn(Optional.of(r));
  var rows=new ArrayList<PackageStageTemplate>();
  for(int n=0;n<2;n++){var row=new PackageStageTemplate();row.startDay=n==0?1:16;row.endDay=n==0?15:30;row.activityName="Activity";row.title="Title";row.phaseCode="CUSTOM";row.intensity=n==0?"LOW":"HIGH";row.weekdaysJson="[\"MONDAY\"]";row.sessionTime=LocalTime.of(9,0);row.sessionEndTime=LocalTime.of(9,30);rows.add(row);}
  when(stages.findByRoadmapIdOrderByStageOrderAsc("R")).thenReturn(rows);
  assertTrue(service.inspect("P").configured());
  assertTrue(new PackageDemandProfileService().analyze(service.read("P"),30,"BASIC").reasonCodes().contains("INTENSITY_JUMP"));
 }
}
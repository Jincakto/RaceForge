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
 Stage stage(int a,int b,Set<DayOfWeek> days){return new Stage(a,b,"Custom activity","HIGH",days,LocalTime.of(9,0),LocalTime.of(9,40),"Custom stage","Individual goal","CUSTOM");}
 PackageRoadmapDto dto(List<Stage> s){return new PackageRoadmapDto("Custom roadmap","Individual goal",List.of(),1,s);}
 @Test void missingRoadmapDoesNotFallBackToJava(){assertThrows(BusinessRuleException.class,()->service.read("PKG-001"));}
 @Test void gapsAndCustomMetadataAreAllowed(){assertDoesNotThrow(()->service.validate(dto(List.of(stage(2,5,Set.of(DayOfWeek.MONDAY)),stage(10,20,Set.of(DayOfWeek.TUESDAY)))),30));}
 @Test void rejectsOverlapOutOfPeriodAndOvernight(){assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(stage(1,10,Set.of(DayOfWeek.MONDAY)),stage(10,20,Set.of(DayOfWeek.TUESDAY)))),30));assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(stage(1,31,Set.of(DayOfWeek.MONDAY)))),30));var s=new Stage(1,30,"Activity","LOW",Set.of(DayOfWeek.MONDAY),LocalTime.of(23,0),LocalTime.of(1,0));assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(s)),30));}
 @Test void adjacentStagesCannotCombineIntoSevenDayWeek(){var a=stage(1,3,Set.of(DayOfWeek.MONDAY,DayOfWeek.TUESDAY,DayOfWeek.WEDNESDAY));var b=stage(4,7,Set.of(DayOfWeek.THURSDAY,DayOfWeek.FRIDAY,DayOfWeek.SATURDAY,DayOfWeek.SUNDAY));assertThrows(BusinessRuleException.class,()->service.validate(dto(List.of(a,b)),7));}
 @Test void packageIdentityDeterminesRoadmapEvenForSameType(){var a=new PackageRoadmapTemplate();a.id="A";a.title="First";a.goal="First goal";a.revision=1;a.sourcesJson="[]";var b=new PackageRoadmapTemplate();b.id="B";b.title="Second";b.goal="Second goal";b.revision=1;b.sourcesJson="[]";when(roadmaps.findByPackageId("PKG-001")).thenReturn(Optional.of(a));when(roadmaps.findByPackageId("PKG-002")).thenReturn(Optional.of(b));var s=new PackageStageTemplate();s.startDay=1;s.endDay=30;s.activityName="Custom";s.title="Title";s.phaseCode="CODE";s.intensity="HIGH";s.weekdaysJson="[\"MONDAY\"]";s.sessionTime=LocalTime.of(9,0);s.sessionEndTime=LocalTime.of(9,40);when(stages.findByRoadmapIdOrderByStageOrderAsc(any())).thenReturn(List.of(s));assertEquals("First",service.read("PKG-001").title());assertEquals("Second",service.read("PKG-002").title());}
}

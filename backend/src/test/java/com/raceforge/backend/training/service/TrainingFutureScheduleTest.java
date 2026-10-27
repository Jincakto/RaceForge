package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.config.TrainingClockConfig;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.entity.*;
import com.raceforge.backend.training.repository.*;
import com.raceforge.backend.horse.entity.Horse;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class TrainingFutureScheduleTest {
 final ZoneId zone=ZoneId.of("Asia/Bangkok");
 final LocalDateTime now=LocalDateTime.of(2026,10,27,7,0);
 final Clock clock=Clock.fixed(now.atZone(zone).toInstant(),zone);
 @Test void trainingClockUsesBangkok(){assertEquals(zone,new TrainingClockConfig().trainingClock().getZone());}
 @Test void manualAddRejectsPastAndEqualBeforePersistence(){
  var service=new TrainingSessionService();ReflectionTestUtils.setField(service,"clock",clock);
  for(var date:List.of(now.minusNanos(1),now)){var request=new ScheduleSessionRequest();request.setScheduledTime(date);assertTrue(assertThrows(BusinessRuleException.class,()->service.scheduleSession(request)).getMessage().contains("future"));}
 }
 @Test void generateSkipsPastAndEqualUsingOneCutoffWithoutMovingStage(){
  var jdbc=mock(JdbcTemplate.class);var guard=mock(TrainingWorkflowGuard.class);var plans=mock(TrainingPlanRepository.class);var sessions=mock(TrainingSessionService.class);var horsePlans=mock(HorsePlanRepository.class);
  var plan=new TrainingPlan();plan.setPlanId("PLN-001");plan.setHorseId("HOR-001");plan.setHorsePackageId("HPG-001");
  var link=new HorsePlan();link.setStartDate(now.toLocalDate().minusDays(1));
  var pack=new HorsePackage();var horse=new Horse();horse.setHorseId("HOR-001");pack.setHorse(horse);
  when(plans.findById("PLN-001")).thenReturn(Optional.of(plan));when(horsePlans.findById(any())).thenReturn(Optional.of(link));when(guard.assignedPackage("HPG-001")).thenReturn(pack);
  when(jdbc.queryForObject(anyString(),eq(Integer.class),eq("PLN-001"))).thenReturn(0);
  Map<String,Object> row=new HashMap<>();row.put("weekdays_json","[\"MONDAY\",\"TUESDAY\",\"WEDNESDAY\"]");row.put("session_time",java.sql.Time.valueOf("07:00:00"));row.put("start_day",1);row.put("end_day",3);
  when(jdbc.queryForList(anyString(),eq("PLN-001"))).thenAnswer(inv->inv.getArgument(0,String.class).startsWith("SELECT *")?List.of(row):List.of());
  when(sessions.scheduleSessionAt(any(),eq(now))).thenAnswer(inv->{var request=inv.getArgument(0,ScheduleSessionRequest.class);assertEquals(LocalDateTime.of(2026,10,28,7,0),request.getScheduledTime());return new TrainingSessionResponse();});
  var service=new TrainingRoadmapService(jdbc,guard,plans,new ObjectMapper(),sessions);ReflectionTestUtils.setField(service,"clock",clock);ReflectionTestUtils.setField(service,"horsePlans",horsePlans);
  assertEquals(1,service.generate("PLN-001").size());verify(sessions,times(1)).scheduleSessionAt(any(),eq(now));verify(guard).requirePlan(plan);assertEquals(LocalDate.of(2026,10,26),link.getStartDate());
  row.put("end_day",2);clearInvocations(sessions);assertTrue(assertThrows(BusinessRuleException.class,()->service.generate("PLN-001")).getMessage().contains("No future sessions"));verifyNoInteractions(sessions);verify(plans,never()).save(any());
 }
}

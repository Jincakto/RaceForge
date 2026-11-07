package com.raceforge.backend.training.service;

import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class TrainingReadAccessTest {
 final JdbcTemplate jdbc=mock(JdbcTemplate.class);
 final TrainingReadAccess access=new TrainingReadAccess(jdbc);
 final AuthenticatedUser trainer=new AuthenticatedUser("A","a@example.invalid","ACTIVE",2,"HEAD_TRAINER");
 @BeforeEach void setup(){
  when(jdbc.queryForObject(anyString(),eq(Integer.class),eq("A"))).thenReturn(1);
  when(jdbc.queryForList(anyString(),eq(String.class),eq("A"),eq("HOR"))).thenReturn(List.of("HPG-A"));
 }
 TrainingSession session(String id,String pack,String status,String recorder){
  var p=new TrainingPlan();p.setHorsePackageId(pack);
  var s=new TrainingSession();s.setSessionId(id);s.setPlan(p);s.setStatus(status);s.setRecordedBy(recorder);return s;
 }
 @Test void scopeIsPerPackageAndExplicitRecorder(){
  var rows=List.of(session("own-future","HPG-A","SCHEDULED",null),session("other-future","HPG-B","SCHEDULED","A"),
    session("own-result","HPG-B","COMPLETED","A"),session("own-missed","HPG-B","MISSED","A"),
    session("other-result","HPG-B","COMPLETED","B"),session("unknown","HPG-B","COMPLETED",null));
  assertEquals(List.of("own-future","own-result","own-missed"),access.filter(trainer,"HOR",rows).stream().map(TrainingSession::getSessionId).toList());
 }
 @Test void endedAssignmentDoesNotGrantFutureAccess(){
  when(jdbc.queryForList(anyString(),eq(String.class),eq("A"),eq("HOR"))).thenReturn(List.of());
  var result=access.filter(trainer,"HOR",List.of(session("past","HPG-A","COMPLETED","A"),session("future","HPG-A","SCHEDULED",null)));
  assertEquals(1,result.size());assertEquals("past",result.get(0).getSessionId());
  verify(jdbc).queryForList(contains("ta.ended_at IS NULL"),eq(String.class),eq("A"),eq("HOR"));
 }
 @Test void activeAssignmentWithNoSessionsIsReadable(){assertTrue(access.canReadHorse("A","HOR"));assertTrue(access.filter(trainer,"HOR",List.of()).isEmpty());}
 @Test void inactiveProfileCannotUseHistoricalAccess(){
  when(jdbc.queryForObject(anyString(),eq(Integer.class),eq("A"))).thenReturn(0);
  assertFalse(access.canReadHorse("A","HOR"));
  assertThrows(AccessDeniedException.class,()->access.filter(trainer,"HOR",List.of(session("past","HPG-A","COMPLETED","A"))));
 }
 @Test void unknownRecorderWithoutCurrentAssignmentIsDenied(){
  when(jdbc.queryForList(anyString(),eq(String.class),eq("A"),eq("HOR"))).thenReturn(List.of());
  assertThrows(AccessDeniedException.class,()->access.filter(trainer,"HOR",List.of(session("unknown","HPG-A","COMPLETED",null))));
 }
 @Test void ownerAndManagerKeepExistingRows(){
  var rows=List.of(session("s","HPG-A","COMPLETED",null));
  for(var role:List.of("HORSE_OWNER","CLUB_MANAGER"))
   assertSame(rows,access.filter(new AuthenticatedUser("U","u@example.invalid","ACTIVE",1,role),"HOR",rows));
  verifyNoInteractions(jdbc);
 }
}
package com.raceforge.backend.training.service;

import com.raceforge.backend.BackendApplication;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.*;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.*;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

/** Writes ONLY to a newly-created GUID test DB, never RaceForge. */
@EnabledIfEnvironmentVariable(named="RUN_TRAINING_DB_TESTS",matches="true")
class TrainingCalendarFixDatabaseTest {
    static final ZoneId ZONE=ZoneId.of("Asia/Bangkok");
    static final JsonMapper JSON=JsonMapper.builder().build();
    static void actor(String id,String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            new AuthenticatedUser(id,id+"@example.invalid","ACTIVE",role.equals("CLUB_MANAGER")?1:2,role),null,List.of()));
    }
    static void sql(Connection c,String value)throws Exception{TrainingRoadmapDatabaseTest.script(c,value);}
    static int count(Connection c,String query)throws Exception{try(var s=c.createStatement();var r=s.executeQuery(query)){r.next();return r.getInt(1);}}
    static String value(Connection c,String query)throws Exception{try(var s=c.createStatement();var r=s.executeQuery(query)){assertTrue(r.next());return r.getString(1);}}
    static String assignmentId(Map<String,Object> a){return (String)a.getOrDefault("assignment_id",a.get("id"));}
    static String assign(TrainerAssignmentService assignments,String hpg,String trainer){
        actor("CM-901","CLUB_MANAGER");String id=assignmentId(assignments.assign(new AssignmentRequest(hpg,trainer)));
        actor(trainer,"HEAD_TRAINER");assignments.respond(id,new Decision(true,"Test fixture"));return id;
    }
    static Stage stage(int start,int end,LocalDate date,int hour){return new Stage(start,end,"Calendar regression","LOW",Set.of(date.getDayOfWeek()),LocalTime.of(hour,0),LocalTime.of(hour,30),"Calendar stage","Synthetic test only","CUSTOM");}
    static String plan(TrainingPlanService plans,String horse,String assignment,List<Stage> stages,String trainer){
        actor(trainer,"HEAD_TRAINER");var body=new TrainingPlanCreateRequest();body.setAssignmentId(assignment);body.setPlanName("Calendar test");body.setStages(stages);return plans.createPlan(horse,body,trainer).getPlanId();
    }
    static ScheduleSessionRequest slot(String plan,String horse,LocalDate date,int hour,int minute) {
        var request=new ScheduleSessionRequest();request.setPlanId(plan);request.setHorseId(horse);
        request.setScheduledTime(date.atTime(hour,minute));request.setScheduledEnd(date.atTime(hour,minute).plusMinutes(30));return request;
    }
    static String login(int port,String email)throws Exception{return http(port,null,"POST","/api/auth/login",Map.of("email",email,"password","Demo@123456"),200).path("accessToken").asText();}
    static tools.jackson.databind.JsonNode http(int port,String token,String method,String path,Object body,int expected)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");
        if(token!=null)request.header("Authorization","Bearer "+token);
        request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
        var response=HttpClient.newHttpClient().send(request.build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(expected,response.statusCode(),path+" "+response.body());
        return JSON.readTree(response.body()).path("data");
    }

    static void setClock(Clock clock,Object... services) {
        for(Object service:services)ReflectionTestUtils.setField(AopTestUtils.<Object>getTargetObject(service),"clock",clock);
    }
    static TrainingAssessmentRequest completionAssessment() {
        return new TrainingAssessmentRequest("POST_TRAINING_V1",java.util.Arrays.stream(com.raceforge.backend.training.entity.TrainingAssessmentCriterion.values()).collect(java.util.stream.Collectors.toMap(Enum::name,ignored->true)),Map.of());
    }
    static void finish(TrainingSessionService sessions,TrainingScheduleCoordinator coordinator,String id,String trainer,Clock clock) {
        actor(trainer,"HEAD_TRAINER");setClock(clock,sessions,coordinator);sessions.stopSession(id,null);
        var result=new CompleteSessionRequest();result.setAssessment(completionAssessment());
        result.setDistance(BigDecimal.ZERO);result.setAvgSpeed(0.0);
        result.setPerformanceNotes("Synthetic runtime regression");sessions.completeSession(id,result,trainer);
    }
    static void verifyRuntimeRules(Connection c,org.springframework.context.ConfigurableApplicationContext app,LocalDate today,Clock initial)throws Exception{
        var sessions=app.getBean(TrainingSessionService.class);var coordinator=app.getBean(TrainingScheduleCoordinator.class);
        var plans=app.getBean(TrainingPlanService.class);var assignments=app.getBean(TrainerAssignmentService.class);
        var schedule=app.getBean(TrainingScheduleService.class);
        setClock(initial,sessions,coordinator,schedule);
        Map<Integer,String> ids=new HashMap<>();
        for(int n=908;n<=916;n++){
            String trainer=n==910?"HTR-902":"HTR-901";
            if(n>=912&&n<=914)sql(c,"UPDATE dbo.HORSE_PACKAGE SET start_date=DATEADD(day,-2,CAST(GETDATE() AS date)),end_date=DATEADD(day,27,CAST(GETDATE() AS date)) WHERE horse_package_id='HPG-"+n+"'");
            if(n==915)sql(c,"UPDATE dbo.HORSE_PACKAGE SET start_date=DATEADD(day,-29,CAST(GETDATE() AS date)),end_date=CAST(GETDATE() AS date) WHERE horse_package_id='HPG-915'");
            String assignment=assign(assignments,"HPG-"+n,trainer);
            ids.put(n,plan(plans,"HOR-"+n,assignment,List.of(stage(1,30,today,10)),trainer));
        }
        actor("HTR-901","HEAD_TRAINER");
        var a=sessions.scheduleSession(slot(ids.get(908),"HOR-908",today,10,0));
        var b=sessions.scheduleSession(slot(ids.get(909),"HOR-909",today,12,0));
        var sameHorse=sessions.scheduleSession(slot(ids.get(908),"HOR-908",today,13,0));
        var tomorrow=sessions.scheduleSession(slot(ids.get(908),"HOR-908",today.plusDays(1),10,0));
        assertTrue(tomorrow.getCanStart());
        sessions.startSession(tomorrow.getSessionId());
        finish(sessions,coordinator,tomorrow.getSessionId(),"HTR-901",Clock.offset(initial,Duration.ofMinutes(1)));
        setClock(initial,sessions,coordinator,schedule);
        var yesterday=sessions.scheduleSession(slot(ids.get(908),"HOR-908",today.plusDays(1),16,0));
        sql(c,"UPDATE dbo.Training_Session SET scheduled_start=DATEADD(day,-2,scheduled_start),scheduled_end=DATEADD(day,-2,scheduled_end) WHERE session_id=\'"+yesterday.getSessionId()+"\'");
        assertTrue(schedule.getScheduleByHorseId("HOR-908").stream().filter(s->s.getSessionId().equals(yesterday.getSessionId())).findFirst().orElseThrow().getCanStart());
        sessions.startSession(yesterday.getSessionId());
        finish(sessions,coordinator,yesterday.getSessionId(),"HTR-901",Clock.offset(initial,Duration.ofMinutes(2)));
        setClock(initial,sessions,coordinator,schedule);
        // Two simultaneous Start requests on different horses assigned to the same trainer.
        var pool=Executors.newFixedThreadPool(2);String winner,loser;
        try{
            var barrier=new CyclicBarrier(2);var work=new ArrayList<Callable<String>>();
            for(String id:List.of(a.getSessionId(),b.getSessionId()))work.add(()->{actor("HTR-901","HEAD_TRAINER");try{barrier.await(10,TimeUnit.SECONDS);sessions.startSession(id);return id;}
                catch(BusinessRuleException e){assertTrue(e.getMessage().contains("unfinished session"));return null;}finally{SecurityContextHolder.clearContext();}});
            var results=pool.invokeAll(work);var wins=new ArrayList<String>();for(var result:results){String id=result.get();if(id!=null)wins.add(id);}
            assertEquals(1,wins.size());winner=wins.get(0);loser=winner.equals(a.getSessionId())?b.getSessionId():a.getSessionId();
        }finally{pool.shutdownNow();}
        assertEquals(1,count(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE horse_id IN ('HOR-908','HOR-909') AND status='SCHEDULED' AND actual_start IS NOT NULL"));
        actor("HTR-901","HEAD_TRAINER");
        assertTrue(assertThrows(BusinessRuleException.class,()->sessions.startSession(sameHorse.getSessionId())).getMessage().contains("unfinished session"));
        // Different trainer and horse can run independently.
        actor("HTR-902","HEAD_TRAINER");
        var independent=sessions.scheduleSession(slot(ids.get(910),"HOR-910",today,11,0));
        sessions.startSession(independent.getSessionId());
        var independentNext=sessions.scheduleSession(slot(ids.get(910),"HOR-910",today,13,0));
        assertTrue(assertThrows(BusinessRuleException.class,()->sessions.startSession(independentNext.getSessionId())).getMessage().contains("This horse"));
        actor("HTR-901","HEAD_TRAINER");setClock(Clock.offset(initial,Duration.ofMinutes(1)),sessions,coordinator);
        sessions.stopSession(winner,null);
        var blocked=schedule.getScheduleByHorseId(winner.equals(a.getSessionId())?"HOR-909":"HOR-908").stream().filter(s->s.getSessionId().equals(loser)).findFirst().orElseThrow();
        assertFalse(blocked.getCanStart());assertTrue(blocked.getStartBlockedReason().contains(winner));assertTrue(blocked.getStartBlockedReason().contains("Save"));
        assertThrows(BusinessRuleException.class,()->sessions.startSession(loser));
        var result=new CompleteSessionRequest();result.setAssessment(completionAssessment());result.setDistance(BigDecimal.ZERO);result.setAvgSpeed(0.0);
        sessions.completeSession(winner,result,"HTR-901");
        // Late start is allowed on the same day, without changing planned time.
        Clock late=Clock.fixed(today.atTime(23,0).atZone(ZONE).toInstant(),ZONE);setClock(late,sessions,coordinator);
        assertTrue(schedule.getScheduleByHorseId(winner.equals(a.getSessionId())?"HOR-909":"HOR-908").stream().filter(s->s.getSessionId().equals(loser)).findFirst().orElseThrow().getCanStart());
        var started=sessions.startSession(loser);assertEquals(today.atTime(23,0),started.getActualStart());
        finish(sessions,coordinator,loser,"HTR-901",Clock.offset(late,Duration.ofMinutes(1)));
        finish(sessions,coordinator,independent.getSessionId(),"HTR-902",Clock.offset(late,Duration.ofMinutes(2)));
        // Authorization, lock and expiry remain mandatory even on the correct day.
        actor("HTR-902","HEAD_TRAINER");assertThrows(org.springframework.security.access.AccessDeniedException.class,()->sessions.startSession(sameHorse.getSessionId()));
        actor("HTR-901","HEAD_TRAINER");sql(c,"UPDATE dbo.Horse SET training_locked=1 WHERE horse_id='HOR-908'");
        assertThrows(BusinessRuleException.class,()->sessions.startSession(sameHorse.getSessionId()));
        sql(c,"UPDATE dbo.Horse SET training_locked=0 WHERE horse_id='HOR-908'");
        actor("HTR-901","HEAD_TRAINER");var expiring=sessions.scheduleSession(slot(ids.get(911),"HOR-911",today.plusDays(1),18,0));
        sql(c,"UPDATE dbo.HORSE_PACKAGE SET start_date=DATEADD(day,-30,CAST(GETDATE() AS date)),end_date=DATEADD(day,-1,CAST(GETDATE() AS date)) WHERE horse_package_id='HPG-911'");
        assertThrows(BusinessRuleException.class,()->sessions.startSession(expiring.getSessionId()));
        setClock(initial,sessions,coordinator,schedule);
        // Recurring before/equal/after cutoff; all checks still use real transactions and stages.
        for(int n=912;n<=914;n++){
            int hour=n==912?8:n==913?7:9;
            var request=new ScheduleRecurringRequest();request.setPlanId(ids.get(n));request.setHorseId("HOR-"+n);
            request.setHorsePackageId("HPG-"+n);request.setDaysOfWeek(Set.of(today.getDayOfWeek()));request.setSessionTime(LocalTime.of(hour,0));request.setSessionEndTime(LocalTime.of(hour,30));request.setActivityName("Synthetic runtime");
            actor("HTR-901","HEAD_TRAINER");var created=schedule.createRecurringSchedule(request);
            assertFalse(created.isEmpty());assertTrue(created.stream().allMatch(s->s.getScheduledStart().isAfter(LocalDateTime.now(initial))));
            assertEquals(n==914,created.stream().anyMatch(s->s.getScheduledStart().toLocalDate().equals(today)));
        }
        var past=new ScheduleRecurringRequest();past.setPlanId(ids.get(915));past.setHorseId("HOR-915");past.setHorsePackageId("HPG-915");past.setDaysOfWeek(Set.of(today.getDayOfWeek()));past.setSessionTime(LocalTime.of(7,0));past.setActivityName("Past fixture");
        assertTrue(assertThrows(BusinessRuleException.class,()->schedule.createRecurringSchedule(past)).getMessage().contains("No future sessions"));
        assertEquals(0,count(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE plan_id='"+ids.get(915)+"'"));
        sessions.scheduleSession(slot(ids.get(908),"HOR-908",today.plusDays(1),15,0));
        var conflict=new ScheduleRecurringRequest();conflict.setPlanId(ids.get(916));conflict.setHorseId("HOR-916");conflict.setHorsePackageId("HPG-916");
        conflict.setDaysOfWeek(Set.of(today.getDayOfWeek(),today.plusDays(1).getDayOfWeek()));conflict.setSessionTime(LocalTime.of(15,0));conflict.setSessionEndTime(LocalTime.of(15,30));conflict.setActivityName("Rollback fixture");
        assertTrue(assertThrows(BusinessRuleException.class,()->schedule.createRecurringSchedule(conflict)).getMessage().contains("Trainer"));
        assertEquals(0,count(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE plan_id='"+ids.get(916)+"'"));
        assertEquals(1,count(c,"SELECT COUNT(*) FROM dbo.Training_Stage WHERE plan_id='"+ids.get(916)+"'"));
        setClock(initial,sessions,coordinator,schedule);
    }
    static void verifyReadScopes(Connection c,int port,String completed,String replacement,String secondPlan)throws Exception{
        String oldToken=login(port,"trainer901@example.invalid"),newToken=login(port,"trainer902@example.invalid");
        String oldProfile=value(c,"SELECT trainer_id FROM dbo.Trainer WHERE user_id='HTR-901'");
        String newProfile=value(c,"SELECT trainer_id FROM dbo.Trainer WHERE user_id='HTR-902'");
        http(port,oldToken,"GET","/api/trainer-profiles/"+newProfile+"/sessions",null,403);
        var history=http(port,oldToken,"GET","/api/trainer-profiles/"+oldProfile+"/sessions",null,200);
        assertTrue(history.toString().contains(completed));
        http(port,oldToken,"GET","/api/training-sessions/"+completed+"/feedback",null,404);
        http(port,oldToken,"PATCH","/api/training-sessions/"+completed+"/start",null,403);
        var old=http(port,oldToken,"GET","/api/training-sessions/horse/HOR-903",null,200);
        assertEquals(1,old.size());assertEquals(completed,old.get(0).path("sessionId").asText());
        for(String status:List.of("PAUSED","COMPLETED")){
            sql(c,"UPDATE dbo.HORSE_PACKAGE SET status='"+status+"' WHERE horse_package_id='HPG-903'");
            assertTrue(http(port,newToken,"GET","/api/training-sessions/horse/HOR-903",null,200).size()>1);
        }
        sql(c,"UPDATE dbo.HORSE_PACKAGE SET status='ACTIVE' WHERE horse_package_id='HPG-903'");
        sql(c,"UPDATE dbo.Training_Assignment SET ended_at=SYSDATETIME() WHERE assignment_id='"+replacement+"'");
        http(port,newToken,"GET","/api/training-sessions/horse/HOR-903",null,403);
        assertEquals(1,http(port,oldToken,"GET","/api/training-sessions/horse/HOR-903",null,200).size());
        sql(c,"UPDATE dbo.Training_Assignment SET ended_at=NULL WHERE assignment_id='"+replacement+"'");
        sql(c,"UPDATE dbo.Training_Session SET recorded_by=NULL WHERE session_id='"+completed+"'");
        http(port,oldToken,"GET","/api/training-sessions/horse/HOR-903",null,403);
        sql(c,"UPDATE dbo.Training_Session SET recorded_by='HTR-901' WHERE session_id='"+completed+"'");
        // A second registration of the SAME horse belongs to the other trainer.
        sql(c,"INSERT dbo.HORSE_PACKAGE(horse_package_id,horse_id,package_id,registered_at,start_date,end_date,status,payment_status,total_price,created_at,updated_at)"
            +" SELECT 'HPG-990','HOR-903',package_id,registered_at,start_date,end_date,'COMPLETED','PAID',total_price,created_at,updated_at FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-904';"
            +" INSERT dbo.Horse_Assignment(id,horse_id,kind,assigned_by,assignee_id,status,created_at) VALUES('ASN-990','HOR-903','TRAINER','CM-901','HTR-901','ACCEPTED',SYSDATETIME());"
            +" INSERT dbo.Training_Assignment(assignment_id,horse_package_id) VALUES('ASN-990','HPG-990');"
            +" INSERT dbo.Training_Plan(plan_id,created_by,plan_name,status,horse_package_id,trainer_assignment_id,horse_id,package_type)"
            +" VALUES('PLN-990','HTR-901',N'Synthetic second registration','ACTIVE','HPG-990','ASN-990','HOR-903','BASIC');"
            +" INSERT dbo.Horse_Plan(plan_id,horse_id,start_date,end_date,status) SELECT 'PLN-990','HOR-903',start_date,end_date,'ACTIVE' FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-990';"
            +" INSERT dbo.Training_Session(session_id,plan_id,horse_id,scheduled_start,scheduled_end,status)"
            +" SELECT TOP(1) 'SES-990','PLN-990','HOR-903',DATEADD(hour,6,scheduled_start),DATEADD(hour,6,scheduled_end),'SCHEDULED' FROM dbo.Training_Session WHERE plan_id='"+secondPlan+"';");
        var newRows=http(port,newToken,"GET","/api/training-sessions/horse/HOR-903",null,200);
        for(var row:newRows)assertEquals("HPG-903",row.path("horsePackageId").asText());
        var oldRows=http(port,oldToken,"GET","/api/training-sessions/horse/HOR-903",null,200);
        for(var row:oldRows)assertTrue(row.path("horsePackageId").asText().equals("HPG-990") || row.path("sessionId").asText().equals(completed));
        // Missing stages/roadmap are recoverable context states, not transaction failures.
        String packageId=value(c,"SELECT package_id FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-903'");
        sql(c,"DELETE dbo.Package_Stage_Template WHERE roadmap_template_id IN (SELECT roadmap_template_id FROM dbo.Package_Roadmap_Template WHERE package_id='"+packageId+"')");
        var context=http(port,newToken,"GET","/api/horse-packages/HPG-903/training-context",null,200);
        assertEquals("STAGES_MISSING",context.path("roadmapConfigurationReason").asText());assertEquals("HPG-903",context.path("horsePackageId").asText());
        sql(c,"DELETE dbo.Package_Roadmap_Template WHERE package_id='"+packageId+"'");
        context=http(port,newToken,"GET","/api/horse-packages/HPG-903/training-context",null,200);
        assertEquals("ROADMAP_MISSING",context.path("roadmapConfigurationReason").asText());
        assertTrue(http(port,newToken,"GET","/api/training-sessions/horse/HOR-903",null,200).size()>1);
        sql(c,"UPDATE dbo.Medical_Record SET status='DRAFT',confirmed_at=NULL WHERE profile_id IN (SELECT profile_id FROM dbo.Health_Profile WHERE horse_id='HOR-903')");
        context=http(port,newToken,"GET","/api/horse-packages/HPG-903/training-context",null,200);
        assertFalse(context.path("trainingAllowed").asBoolean());
    }
    @Test void paymentsConcurrentCalendarsAndReassignmentAreAtomic()throws Exception{
        String name="RaceForgeTrainingTest_"+UUID.randomUUID().toString().replace("-","");
        String root="jdbc:sqlserver://"+System.getenv().getOrDefault("TRAINING_TEST_SQL_SERVER","localhost:1433")+";encrypt=true;trustServerCertificate=true;databaseName=";
        String user=System.getenv().getOrDefault("DB_USERNAME","sa"),password=System.getenv().getOrDefault("DB_PASSWORD","12345");
        LocalDate today=LocalDate.now(ZONE),tomorrow=today.plusDays(1);
        Clock initialClock=Clock.fixed(today.atTime(8,0).atZone(ZONE).toInstant(),ZONE);
        try(var admin=DriverManager.getConnection(root+"master",user,password)){
            try(var s=admin.createStatement()){s.execute("CREATE DATABASE ["+name+"]");}
            try{
                try(var c=DriverManager.getConnection(root+name,user,password)){
                    sql(c,Files.readString(Path.of("scripts/training/00_canonical_base_schema.sql")));
                    sql(c,"SET IDENTITY_INSERT dbo.Role ON; INSERT dbo.Role(role_id,role_name) VALUES(1,'CLUB_MANAGER'),(2,'HEAD_TRAINER'),(3,'VETERINARIAN'),(4,'GROOM'),(5,'HORSE_OWNER'),(6,'USER'),(7,'ADMIN'); SET IDENTITY_INSERT dbo.Role OFF;");
                }
                Flyway.configure().dataSource(root+name,user,password).baselineVersion("12").load().baseline();
                Flyway.configure().dataSource(root+name,user,password).locations("classpath:db/migration").load().migrate();
                try(var c=DriverManager.getConnection(root+name,user,password)){
                    sql(c,Files.readString(Path.of("src/test/resources/training/assessment_schema_TEST_ONLY.sql")));
                    sql(c,Files.readString(Path.of("scripts/training/06_horse_package_expired_status.sql")));
                    sql(c,Files.readString(Path.of("scripts/training/07_training_assessment_performance_codes.sql")));
                    sql(c,Files.readString(Path.of("scripts/training/03_seed_demo.sql")));
                }
                try(var app=new SpringApplicationBuilder(BackendApplication.class).run("--server.port=0","--spring.datasource.url="+root+name,
                        "--spring.datasource.username="+user,"--spring.datasource.password="+password,"--spring.flyway.enabled=false",
                        "--raceforge.bootstrap-admin.enabled=false","--raceforge.training.package-expiry-cron=-","--logging.level.root=WARN",
                        "--logging.level.org.springframework=OFF","--logging.level.org.springframework.jdbc=OFF","--logging.level.org.hibernate.SQL=OFF");
                    var c=DriverManager.getConnection(root+name,user,password)){
                    String hash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("Demo@123456");
                    sql(c,"INSERT dbo.[User](user_id,role_id,full_name,email,password,status,email_verified) VALUES('OWN-901',5,N'Test Owner','owner901@example.invalid','"+hash+"','ACTIVE',1),('CM-901',1,N'Test Manager','cm901@example.invalid','"+hash+"','ACTIVE',1),('VET-901',3,N'Test Vet','vet901@example.invalid','"+hash+"','ACTIVE',1),('HTR-901',2,N'Original Trainer','trainer901@example.invalid','"+hash+"','ACTIVE',1),('HTR-902',2,N'New Trainer','trainer902@example.invalid','"+hash+"','ACTIVE',1); INSERT dbo.Trainer(trainer_id,user_id) VALUES('HTR-901','HTR-901'),('HTR-902','HTR-902'); INSERT dbo.Trainer_Detail(trainer_id,status,created_at) VALUES('HTR-901','ACTIVE',SYSDATETIME()),('HTR-902','ACTIVE',SYSDATETIME());");
                    for(int n=901;n<=916;n++){
                        String k=""+n;boolean racing=n<=903;String status=n<=904?"PENDING":"ACTIVE";
                        sql(c,"INSERT dbo.Horse(horse_id,owner_id,horse_name,health_status,training_locked,status) VALUES('HOR-"+k+"','OWN-901',N'Synthetic calendar horse','READY',0,'ACTIVE'); INSERT dbo.Horse_Admission(horse_id,status,created_at) VALUES('HOR-"+k+"','APPROVED',SYSDATETIME()); INSERT dbo.Health_Profile(profile_id,horse_id,created_at,updated_at) VALUES('HLT-"+k+"','HOR-"+k+"',SYSDATETIME(),SYSDATETIME()); INSERT dbo.Medical_Record(medical_record_id,profile_id,veterinarian_id,exam_type,examined_at,status,confirmed_at,created_at,updated_at,training_eligible,final_conclusion,notes) VALUES('MED-"+k+"','HLT-"+k+"','VET-901','INITIAL',SYSDATETIME(),'CONFIRMED',SYSDATETIME(),SYSDATETIME(),SYSDATETIME(),1,'FIT',N'Synthetic medical fixture, not a real examination'); INSERT dbo.Medical_Vital_Sign(vital_sign_id,medical_record_id,body_temperature,resting_heart_rate,resting_respiratory_rate,weight) VALUES('VIT-"+k+"','MED-"+k+"',37.5,40,12,450); INSERT dbo.Medical_Clinical_Exam(clinical_exam_id,medical_record_id,examination_area,condition_status) VALUES('CLN-"+k+"','MED-"+k+"','MOVEMENT_LEGS','NORMAL'); INSERT dbo.HORSE_PACKAGE(horse_package_id,horse_id,package_id,registered_at,start_date,end_date,status,payment_status,total_price,created_at,updated_at) VALUES('HPG-"+k+"','HOR-"+k+"','"+(racing?"PKG-002":"PKG-001")+"',SYSDATETIME(),CAST(GETDATE() AS date),CAST(DATEADD(day,"+(racing?44:29)+",GETDATE()) AS date),'"+status+"','"+(status.equals("PENDING")?"PENDING":"PAID")+"',1000,SYSDATETIME(),SYSDATETIME());");
                    }
                    int port=((WebServerApplicationContext)app).getWebServer().getPort();
                    String owner=login(port,"owner901@example.invalid");
                    sql(c,"UPDATE dbo.Medical_Record SET final_conclusion='FIT_WITH_MONITORING',monitoring_note=N'Synthetic monitoring' WHERE medical_record_id IN ('MED-901','MED-904'); DELETE dbo.Medical_Clinical_Exam WHERE clinical_exam_id='CLN-902';");
                    http(port,owner,"POST","/api/horse-packages/HPG-901/simulate-payment",Map.of("successful",true),404);
                    var payments = app.getBean(HorsePackageService.class);
                    assertThrows(BusinessRuleException.class, () -> payments.applyPayment("HPG-901",true,"OWN-901"));
                    assertThrows(BusinessRuleException.class, () -> payments.applyPayment("HPG-902",true,"OWN-901"));
                    assertEquals("PENDING",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-901'"));
                    assertEquals("PENDING",value(c,"SELECT payment_status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-902'"));
                    payments.applyPayment("HPG-903",true,"OWN-901");
                    payments.applyPayment("HPG-904",true,"OWN-901");
                    var sessions=app.getBean(TrainingSessionService.class);var roadmaps=app.getBean(TrainingRoadmapService.class);
                    var plans=app.getBean(TrainingPlanService.class);var assignments=app.getBean(TrainerAssignmentService.class);
                    var coordinator=app.getBean(TrainingScheduleCoordinator.class);
                    for(Object service:List.of(sessions,roadmaps,coordinator))ReflectionTestUtils.setField(AopTestUtils.<Object>getTargetObject(service),"clock",initialClock);
                    verifyRuntimeRules(c,app,today,initialClock);
                    String asnA=assign(assignments,"HPG-903","HTR-901"),asnB=assign(assignments,"HPG-904","HTR-901"),asnC=assign(assignments,"HPG-905","HTR-902");
                    String a=plan(plans,"HOR-903",asnA,List.of(stage(1,45,tomorrow,16)),"HTR-901");
                    String b=plan(plans,"HOR-904",asnB,List.of(stage(1,7,tomorrow,15),stage(8,30,tomorrow,16)),"HTR-901");
                    String other=plan(plans,"HOR-905",asnC,List.of(stage(1,30,tomorrow,16)),"HTR-902");
                    actor("HTR-901","HEAD_TRAINER");var generated=roadmaps.generate(a);assertFalse(generated.isEmpty());
                    assertEquals("HTR-901",generated.get(0).getTrainerUserId());
                    assertTrue(assertThrows(BusinessRuleException.class,()->roadmaps.generate(b)).getMessage().contains("Trainer"));
                    assertEquals(0,count(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE plan_id='"+b+"'"));
                    assertEquals(2,count(c,"SELECT COUNT(*) FROM dbo.Training_Stage WHERE plan_id='"+b+"'"));
                    assertEquals("ACTIVE",value(c,"SELECT status FROM dbo.Training_Plan WHERE plan_id='"+b+"'"));
                    assertThrows(BusinessRuleException.class,()->sessions.scheduleSession(slot(b,"HOR-904",tomorrow,16,0)));
                    var adjacent=sessions.scheduleSession(slot(b,"HOR-904",tomorrow,16,30));
                    sessions.adjustSession(adjacent.getSessionId(),new AdjustSessionRequest(tomorrow.atTime(16,30),tomorrow.atTime(17,0),"LOW","Same slot remains valid"));
                    assertThrows(BusinessRuleException.class,()->sessions.adjustSession(adjacent.getSessionId(),new AdjustSessionRequest(tomorrow.atTime(16,15),tomorrow.atTime(16,45),"LOW","Must conflict")));

                    // Independent connections race across horses; SQL applock serializes the whole validation/write.
                    var pool=Executors.newFixedThreadPool(2);
                    try{
                        var barrier=new CyclicBarrier(2);List<Callable<Boolean>> work=new ArrayList<>();
                        for(int i=0;i<2;i++){final int j=i;work.add(()->{actor("HTR-901","HEAD_TRAINER");try{barrier.await(10,TimeUnit.SECONDS);sessions.scheduleSession(slot(j==0?a:b,j==0?"HOR-903":"HOR-904",tomorrow,14,0));return true;}catch(BusinessRuleException conflict){assertTrue(conflict.getMessage().contains("Trainer"));return false;}finally{SecurityContextHolder.clearContext();}});}
                        int successes=0;for(var result:pool.invokeAll(work))if(result.get())successes++;assertEquals(1,successes);
                    }finally{pool.shutdownNow();}
                    assertEquals(1,count(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE horse_id IN ('HOR-903','HOR-904') AND CAST(scheduled_start AS time)='14:00'"));
                    String[] parallelPlans=new String[2];for(int i=0;i<2;i++){String k=""+(906+i);String asn=assign(assignments,"HPG-"+k,"HTR-901");parallelPlans[i]=plan(plans,"HOR-"+k,asn,List.of(stage(1,30,tomorrow,12)),"HTR-901");}
                    var generatePool=Executors.newFixedThreadPool(2);
                    try{
                        var barrier=new CyclicBarrier(2);List<Callable<Boolean>> work=new ArrayList<>();
                        for(String id:parallelPlans)work.add(()->{actor("HTR-901","HEAD_TRAINER");try{barrier.await(10,TimeUnit.SECONDS);roadmaps.generate(id);return true;}catch(BusinessRuleException conflict){assertTrue(conflict.getMessage().contains("Trainer"));return false;}finally{SecurityContextHolder.clearContext();}});
                        int successes=0;for(var result:generatePool.invokeAll(work))if(result.get())successes++;assertEquals(1,successes);
                        assertTrue(count(c,"SELECT COUNT(DISTINCT plan_id) FROM dbo.Training_Session WHERE plan_id IN ('"+parallelPlans[0]+"','"+parallelPlans[1]+"')")==1);
                    }finally{generatePool.shutdownNow();}

                    actor("HTR-902","HEAD_TRAINER");var occupied=roadmaps.generate(other);
                    // More sessions than package days, while still using at most six distinct weekdays.
                    int added=0;for(int d=2;added<31;d++){var day=today.plusDays(d);if(day.getDayOfWeek()==DayOfWeek.SUNDAY)continue;for(int hour=5;hour<=7&&added<31;hour++){sessions.scheduleSession(slot(other,"HOR-905",day,hour,0));added++;}}
                    assertEquals(31,added);
                    LocalDate seventh=today.with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.MONDAY)).plusDays(6);
                    assertTrue(assertThrows(BusinessRuleException.class,()->sessions.scheduleSession(slot(other,"HOR-905",seventh,5,0))).getMessage().contains("six distinct"));

                    Clock running=Clock.fixed(tomorrow.atTime(16,0).atZone(ZONE).toInstant(),ZONE);
                    for(Object service:List.of(sessions,roadmaps,coordinator))ReflectionTestUtils.setField(AopTestUtils.<Object>getTargetObject(service),"clock",running);
                    actor("HTR-901","HEAD_TRAINER");String completed=generated.get(0).getSessionId();sessions.startSession(completed);
                    actor("CM-901","CLUB_MANAGER");assertThrows(BusinessRuleException.class,()->assignments.replace(asnA,new Replacement("HTR-902","Must finish started work")));
                    Clock stopped=Clock.offset(running,Duration.ofMinutes(1));ReflectionTestUtils.setField(AopTestUtils.<Object>getTargetObject(sessions),"clock",stopped);
                    actor("HTR-901","HEAD_TRAINER");sessions.stopSession(completed,null);
                    actor("CM-901","CLUB_MANAGER");assertThrows(BusinessRuleException.class,()->assignments.replace(asnA,new Replacement("HTR-902","Recovery results still pending")));
                    actor("HTR-901","HEAD_TRAINER");var result=new CompleteSessionRequest();result.setAssessment(completionAssessment());result.setDistance(BigDecimal.ZERO);result.setAvgSpeed(0.0);result.setMaxSpeed(0.0);result.setPerformanceNotes("Synthetic SQL regression");
                    sessions.completeSession(completed,result,"HTR-901");
                    ReflectionTestUtils.setField(AopTestUtils.<Object>getTargetObject(coordinator),"clock",stopped);

                    actor("CM-901","CLUB_MANAGER");String replacement=assignmentId(assignments.replace(asnA,new Replacement("HTR-902","Transfer future sessions")));
                    actor("HTR-902","HEAD_TRAINER");assertTrue(assertThrows(BusinessRuleException.class,()->assignments.respond(replacement,new Decision(true,"Accept"))).getMessage().contains("Trainer"));
                    assertEquals("ASSIGNED",value(c,"SELECT status FROM dbo.Horse_Assignment WHERE id='"+replacement+"'"));
                    var schedule=app.getBean(TrainingScheduleService.class);
                    actor("HTR-901","HEAD_TRAINER");
                    assertEquals("HTR-901",schedule.getScheduleByHorseId("HOR-903").stream().filter(s->s.getSessionId().equals(completed)).findFirst().orElseThrow().getTrainerUserId());
                    actor("HTR-902","HEAD_TRAINER");
                    for(var row:occupied)sessions.adjustSession(row.getSessionId(),new AdjustSessionRequest(row.getScheduledStart().withHour(18),row.getScheduledEnd().withHour(18),"LOW","Free transfer slots"));
                    String datesBefore=value(c,"SELECT STRING_AGG(CONVERT(varchar(max),session_id)+CONVERT(varchar,scheduled_start,126),'|') WITHIN GROUP(ORDER BY session_id) FROM dbo.Training_Session WHERE plan_id='"+a+"'");
                    assignments.respond(replacement,new Decision(true,"Accept after reviewing conflicts"));
                    var after=schedule.getScheduleByHorseId("HOR-903");
                    assertEquals("HTR-901",after.stream().filter(s->s.getSessionId().equals(completed)).findFirst().orElseThrow().getTrainerUserId());
                    assertTrue(after.stream().filter(s->s.getActualStart()==null&&s.getScheduledStart().isAfter(LocalDateTime.now(stopped))).allMatch(s->"HTR-902".equals(s.getTrainerUserId())));
                    assertEquals(datesBefore,value(c,"SELECT STRING_AGG(CONVERT(varchar(max),session_id)+CONVERT(varchar,scheduled_start,126),'|') WITHIN GROUP(ORDER BY session_id) FROM dbo.Training_Session WHERE plan_id='"+a+"'"));
                    assertEquals(asnA,value(c,"SELECT trainer_assignment_id FROM dbo.Training_Plan WHERE plan_id='"+a+"'"));
                    assertEquals("HTR-901",value(c,"SELECT recorded_by FROM dbo.Training_Session WHERE session_id='"+completed+"'"));
                    String newToken=login(port,"trainer902@example.invalid");
                    var wire=http(port,newToken,"GET","/api/training-sessions/horse/HOR-903",null,200);
                    assertTrue(wire.isArray());assertTrue(wire.toString().contains("trainerUserId"));assertTrue(wire.toString().contains("New Trainer"));
                    actor("HTR-902","HEAD_TRAINER");
                    assertEquals("HTR-902",sessions.scheduleSession(slot(a,"HOR-903",today.plusDays(20),10,0)).getTrainerUserId());
                    actor("HTR-901","HEAD_TRAINER");assertThrows(org.springframework.security.access.AccessDeniedException.class,()->sessions.scheduleSession(slot(a,"HOR-903",today.plusDays(20),10,0)));
                    actor("CM-901","CLUB_MANAGER");String duplicate=assignmentId(assignments.assign(new AssignmentRequest("HPG-903","HTR-901")));
                    actor("HTR-901","HEAD_TRAINER");assertThrows(BusinessRuleException.class,()->assignments.respond(duplicate,new Decision(true,"Must not have two accepted trainers")));
                    assertEquals("ASSIGNED",value(c,"SELECT status FROM dbo.Horse_Assignment WHERE id='"+duplicate+"'"));
                    verifyReadScopes(c,port,completed,replacement,b);
                    // Legacy ambiguity is reported rather than silently choosing an assignee.
                    sql(c,"UPDATE dbo.Horse_Assignment SET status='ACCEPTED' WHERE id='"+duplicate+"'");
                    assertTrue(assertThrows(BusinessRuleException.class,()->coordinator.requireTrainer("HPG-903")).getMessage().contains("multiple"));
                    SecurityContextHolder.clearContext();
                }
            }finally{
                SecurityContextHolder.clearContext();
                if(!name.matches("RaceForgeTrainingTest_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test DB name");
                try(var s=admin.createStatement()){s.execute("ALTER DATABASE ["+name+"] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ["+name+"]");}
            }
        }
    }
}
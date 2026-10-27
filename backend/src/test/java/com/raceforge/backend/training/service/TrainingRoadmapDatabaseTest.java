package com.raceforge.backend.training.service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.sql.*;
import java.nio.file.*;
import java.util.*;
import java.net.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import com.raceforge.backend.BackendApplication;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import java.time.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
/** Creates and drops ONLY a new, randomly named test database. Never connects to RaceForge. */
@EnabledIfEnvironmentVariable(named="RUN_TRAINING_DB_TESTS",matches="true")
class TrainingRoadmapDatabaseTest {
 static void script(Connection c,String sql)throws Exception{for(String batch:sql.split("(?im)^GO\\s*$")){if(!batch.isBlank())try(var s=c.createStatement()){s.execute(batch);}}}
 static String read(String p)throws Exception{return Files.readString(Path.of(p));}
 static int count(Connection c,String table)throws Exception{try(var s=c.createStatement();var r=s.executeQuery("SELECT COUNT(*) FROM dbo."+table)){r.next();return r.getInt(1);}}
 @Test void schemaSeedTransactionIsolationAndSwagger()throws Exception{
  String name="RaceForgeTrainingTest_"+UUID.randomUUID().toString().replace("-","");
  String server=System.getenv().getOrDefault("TRAINING_TEST_SQL_SERVER","localhost:1433");
  String user=System.getenv().getOrDefault("DB_USERNAME","sa"),password=System.getenv().getOrDefault("DB_PASSWORD","12345");
  String root="jdbc:sqlserver://"+server+";encrypt=true;trustServerCertificate=true;databaseName=";
  try(Connection admin=DriverManager.getConnection(root+"master",user,password)){
   try(var s=admin.createStatement()){s.execute("CREATE DATABASE ["+name+"]");}
   try{
    try(Connection c=DriverManager.getConnection(root+name,user,password)){
     script(c,read("scripts/training/00_canonical_base_schema.sql"));
     // Establish the canonical V12 baseline without editing historical migrations.
     org.flywaydb.core.Flyway.configure().dataSource(root+name,user,password).baselineVersion("12").load().baseline();
     org.flywaydb.core.Flyway.configure().dataSource(root+name,user,password).locations("classpath:db/migration").load().migrate();
     try(var st=c.createStatement();var r=st.executeQuery("SELECT COL_LENGTH('dbo.Package_Roadmap_Template','source_urls_json')")){r.next();assertNull(r.getObject(1));}
     script(c,read("scripts/training/03_seed_demo.sql"));assertEquals(4,count(c,"TRAINING_PACKAGE"));assertEquals(4,count(c,"Package_Roadmap_Template"));assertEquals(14,count(c,"Package_Stage_Template"));
    }
    try(var app=new SpringApplicationBuilder(BackendApplication.class).run("--server.port=0","--spring.datasource.url="+root+name,"--spring.datasource.username="+user,"--spring.datasource.password="+password,"--spring.flyway.enabled=false","--raceforge.training.package-expiry-cron=-","--logging.level.root=WARN","--logging.level.org.springframework=INFO","--logging.level.org.hibernate.SQL=OFF")){
     int port=((WebServerApplicationContext)app).getWebServer().getPort();
     var http=java.net.http.HttpClient.newHttpClient();var docs=http.send(java.net.http.HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/v3/api-docs")).build(),java.net.http.HttpResponse.BodyHandlers.ofString());assertEquals(200,docs.statusCode());assertFalse(docs.body().contains("training-recommendations"));
     var ui=http.send(java.net.http.HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/swagger-ui/index.html")).build(),java.net.http.HttpResponse.BodyHandlers.ofString());assertEquals(200,ui.statusCode());
     var packages=app.getBean(TrainingPackageService.class);var roadmaps=app.getBean(PackageRoadmapTemplateService.class);
     var stage=new Stage(1,30,"Individual cues","HIGH",Set.of(LocalDate.now().plusDays(1).getDayOfWeek()),LocalTime.of(10,0),LocalTime.of(10,40),"Different stage","Individual objective","CUSTOM");
     var dto=new PackageRoadmapDto("Different Basic","A different goal",1,List.of(stage));
     var created=packages.create(new TrainingPackageCreateRequest("Different Basic","BASIC","Different template",30,BigDecimal.TEN,dto));assertEquals("Different Basic",roadmaps.read(created.packageId()).title());assertNotEquals(roadmaps.read("PKG-001").title(),roadmaps.read(created.packageId()).title());
     // Exercise independent horse snapshots and real scheduling transactions against this disposable DB.
     try(Connection c=DriverManager.getConnection(root+name,user,password)){
      script(c,"INSERT dbo.[User](user_id,role_id,full_name,email,status,email_verified) SELECT 'OWN-901',role_id,N'Test owner','owner901@example.invalid','ACTIVE',1 FROM dbo.Role WHERE role_name='HORSE_OWNER'; INSERT dbo.[User](user_id,role_id,full_name,email,status,email_verified) SELECT 'HTR-901',role_id,N'Test trainer','trainer901@example.invalid','ACTIVE',1 FROM dbo.Role WHERE role_name='HEAD_TRAINER'; INSERT dbo.[User](user_id,role_id,full_name,email,status,email_verified) SELECT 'VET-901',role_id,N'Test veterinarian','vet901@example.invalid','ACTIVE',1 FROM dbo.Role WHERE role_name='VETERINARIAN'; INSERT dbo.[User](user_id,role_id,full_name,email,status,email_verified) SELECT 'CM-901',role_id,N'Test manager','manager901@example.invalid','ACTIVE',1 FROM dbo.Role WHERE role_name='CLUB_MANAGER'; INSERT dbo.Trainer(trainer_id,user_id) VALUES('HTR-901','HTR-901'); INSERT dbo.Trainer_Detail(trainer_id,bio,qualifications,status,created_at) VALUES('HTR-901',N'',N'','ACTIVE',SYSDATETIME());");
      for(int i=1;i<=2;i++){String k="90"+i;script(c,"INSERT dbo.Horse(horse_id,owner_id,horse_name,health_status,training_locked,status) VALUES('HOR-"+k+"','OWN-901',N'Test horse','READY',0,'ACTIVE'); INSERT dbo.Horse_Admission(horse_id,status,created_at) VALUES('HOR-"+k+"','APPROVED',SYSDATETIME()); INSERT dbo.Health_Profile(profile_id,horse_id,created_at,updated_at) VALUES('HLT-"+k+"','HOR-"+k+"',SYSDATETIME(),SYSDATETIME()); INSERT dbo.Medical_Record(medical_record_id,profile_id,veterinarian_id,exam_type,examined_at,status,confirmed_at,created_at,updated_at,training_eligible,final_conclusion) VALUES('MED-"+k+"','HLT-"+k+"','VET-901','INITIAL',SYSDATETIME(),'CONFIRMED',SYSDATETIME(),SYSDATETIME(),SYSDATETIME(),1,'FIT'); INSERT dbo.Horse_Trainer(horse_id,trainer_id) VALUES('HOR-"+k+"','HTR-901'); INSERT dbo.HORSE_PACKAGE(horse_package_id,horse_id,package_id,registered_at,start_date,end_date,status,total_price,created_at,updated_at,payment_status) VALUES('HPG-"+k+"','HOR-"+k+"','"+created.packageId()+"',SYSDATETIME(),CAST(GETDATE() AS date),CAST(DATEADD(day,29,GETDATE()) AS date),'ACTIVE',10,SYSDATETIME(),SYSDATETIME(),'PAID'); INSERT dbo.Horse_Assignment(id,horse_id,kind,assigned_by,assignee_id,status,created_at) VALUES('ASN-"+k+"','HOR-"+k+"','TRAINER','CM-901','HTR-901','ACCEPTED',SYSDATETIME()); INSERT dbo.Training_Assignment(assignment_id,horse_package_id) VALUES('ASN-"+k+"','HPG-"+k+"');");}
     }
     var principal=new com.raceforge.backend.security.AuthenticatedUser("HTR-901","trainer901@example.invalid","ACTIVE",2,"HEAD_TRAINER");
     var auth=new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,List.of());
     org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
     var planService=app.getBean(TrainingPlanService.class);var roadmapService=app.getBean(TrainingRoadmapService.class);
     var testClock=Clock.fixed(LocalDate.now(ZoneId.of("Asia/Bangkok")).atTime(6,0).atZone(ZoneId.of("Asia/Bangkok")).toInstant(),ZoneId.of("Asia/Bangkok"));
     org.springframework.test.util.ReflectionTestUtils.setField(org.springframework.test.util.AopTestUtils.<TrainingRoadmapService>getTargetObject(roadmapService),"clock",testClock);
     org.springframework.test.util.ReflectionTestUtils.setField(org.springframework.test.util.AopTestUtils.<TrainingSessionService>getTargetObject(app.getBean(TrainingSessionService.class)),"clock",testClock);
     var requestA=new TrainingPlanCreateRequest();requestA.setPlanName("Horse A plan");requestA.setAssignmentId("ASN-901");requestA.setStages(List.of(new Stage(1,15,stage.activityName(),stage.intensity(),stage.daysOfWeek(),stage.sessionTime(),stage.sessionEndTime(),stage.title(),stage.objective(),stage.phaseCode()),new Stage(16,30,"Later horse-specific activity","LOW",stage.daysOfWeek(),stage.sessionTime(),stage.sessionEndTime(),"Later horse stage",null,"LATER")));
     var planA=planService.createPlan("HOR-901",requestA,"HTR-901");
     assertThrows(RuntimeException.class,()->planService.createPlan("HOR-901",requestA,"HTR-901"));
     var requestB=new TrainingPlanCreateRequest();requestB.setPlanName("Horse B plan");requestB.setAssignmentId("ASN-902");requestB.setStages(List.of(new Stage(1,30,"Horse B cues","LOW",Set.of(DayOfWeek.TUESDAY),LocalTime.of(8,0),LocalTime.of(8,30),"Horse B title",null,"HORSE_B")));
     var executor=java.util.concurrent.Executors.newFixedThreadPool(2);
     try{var tasks=new ArrayList<java.util.concurrent.Callable<Boolean>>();for(int i=0;i<2;i++)tasks.add(()->{org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);try{planService.createPlan("HOR-902",requestB,"HTR-901");return true;}catch(com.raceforge.backend.common.exception.BusinessRuleException expected){return false;}finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}});int success=0;for(var result:executor.invokeAll(tasks))if(result.get())success++;assertEquals(1,success);}finally{executor.shutdownNow();}
     assertEquals("Different stage",roadmapService.stages(planA.getPlanId()).get(0).get("title"));assertEquals("Different stage",roadmaps.read(created.packageId()).stages().get(0).title());
     LocalDate badDate=LocalDate.now().plusDays(8);
     try(Connection c=DriverManager.getConnection(root+name,user,password)){
      try(var sql=c.createStatement()){sql.execute("ALTER TABLE dbo.Training_Session ADD CONSTRAINT CK_TestPartialGeneration CHECK (CAST(scheduled_start AS date) <> '"+badDate+"')");}
      assertThrows(RuntimeException.class,()->roadmapService.generate(planA.getPlanId()));assertEquals(0,count(c,"Training_Session"));
      try(var sql=c.createStatement()){sql.execute("ALTER TABLE dbo.Training_Session DROP CONSTRAINT CK_TestPartialGeneration");}
      // Both requests enter the real SQL Server transaction concurrently.
      var generatePool=java.util.concurrent.Executors.newFixedThreadPool(2);
      var barrier=new java.util.concurrent.CyclicBarrier(2);
      List<TrainingSessionResponse> generated=new ArrayList<>();int generateSuccess=0;
      try{var work=new ArrayList<java.util.concurrent.Callable<List<TrainingSessionResponse>>>();for(int i=0;i<2;i++)work.add(()->{org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);try{barrier.await(10,java.util.concurrent.TimeUnit.SECONDS);return roadmapService.generate(planA.getPlanId());}catch(com.raceforge.backend.common.exception.BusinessRuleException expected){return List.of();}finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}});for(var result:generatePool.invokeAll(work)){var output=result.get();if(!output.isEmpty()){generateSuccess++;generated.addAll(output);}}}finally{generatePool.shutdownNow();}
      assertEquals(1,generateSuccess);assertTrue(generated.size()>=4);assertThrows(RuntimeException.class,()->roadmapService.generate(planA.getPlanId()));assertEquals(generated.size(),count(c,"Training_Session"));
      // A later non-overlapping slot on the same day is allowed; overlap is rejected.
      var one=new ScheduleSessionRequest();one.setPlanId(planA.getPlanId());one.setHorseId("HOR-901");one.setScheduledTime(badDate.atTime(12,0));one.setScheduledEnd(badDate.atTime(12,40));var extra=app.getBean(TrainingSessionService.class).scheduleSession(one);
      one.setScheduledTime(badDate.atTime(12,20));one.setScheduledEnd(badDate.atTime(13,0));assertThrows(RuntimeException.class,()->app.getBean(TrainingSessionService.class).scheduleSession(one));
      var sessions=app.getBean(TrainingSessionService.class);sessions.startSession(extra.getSessionId());var measurementClock=Clock.offset(testClock,Duration.ofMinutes(1));org.springframework.test.util.ReflectionTestUtils.setField(org.springframework.test.util.AopTestUtils.<TrainingSessionService>getTargetObject(sessions),"clock",measurementClock);sessions.stopSession(extra.getSessionId(),null);
      var measured=new CompleteSessionRequest();measured.setEndExerciseHeartRate(180);measured.setRecoveryHeartRate2Min(110);measured.setRecoveryMeasuredAt(LocalDateTime.now(measurementClock));measured.setDistance(new BigDecimal("1.20"));measured.setAvgSpeed(12.0);sessions.completeSession(extra.getSessionId(),measured,"HTR-901");assertNotNull(app.getBean(TrainingSessionFeedbackService.class).feedback(extra.getSessionId()).get("note"));
      // Simulate dates produced by resume; saved plan anchor and completed results remain intact.
      try(var sql=c.createStatement()){sql.execute("UPDATE dbo.HORSE_PACKAGE SET start_date=CAST(DATEADD(day,20,GETDATE()) AS date),end_date=CAST(DATEADD(day,30,GETDATE()) AS date) WHERE horse_package_id='HPG-901'");}
      var resumed=new ScheduleSessionRequest();resumed.setPlanId(planA.getPlanId());resumed.setHorseId("HOR-901");resumed.setScheduledTime(LocalDate.now().plusDays(20).atTime(14,0));resumed.setScheduledEnd(LocalDate.now().plusDays(20).atTime(14,40));var resumedSession=sessions.scheduleSession(resumed);assertEquals("Later horse stage",resumedSession.getStageTitle());
      try(var sql=c.createStatement();var r=sql.executeQuery("SELECT status FROM dbo.Training_Session WHERE session_id='"+extra.getSessionId()+"'")){r.next();assertEquals("COMPLETED",r.getString(1));}
     }
     // No future dates: the saved plan and stages remain, with no new sessions.
     String planB=planService.getPlansForHorse("HOR-902").get(0).planId();
     var expiredCutoff=Clock.offset(testClock,Duration.ofDays(40));
     org.springframework.test.util.ReflectionTestUtils.setField(org.springframework.test.util.AopTestUtils.<TrainingRoadmapService>getTargetObject(roadmapService),"clock",expiredCutoff);
     int stageCount=roadmapService.stages(planB).size();
     try(Connection c=DriverManager.getConnection(root+name,user,password)){int sessionCount=count(c,"Training_Session");assertTrue(assertThrows(com.raceforge.backend.common.exception.BusinessRuleException.class,()->roadmapService.generate(planB)).getMessage().contains("No future sessions"));assertEquals(sessionCount,count(c,"Training_Session"));assertEquals(stageCount,roadmapService.stages(planB).size());assertEquals("ACTIVE",app.getBean(com.raceforge.backend.training.repository.TrainingPlanRepository.class).findById(planB).orElseThrow().getStatus());}
     org.springframework.security.core.context.SecurityContextHolder.clearContext();
     // Force a SQL failure after package persistence; the entire transaction must roll back.
     try(Connection c=DriverManager.getConnection(root+name,user,password)){
      int before=count(c,"TRAINING_PACKAGE");
      try(var s=c.createStatement()){s.execute("ALTER TABLE dbo.Package_Stage_Template ADD CONSTRAINT CK_TestRejectStage CHECK(activity_name <> N'FAIL_DATABASE')");}
      var bad=new Stage(1,30,"FAIL_DATABASE","LOW",Set.of(DayOfWeek.MONDAY),LocalTime.of(9,0),LocalTime.of(9,30),"Title",null,"TEST");
      assertThrows(RuntimeException.class,()->packages.create(new TrainingPackageCreateRequest("Rollback","BASIC","",30,BigDecimal.TEN,new PackageRoadmapDto("Rollback","Rollback goal",1,List.of(bad)))));
      assertEquals(before,count(c,"TRAINING_PACKAGE"));assertEquals(before,count(c,"Package_Roadmap_Template"));
      try(var s=c.createStatement()){s.execute("ALTER TABLE dbo.Package_Stage_Template DROP CONSTRAINT CK_TestRejectStage");}
     }
    }
    try(Connection c=DriverManager.getConnection(root+name,user,password)){
     // Cleanup supports both already-cleaned schema and the old legacy FK graph.
     script(c,"CREATE TABLE dbo.Training_Protocol(protocol_id varchar(20) PRIMARY KEY); CREATE TABLE dbo.Training_Recommendation(recommendation_id varchar(20) PRIMARY KEY,protocol_id varchar(20) REFERENCES dbo.Training_Protocol(protocol_id)); ALTER TABLE dbo.Training_Plan ADD recommendation_id varchar(20) NULL REFERENCES dbo.Training_Recommendation(recommendation_id); CREATE TABLE dbo.Training_Medical_Context(medical_record_id varchar(20));");
     script(c,read("scripts/training/04_cleanup_legacy.sql"));script(c,read("scripts/training/04_cleanup_legacy.sql"));
     script(c,read("scripts/training/02_reset_training_TEST_ONLY.sql"));assertEquals(0,count(c,"TRAINING_PACKAGE"));script(c,read("scripts/training/03_seed_demo.sql"));assertEquals(4,count(c,"TRAINING_PACKAGE"));
    }
   }finally{if(!name.matches("RaceForgeTrainingTest_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test database name");try(var s=admin.createStatement()){s.execute("ALTER DATABASE ["+name+"] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ["+name+"]");}}
  }
 }

 @Test @EnabledIfEnvironmentVariable(named="MERGED_TRAINING_SQL",matches=".+")
 void mergedFullDatabaseScriptIsSelfContained()throws Exception{
  String name="RaceForgeTrainingTest_"+UUID.randomUUID().toString().replace("-","");
  String server=System.getenv().getOrDefault("TRAINING_TEST_SQL_SERVER","localhost:1433");
  String user=System.getenv().getOrDefault("DB_USERNAME","sa"),password=System.getenv().getOrDefault("DB_PASSWORD","12345");
  String root="jdbc:sqlserver://"+server+";encrypt=true;trustServerCertificate=true;databaseName=";
  byte[] bytes=Files.readAllBytes(Path.of(System.getenv("MERGED_TRAINING_SQL")));
  String source=new String(bytes,bytes.length>1&&bytes[0]==(byte)0xff?java.nio.charset.StandardCharsets.UTF_16:java.nio.charset.StandardCharsets.UTF_8);
  try(Connection admin=DriverManager.getConnection(root+"master",user,password)){
   try(var s=admin.createStatement()){s.execute("CREATE DATABASE ["+name+"]");}
   try{
    try(Connection c=DriverManager.getConnection(root+name,user,password)){
     for(String batch:source.split("(?im)^GO\\s*$")){
      // Never execute the original script's database selection/create/settings on master or RaceForge.
      if(java.util.regex.Pattern.compile("(?im)^\\s*(USE\\s|CREATE DATABASE\\s|ALTER DATABASE\\s)").matcher(batch).find())continue;
      script(c,batch);
     }
     assertEquals(4,count(c,"TRAINING_PACKAGE"));assertEquals(4,count(c,"Package_Roadmap_Template"));assertEquals(14,count(c,"Package_Stage_Template"));
     try(var s=c.createStatement();var r=s.executeQuery("SELECT OBJECT_ID('dbo.Training_Recommendation'),OBJECT_ID('dbo.Training_Protocol'),OBJECT_ID('dbo.Training_Medical_Context'),COL_LENGTH('dbo.Training_Plan','recommendation_id')")){r.next();for(int i=1;i<=4;i++)assertNull(r.getObject(i));}
    }
    var migration=org.flywaydb.core.Flyway.configure().dataSource(root+name,user,password).locations("classpath:db/migration").load().migrate();assertEquals(1,migration.migrationsExecuted);
   }finally{if(!name.matches("RaceForgeTrainingTest_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test database name");try(var s=admin.createStatement()){s.execute("ALTER DATABASE ["+name+"] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ["+name+"]");}}
  }
 }
}

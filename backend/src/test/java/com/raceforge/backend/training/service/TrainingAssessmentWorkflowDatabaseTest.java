package com.raceforge.backend.training.service;

import com.raceforge.backend.BackendApplication;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Real HTTP + SQL; only gateway confirmation is simulated, never an external payment. */
@EnabledIfEnvironmentVariable(named="RUN_TRAINING_DB_TESTS",matches="true")
class TrainingAssessmentWorkflowDatabaseTest {
    @Test void realHttpSessionNotificationVetReviewAndMedicalLock() throws Exception {
        String name="RaceForgeAssessmentWorkflowTest_"+UUID.randomUUID().toString().replace("-","");
        String root="jdbc:sqlserver://"+System.getenv().getOrDefault("TRAINING_TEST_SQL_SERVER","localhost:1433")+";encrypt=true;trustServerCertificate=true;databaseName=";
        String user=System.getenv().getOrDefault("DB_USERNAME","sa"),password=System.getenv().getOrDefault("DB_PASSWORD","12345");
        try(var admin=DriverManager.getConnection(root+"master",user,password)){
            sql(admin,"CREATE DATABASE ["+name+"]");System.out.println("ISOLATED_DB_CREATED "+name);
            try(var c=DriverManager.getConnection(root+name,user,password)){
                assertEquals(name,c.getCatalog());
                script(c,"scripts/training/00_canonical_base_schema.sql");
                var flyway=Flyway.configure().dataSource(root+name,user,password).baselineVersion("12").locations("classpath:db/migration").load();
                flyway.baseline();flyway.migrate();
                script(c,"src/test/resources/training/assessment_schema_TEST_ONLY.sql");
                script(c,"scripts/training/06_horse_package_expired_status.sql");
                script(c,"scripts/training/07_training_assessment_performance_codes.sql");
                script(c,"scripts/training/03_seed_demo.sql");seed(c);
                try(var app=new SpringApplicationBuilder(BackendApplication.class).run("--server.port=0",
                        "--spring.datasource.url="+root+name,"--spring.datasource.username="+user,"--spring.datasource.password="+password,
                        "--spring.jpa.hibernate.ddl-auto=validate","--spring.flyway.enabled=false","--spring.devtools.restart.enabled=false",
                        "--raceforge.bootstrap-admin.enabled=false","--raceforge.training.package-expiry-cron=-",
                        "--logging.level.root=WARN","--logging.level.org.springframework.web=WARN","--debug=false")){
                    int port=((WebServerApplicationContext)app).getWebServer().getPort();
                    String owner=TrainingCalendarFixDatabaseTest.login(port,"workflow-owner@example.invalid");
                    String manager=TrainingCalendarFixDatabaseTest.login(port,"workflow-manager@example.invalid");
                    String trainer=TrainingCalendarFixDatabaseTest.login(port,"workflow-trainer@example.invalid");
                    String vet=TrainingCalendarFixDatabaseTest.login(port,"workflow-vet@example.invalid");
                    var registration=http(port,owner,"POST","/api/horse-packages/register",Map.of("horseId","HOR-901","packageId","PKG-001"),201);
                    String packageId=registration.path("horsePackageId").asText();assertFalse(packageId.isBlank());
                    // Exercise the existing trusted payment callback boundary with synthetic success.
                    app.getBean(HorsePackageService.class).applyPayment(packageId,true,"OWN-901");
                    var assignment=http(port,manager,"POST","/api/trainer-assignments",Map.of("horsePackageId",packageId,"trainerId","HTR-901"),200);
                    String assignmentId=assignment.path("assignment_id").asText(assignment.path("id").asText());
                    assertFalse(assignmentId.isBlank(),assignment.toString());
                    http(port,trainer,"POST","/api/trainer-assignments/"+assignmentId+"/respond",Map.of("accepted",true,"reason","Synthetic acceptance"),200);
                    LocalDate today=LocalDate.now(ZoneId.of("Asia/Bangkok"));
                    Clock clock=Clock.fixed(today.atTime(8,0).atZone(ZoneId.of("Asia/Bangkok")).toInstant(),ZoneId.of("Asia/Bangkok"));
                    var sessions=app.getBean(TrainingSessionService.class);var coordinator=app.getBean(TrainingScheduleCoordinator.class);
                    TrainingCalendarFixDatabaseTest.setClock(clock,sessions,coordinator);
                    var plan=http(port,trainer,"POST","/api/horses/HOR-901/training-plans",Map.of(
                            "planName","Assessment HTTP regression","assignmentId",assignmentId,"startDate",today.toString(),
                            "endDate",today.plusDays(29).toString(),"stages",List.of(TrainingCalendarFixDatabaseTest.stage(1,30,today,10))),200);
                    String planId=plan.path("planId").asText();
                    List<String> ids=new ArrayList<>();
                    for(int hour=10;hour<=13;hour++){
                        var created=http(port,trainer,"POST","/api/training-sessions",Map.of("planId",planId,"horseId","HOR-901",
                                "scheduledTime",today.atTime(hour,0).format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                                "scheduledEnd",today.atTime(hour,30).format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)),200);
                        ids.add(created.path("sessionId").asText());
                    }
                    http(port,owner,"PATCH","/api/training-sessions/"+ids.get(0)+"/start",null,403);
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(0)+"/start",null,200);
                    clock=Clock.offset(clock,Duration.ofMinutes(1));TrainingCalendarFixDatabaseTest.setClock(clock,sessions,coordinator);
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(0)+"/stop",null,200);
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(0)+"/complete",completion(clock,null),200);
                    var normal=http(port,trainer,"GET","/api/training-sessions/"+ids.get(0)+"/assessment",null,200);
                    assertEquals("NO_ALERT_DETECTED",normal.path("alertLevel").asText());assertEquals(10,normal.path("items").size());
                    var manual=http(port,trainer,"POST","/api/training-sessions/"+ids.get(0)+"/vet-notification",Map.of("reason","Please review this synthetic observation."),200);
                    assertFalse(manual.path("startBlocked").asBoolean());
                    assertEquals("WAITING_FOR_VET_ASSIGNMENT",manual.path("requestStatus").asText());
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(1)+"/start",null,200);
                    clock=Clock.offset(clock,Duration.ofMinutes(1));TrainingCalendarFixDatabaseTest.setClock(clock,sessions,coordinator);
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(1)+"/stop",null,200);

                    sql(c,"ALTER TABLE dbo.Notification ADD CONSTRAINT CK_Test_Assessment_Notification CHECK(notification_type<>'TRAINING_ASSESSMENT_ALERT')");
                    try{
                        http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(1)+"/complete",completion(clock,"BALANCE"),409);
                        assertEquals("0",value(c,"SELECT COUNT(*) FROM dbo.Training_Session_Assessment WHERE session_id='"+ids.get(1)+"'"));
                        assertEquals("SCHEDULED",value(c,"SELECT status FROM dbo.Training_Session WHERE session_id='"+ids.get(1)+"'"));
                    } finally {sql(c,"ALTER TABLE dbo.Notification DROP CONSTRAINT CK_Test_Assessment_Notification");}
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(1)+"/complete",completion(clock,"BALANCE"),200);
                    var warning=http(port,trainer,"GET","/api/training-sessions/"+ids.get(1)+"/assessment",null,200);
                    assertEquals("VET_REVIEW_REQUIRED",warning.path("alertLevel").asText());
                    assertEquals("PENDING",warning.path("reviewStatus").asText());
                    assertEquals("WAITING_FOR_VET_ASSIGNMENT",warning.path("notificationStatus").asText());
                    assertEquals("PENDING_POST_TRAINING_REVIEW",http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(2)+"/start",null,409).path("code").asText());
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(1)+"/complete",completion(clock,"BALANCE"),409);
                    http(port,owner,"GET","/api/training-sessions/"+ids.get(1)+"/assessment",null,403);

                    var vetAssignment=http(port,manager,"POST","/api/medical/assignments/horses/HOR-901",Map.of("veterinarianId","VET-901"),201);
                    http(port,vet,"POST","/api/medical/assignments/"+vetAssignment.path("assignmentId").asText()+"/accept",null,200);
                    for(String session:ids.subList(0,2)){
                        String notificationId=value(c,"SELECT TOP(1) notification_id FROM dbo.Training_Assessment_Notification_Link WHERE session_id='"+session+"' AND recipient_id='VET-901' AND notification_id IS NOT NULL");
                        assertEquals(session,http(port,vet,"GET","/api/training-assessments/notifications/"+notificationId+"/target",null,200).path("sessionId").asText());
                        http(port,owner,"GET","/api/training-assessments/notifications/"+notificationId+"/target",null,403);
                    }
                    String warningNotification=value(c,"SELECT TOP(1) notification_id FROM dbo.Training_Assessment_Notification_Link WHERE session_id='"+ids.get(1)+"' AND recipient_id='VET-901'");
                    http(port,vet,"PATCH","/api/notifications/"+warningNotification+"/read",null,200);
                    assertEquals("PENDING",http(port,vet,"GET","/api/training-sessions/"+ids.get(1)+"/assessment",null,200).path("reviewStatus").asText());
                    String draft=createMedical(port,vet,ids.get(1),"FIT");
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(2)+"/start",null,409);
                    http(port,vet,"POST","/api/medical/records/"+draft+"/confirm",null,200);
                    assertEquals("RESOLVED",http(port,vet,"GET","/api/training-sessions/"+ids.get(1)+"/assessment",null,200).path("reviewStatus").asText());
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(2)+"/start",null,200);
                    clock=Clock.offset(clock,Duration.ofMinutes(1));TrainingCalendarFixDatabaseTest.setClock(clock,sessions,coordinator);
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(2)+"/stop",null,200);
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(2)+"/complete",completion(clock,"SPEED_CONTROL"),200);
                    assertEquals("URGENT_VET_REVIEW",http(port,vet,"GET","/api/training-sessions/"+ids.get(2)+"/assessment",null,200).path("alertLevel").asText());
                    String restriction=createMedical(port,vet,ids.get(2),"NOT_FIT");
                    http(port,vet,"POST","/api/medical/records/"+restriction+"/confirm",null,200);
                    assertEquals("RESOLVED",http(port,vet,"GET","/api/training-sessions/"+ids.get(2)+"/assessment",null,200).path("reviewStatus").asText());
                    assertEquals("1",value(c,"SELECT CAST(training_locked AS int) FROM dbo.Horse WHERE horse_id='HOR-901'"));
                    http(port,trainer,"PATCH","/api/training-sessions/"+ids.get(3)+"/start",null,409);
                    System.out.println("PASS HTTP workflow: auth, registration, synthetic payment, assignment, plan, Start/Stop/Complete, Normal manual request without Start hold, warning auto delivery, late vet assignment, notification scope/read, DRAFT/confirm, urgent review and persistent medical lock");
                    System.out.println("PASS DB assessment notification failure rolls back Session and Assessment; duplicate Complete rejected");
                }
            } finally{
                if(!name.matches("RaceForgeAssessmentWorkflowTest_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe database name");
                sql(admin,"ALTER DATABASE ["+name+"] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ["+name+"]");
                System.out.println("ISOLATED_DB_DROPPED "+name);
            }
        }
    }
    private static Map<String,Object> completion(Clock clock,String concern){
        Map<String,Boolean> checks=new LinkedHashMap<>();
        for(var criterion:com.raceforge.backend.training.entity.TrainingAssessmentCriterion.values())checks.put(criterion.name(),!criterion.name().equals(concern));
        return Map.of("distance",0,"avgSpeed",0,"endExerciseHeartRate",90,"recoveryHeartRate2Min",60,
                "recoveryMeasuredAt",LocalDateTime.now(clock).format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                "assessment",Map.of("checklistVersion","POST_TRAINING_V1","checks",checks));
    }
    private static String createMedical(int port,String vet,String session,String conclusion)throws Exception{
        Map<String,Object> body=new LinkedHashMap<>();
        body.put("profileId","HLT-901");body.put("postTrainingSessionId",session);body.put("examType","FOLLOW_UP");
        body.put("examinedAt",LocalDateTime.now(ZoneId.of("Asia/Bangkok")).format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        body.put("finalConclusion",conclusion);body.put("overrideReason","Synthetic clinical decision for regression.");
        body.put("trainingLockReason","Synthetic veterinary restriction for regression.");
        body.put("vitalSign",Map.of("bodyTemperature",37.5,"restingHeartRate",40,"restingRespiratoryRate",12,"weight",450));
        body.put("clinicalExams",List.of("EYES","NOSE","MOUTH","MOVEMENT_LEGS").stream().map(area->Map.of("examinationArea",area,"conditionStatus","NORMAL")).toList());
        var draft=http(port,vet,"POST","/api/medical/records",body,201);assertEquals("DRAFT",draft.path("status").asText());
        return draft.path("medicalRecordId").asText();
    }
    private static void seed(Connection c)throws Exception{
        String hash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("Demo@123456");
        sql(c,"SET IDENTITY_INSERT dbo.Role ON; INSERT dbo.Role(role_id,role_name) VALUES(1,'CLUB_MANAGER'),(2,'HEAD_TRAINER'),(3,'VETERINARIAN'),(4,'GROOM'),(5,'HORSE_OWNER'),(6,'USER'),(7,'ADMIN');SET IDENTITY_INSERT dbo.Role OFF;");
        for(String[] entry:List.of(new String[]{"OWN-901","5","owner"},new String[]{"CM-901","1","manager"},new String[]{"HTR-901","2","trainer"},new String[]{"VET-901","3","vet"}))
            sql(c,"INSERT dbo.[User](user_id,role_id,full_name,email,password,status,email_verified) VALUES('"+entry[0]+"',"+entry[1]+",N'Synthetic workflow "+entry[2]+"','workflow-"+entry[2]+"@example.invalid','"+hash+"','ACTIVE',1)");
        sql(c,"""
            INSERT dbo.Trainer(trainer_id,user_id) VALUES('HTR-901','HTR-901');
            INSERT dbo.Trainer_Detail(trainer_id,status,created_at) VALUES('HTR-901','ACTIVE',SYSDATETIME());
            INSERT dbo.Horse(horse_id,owner_id,horse_name,health_status,training_locked,status) VALUES('HOR-901','OWN-901',N'Synthetic HTTP workflow','READY',0,'ACTIVE');
            INSERT dbo.Horse_Admission(horse_id,status,created_at) VALUES('HOR-901','APPROVED',SYSDATETIME());
            INSERT dbo.Health_Profile(profile_id,horse_id,created_at,updated_at) VALUES('HLT-901','HOR-901',SYSDATETIME(),SYSDATETIME());
            INSERT dbo.Medical_Record(medical_record_id,profile_id,veterinarian_id,exam_type,examined_at,status,confirmed_at,created_at,updated_at,training_eligible,final_conclusion)
            VALUES('MED-901','HLT-901','VET-901','INITIAL',SYSDATETIME(),'CONFIRMED',SYSDATETIME(),SYSDATETIME(),SYSDATETIME(),1,'FIT');
            INSERT dbo.Medical_Vital_Sign(vital_sign_id,medical_record_id,body_temperature,resting_heart_rate,resting_respiratory_rate,weight) VALUES('VIT-901','MED-901',37.5,40,12,450);
            INSERT dbo.Medical_Clinical_Exam(clinical_exam_id,medical_record_id,examination_area,condition_status) VALUES('CLN-901','MED-901','MOVEMENT_LEGS','NORMAL');
            """);
    }
    private static tools.jackson.databind.JsonNode http(int port,String token,String method,String path,Object body,int status)throws Exception{
        return TrainingCalendarFixDatabaseTest.http(port,token,method,path,body,status);
    }
    private static void script(Connection c,String file)throws Exception{TrainingRoadmapDatabaseTest.script(c,Files.readString(Path.of(file)));}
    private static void sql(Connection c,String statement)throws Exception{try(var s=c.createStatement()){s.execute(statement);}}
    private static String value(Connection c,String statement)throws Exception{try(var s=c.createStatement();var r=s.executeQuery(statement)){assertTrue(r.next(),statement);return r.getString(1);}}
}

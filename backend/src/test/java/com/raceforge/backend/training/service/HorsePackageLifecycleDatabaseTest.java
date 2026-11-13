package com.raceforge.backend.training.service;

import com.raceforge.backend.BackendApplication;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.dto.ScheduleSessionRequest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Real SQL Server transactions/races. Creates and drops only its UUID-named test database. */
@EnabledIfEnvironmentVariable(named="RUN_TRAINING_DB_TESTS", matches="true")
class HorsePackageLifecycleDatabaseTest {
    @Test void cancellationCompletionRollbackAndRacesUseRealDatabase() throws Exception {
        String database="RaceForgeLifecycleTest_"+UUID.randomUUID().toString().replace("-","");
        String host=System.getenv().getOrDefault("TRAINING_TEST_SQL_SERVER","localhost:1433");
        String root="jdbc:sqlserver://"+host+";encrypt=true;trustServerCertificate=true;databaseName=";
        String user=System.getenv().getOrDefault("DB_USERNAME","sa"), password=System.getenv().getOrDefault("DB_PASSWORD","12345");
        try(var admin=DriverManager.getConnection(root+"master",user,password)) {
            sql(admin,"CREATE DATABASE ["+database+"]");
            System.out.println("ISOLATED_DB_CREATED "+database);
            try {
                try(var connection=DriverManager.getConnection(root+database,user,password)) {
                    String schema=Files.readString(Path.of("scripts/training/00_canonical_base_schema.sql"));
                    assertFalse(java.util.regex.Pattern.compile("(?im)^\s*(USE|CREATE DATABASE|ALTER DATABASE)\s").matcher(schema).find());
                    TrainingRoadmapDatabaseTest.script(connection,schema);
                    var flyway=Flyway.configure().dataSource(root+database,user,password).baselineVersion("12").locations("classpath:db/migration").load();
                    flyway.baseline(); flyway.migrate();
                    TrainingRoadmapDatabaseTest.script(connection, Files.readString(Path.of("scripts/training/06_horse_package_expired_status.sql")));
                    TrainingRoadmapDatabaseTest.script(connection,Files.readString(Path.of("src/test/resources/training/assessment_schema_TEST_ONLY.sql")));
                    TrainingRoadmapDatabaseTest.script(connection,Files.readString(Path.of("scripts/training/07_training_assessment_performance_codes.sql")));
                    seed(connection);
                    try(var app=new SpringApplicationBuilder(BackendApplication.class).run(
                            "--server.port=0","--spring.datasource.url="+root+database,
                            "--spring.datasource.username="+user,"--spring.datasource.password="+password,
                            "--spring.jpa.hibernate.ddl-auto=validate","--spring.flyway.enabled=false",
                            "--spring.devtools.restart.enabled=false","--raceforge.bootstrap-admin.enabled=false",
                            "--raceforge.training.package-expiry-cron=-","--logging.level.root=WARN",
                            "--logging.level.org.hibernate.SQL=OFF","--debug=false")) {
                        try(var check=app.getBean(javax.sql.DataSource.class).getConnection()){assertEquals(database,check.getCatalog());}
                        verifyCancelAndHistory(connection,app);
                        verifyCompletionAndCertificate(connection,app);
                        verifyUnfinishedAndExpired(connection,app);
                        verifyRollbacks(connection,app);
                        verifyRaces(connection,app);
                    } finally { SecurityContextHolder.clearContext(); }
                }
            } finally {
                if(!database.matches("RaceForgeLifecycleTest_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test database name");
                sql(admin,"ALTER DATABASE ["+database+"] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ["+database+"]");
                System.out.println("ISOLATED_DB_DROPPED "+database);
            }
        }
    }

    private static void verifyCancelAndHistory(Connection c,ConfigurableApplicationContext app) throws Exception {
        var lifecycle=app.getBean(HorsePackageLifecycleService.class); login("HORSE_OWNER");
        var result=lifecycle.cancel("HPG-901"); assertEquals(2,result.deletedSessionCount());
        assertEquals("CANCELLED",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-901'"));
        assertEquals("PAID",value(c,"SELECT payment_status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-901'"));
        assertEquals("0",value(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE session_id IN ('SES-901','SES-804')"));
        assertEquals("3",value(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE session_id IN ('SES-801','SES-802','SES-803')"));
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Plan WHERE plan_id='PLN-901'"));
        assertEquals("PENDING",value(c,"SELECT review_status FROM dbo.Training_Session_Assessment WHERE session_id='SES-801'"));
        assertEquals("10",value(c,"SELECT COUNT(*) FROM dbo.Training_Session_Assessment_Item WHERE session_id='SES-801'"));
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Assessment_Notification_Link WHERE session_id='SES-801'"));
        assertEquals("MED-901",value(c,"SELECT linked_medical_record_id FROM dbo.Training_Session_Assessment WHERE session_id='SES-801'"));
        assertEquals("CANCELLED",value(c,"SELECT status FROM dbo.Horse_Assignment WHERE id='ASN-901'"));
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Assignment WHERE assignment_id='ASN-901' AND ended_at IS NOT NULL"));
        assertEquals("0",value(c,"SELECT COUNT(*) FROM dbo.Horse_Trainer WHERE horse_id='HOR-901'"));
        assertEquals("READY",value(c,"SELECT health_status FROM dbo.Horse WHERE horse_id='HOR-901'"));
        assertThrows(ApiException.class,()->lifecycle.cancel("HPG-901"));
        // A paused package can be cancelled without releasing the horse's medical lock.
        sql(c,"UPDATE dbo.Horse SET training_locked=1 WHERE horse_id='HOR-905'; UPDATE dbo.HORSE_PACKAGE SET status='PAUSED',paused_at=SYSDATETIME(),pause_reason='medical' WHERE horse_package_id='HPG-905'");
        lifecycle.cancel("HPG-905");
        assertEquals("1",value(c,"SELECT CAST(training_locked AS int) FROM dbo.Horse WHERE horse_id='HOR-905'"));
        assertEquals("ACTIVE",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-902'"));
        System.out.println("PASS DB cancel: exact scope, paid history, assessment, medical linkage and lock retained");
    }

    private static void verifyCompletionAndCertificate(Connection c,ConfigurableApplicationContext app) throws Exception {
        var lifecycle=app.getBean(HorsePackageLifecycleService.class); login("HEAD_TRAINER");
        var result=lifecycle.complete("HPG-902"); assertEquals("RF-HPG-902",result.certificate().certificateNumber());
        assertEquals("COMPLETED",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-902'"));
        assertEquals("0",value(c,"SELECT remaining_days FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-902'"));
        sql(c,"UPDATE dbo.Horse SET horse_name=N'Changed later' WHERE horse_id='HOR-902'");
        var access=app.getBean(TrainingCertificateAccess.class);
        var certificate=access.certificate("HPG-902","OWN-901");
        assertEquals("Lifecycle horse 902",certificate.getHorseNameAtIssue());
        assertThrows(ResourceNotFoundException.class,()->access.certificate("HPG-902","OWN-902"));
        byte[] pdf=app.getBean(TrainingCertificatePdf.class).render(certificate);
        assertTrue(new String(pdf,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF"));
        assertThrows(ApiException.class,()->lifecycle.complete("HPG-902"));
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Certificate WHERE horse_package_id='HPG-902'"));
        lifecycle.complete("HPG-914"); // MISSED alone counts as finalized by the chosen business policy.
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Certificate WHERE horse_package_id='HPG-914'"));
        System.out.println("PASS DB completion: COMPLETED/MISSED accepted, certificate once, snapshot and owner PDF access");
    }

    private static void verifyUnfinishedAndExpired(Connection c,ConfigurableApplicationContext app) throws Exception {
        var lifecycle=app.getBean(HorsePackageLifecycleService.class); login("HORSE_OWNER");
        assertThrows(ApiException.class,()->lifecycle.cancel("HPG-903"));
        assertThrows(ApiException.class,()->lifecycle.cancel("HPG-904"));
        assertEquals("2",value(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE session_id IN ('SES-903','SES-904')"));
        var expiry=app.getBean(TrainingPackageExpirationService.class);
        assertTrue(expiry.expireRegistration("HPG-906",LocalDate.now(ZoneId.of("Asia/Bangkok"))));
        assertEquals("EXPIRED",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-906'"));
        assertEquals("0",value(c,"SELECT COUNT(*) FROM dbo.Training_Certificate WHERE horse_package_id='HPG-906'"));
        login("HEAD_TRAINER"); assertThrows(ApiException.class,()->lifecycle.complete("HPG-906"));
        // Release the intentionally unfinished fixtures before racing a start on the same trainer.
        sql(c,"UPDATE dbo.Training_Session SET status='MISSED',recorded_by='HTR-901' WHERE session_id IN ('SES-903','SES-904')");
        assertEquals("RF-HPG-913",app.getBean(TrainingCertificateAccess.class).certificate("HPG-913","OWN-901").getCertificateNumber());
        System.out.println("PASS DB unfinished sessions block cancellation; expiry creates no certificate; historical certificate retained");
    }

    private static void verifyRollbacks(Connection c,ConfigurableApplicationContext app) throws Exception {
        var lifecycle=app.getBean(HorsePackageLifecycleService.class);
        sql(c,"ALTER TABLE dbo.Training_Certificate ADD CONSTRAINT CK_Test_Reject_Issuance CHECK(horse_package_id<>'HPG-910')");
        try {
            login("HEAD_TRAINER"); assertThrows(RuntimeException.class,()->lifecycle.complete("HPG-910"));
            assertActiveAssignment(c,"910"); assertEquals("ACTIVE",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-910'"));
            assertEquals("0",value(c,"SELECT COUNT(*) FROM dbo.Training_Certificate WHERE horse_package_id='HPG-910'"));
        } finally {sql(c,"ALTER TABLE dbo.Training_Certificate DROP CONSTRAINT CK_Test_Reject_Issuance");}
        sql(c,"CREATE TABLE dbo.Test_Session_Dependency(session_id varchar(20) NOT NULL REFERENCES dbo.Training_Session(session_id)); INSERT dbo.Test_Session_Dependency VALUES('SES-911')");
        try {
            login("HORSE_OWNER"); assertThrows(RuntimeException.class,()->lifecycle.cancel("HPG-911"));
            assertActiveAssignment(c,"911"); assertEquals("ACTIVE",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-911'"));
            assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE session_id='SES-911'"));
        } finally {sql(c,"DROP TABLE dbo.Test_Session_Dependency");}
        sql(c,"ALTER TABLE dbo.Audit_Log ADD CONSTRAINT CK_Test_Reject_Event CHECK(entity_id<>'HPG-912')");
        try {
            login("HORSE_OWNER"); assertThrows(RuntimeException.class,()->lifecycle.cancel("HPG-912"));
            assertActiveAssignment(c,"912"); assertEquals("ACTIVE",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-912'"));
            assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE session_id='SES-912'"));
        } finally {sql(c,"ALTER TABLE dbo.Audit_Log DROP CONSTRAINT CK_Test_Reject_Event");}
        System.out.println("PASS DB rollback: certificate, dependent Session and audit failures restore registration/assignments/session data");
    }

    private static void verifyRaces(Connection c,ConfigurableApplicationContext app) throws Exception {
        var lifecycle=app.getBean(HorsePackageLifecycleService.class);
        boolean[] completion=race(()->{login("HEAD_TRAINER");lifecycle.complete("HPG-907");},
                ()->{login("HEAD_TRAINER");lifecycle.complete("HPG-907");});
        assertNotEquals(completion[0],completion[1]);
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Certificate WHERE horse_package_id='HPG-907'"));
        var sessionService=app.getBean(TrainingSessionService.class);
        boolean[] cancelStart=race(()->{login("HORSE_OWNER");lifecycle.cancel("HPG-908");},
                ()->{login("HEAD_TRAINER");sessionService.startSession("SES-908");});
        assertNotEquals(cancelStart[0],cancelStart[1]);
        if(cancelStart[0])assertEquals("0",value(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE session_id='SES-908'"));
        else {assertActiveAssignment(c,"908");assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Session WHERE session_id='SES-908' AND actual_start IS NOT NULL"));}
        var request=new ScheduleSessionRequest();request.setPlanId("PLN-909");request.setHorseId("HOR-909");
        request.setScheduledTime(LocalDate.now(ZoneId.of("Asia/Bangkok")).plusDays(1).atTime(23,0));
        request.setScheduledEnd(request.getScheduledTime().plusMinutes(10));
        boolean[] completeCreate=race(()->{login("HEAD_TRAINER");lifecycle.complete("HPG-909");},
                ()->{login("HEAD_TRAINER");sessionService.scheduleSession(request);});
        assertNotEquals(completeCreate[0],completeCreate[1]);
        assertEquals(completeCreate[0]?"COMPLETED":"ACTIVE",value(c,"SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-909'"));
        assertEquals(completeCreate[0]?"0":"1",value(c,"SELECT COUNT(*) FROM dbo.Training_Session s JOIN dbo.Training_Plan p ON p.plan_id=s.plan_id WHERE p.horse_package_id='HPG-909' AND s.status='SCHEDULED'"));
        System.out.println("PASS DB races: Complete/Complete, Cancel/Start and Complete/Create are serialized with one valid outcome");
    }

    private static boolean[] race(Runnable first,Runnable second) throws Exception {
        var pool=Executors.newFixedThreadPool(2);var ready=new CountDownLatch(2);var go=new CountDownLatch(1);
        try {
            List<Future<Boolean>> tasks=new ArrayList<>();
            for(Runnable work:List.of(first,second))tasks.add(pool.submit(()->{ready.countDown();assertTrue(go.await(10,TimeUnit.SECONDS));
                try {work.run();return true;}catch(ApiException|BusinessRuleException|ResourceNotFoundException|AccessDeniedException expected){return false;}
                finally {SecurityContextHolder.clearContext();}}));
            assertTrue(ready.await(10,TimeUnit.SECONDS));go.countDown();
            return new boolean[]{tasks.get(0).get(30,TimeUnit.SECONDS),tasks.get(1).get(30,TimeUnit.SECONDS)};
        } finally {pool.shutdownNow();}
    }
    private static void assertActiveAssignment(Connection c,String suffix) throws Exception {
        assertEquals("ACCEPTED",value(c,"SELECT status FROM dbo.Horse_Assignment WHERE id='ASN-"+suffix+"'"));
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Training_Assignment WHERE assignment_id='ASN-"+suffix+"' AND ended_at IS NULL"));
        assertEquals("1",value(c,"SELECT COUNT(*) FROM dbo.Horse_Trainer WHERE horse_id='HOR-"+suffix+"'"));
    }
    private static void login(String role) {
        String id=role.equals("HORSE_OWNER")?"OWN-901":"HTR-901";
        var p=new AuthenticatedUser(id,"test@example.invalid","ACTIVE",role.equals("HORSE_OWNER")?5:2,role);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(p,null,List.of(new SimpleGrantedAuthority(role))));
    }
    private static void seed(Connection c) throws Exception {
        sql(c,"""
                SET IDENTITY_INSERT dbo.Role ON;
                INSERT dbo.Role(role_id,role_name) VALUES(2,'HEAD_TRAINER'),(3,'VETERINARIAN'),(5,'HORSE_OWNER'),(6,'CLUB_MANAGER');
                SET IDENTITY_INSERT dbo.Role OFF;
                INSERT dbo.[User](user_id,role_id,full_name,email,password,status,email_verified) VALUES
                ('OWN-901',5,N'Test owner','owner@example.invalid','unused','ACTIVE',1),
                ('HTR-901',2,N'Test trainer','trainer@example.invalid','unused','ACTIVE',1),
                ('VET-901',3,N'Test vet','vet@example.invalid','unused','ACTIVE',1),
                ('CM-901',6,N'Test manager','manager@example.invalid','unused','ACTIVE',1);
                INSERT dbo.Trainer(trainer_id,user_id) VALUES('HTR-901','HTR-901');
                INSERT dbo.Trainer_Detail(trainer_id,bio,qualifications,status,created_at) VALUES('HTR-901',N'',N'','ACTIVE',SYSDATETIME());
                INSERT dbo.TRAINING_PACKAGE(package_id,package_name,package_type,duration_days,price,status,created_at,updated_at)
                VALUES('PKG-901',N'Test package','BASIC',30,1000,'ACTIVE',SYSDATETIME(),SYSDATETIME());
                """);
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Bangkok"));
        for(int i=901;i<=914;i++) {
            String k=Integer.toString(i);boolean finished=Set.of(902,907,909,910,913).contains(i);
            String status=i==914?"MISSED":finished?"COMPLETED":"SCHEDULED";
            LocalDate end=i==906?today.minusDays(1):today.plusDays(19);
            sql(c,"INSERT dbo.Horse(horse_id,owner_id,horse_name,health_status,training_locked,status) VALUES('HOR-"+k+"','OWN-901',N'Lifecycle horse "+k+"','READY',0,'ACTIVE');"
                    +"INSERT dbo.Horse_Admission(horse_id,status,created_at) VALUES('HOR-"+k+"','APPROVED',SYSDATETIME());"
                    +"INSERT dbo.HORSE_PACKAGE(horse_package_id,horse_id,package_id,registered_at,start_date,end_date,status,payment_status,total_price,remaining_days,created_at,updated_at) VALUES('HPG-"+k+"','HOR-"+k+"','PKG-901',SYSDATETIME(),'"+today.minusDays(10)+"','"+end+"','"+(i==913?"COMPLETED":"ACTIVE")+"','PAID',1000,20,SYSDATETIME(),SYSDATETIME());"
                    +"INSERT dbo.Horse_Trainer(horse_id,trainer_id) VALUES('HOR-"+k+"','HTR-901');"
                    +"INSERT dbo.Horse_Assignment(id,horse_id,kind,assigned_by,assignee_id,status,created_at) VALUES('ASN-"+k+"','HOR-"+k+"','TRAINER','CM-901','HTR-901','ACCEPTED',SYSDATETIME());"
                    +"INSERT dbo.Training_Assignment(assignment_id,horse_package_id) VALUES('ASN-"+k+"','HPG-"+k+"');"
                    +"INSERT dbo.Training_Plan(plan_id,plan_name,status,horse_id,horse_package_id,trainer_assignment_id,created_by,package_type) VALUES('PLN-"+k+"',N'Test plan','ACTIVE','HOR-"+k+"','HPG-"+k+"','ASN-"+k+"','HTR-901','BASIC');"
                    +"INSERT dbo.Horse_Plan(plan_id,horse_id,start_date,end_date,status) VALUES('PLN-"+k+"','HOR-"+k+"','"+today.minusDays(10)+"','"+end+"','ACTIVE');"
                    +"INSERT dbo.Training_Stage(stage_id,plan_id,stage_order,start_day,end_day,activity_name,intensity,weekdays_json,session_time,session_end_time,phase_code,title) VALUES('STG-"+k+"','PLN-"+k+"',1,1,30,N'Test exercise','LOW','[\"FRIDAY\"]','07:00','07:10','FOUNDATION',N'Test stage');");
            addSession(c,"SES-"+k,i,status,today.plusDays(1).atTime(5+(i-901)/2,(i%2)*20));
        }
        addSession(c,"SES-801",901,"COMPLETED",today.minusDays(1).atTime(7,0));
        addSession(c,"SES-802",901,"MISSED",today.minusDays(1).atTime(8,0));
        addSession(c,"SES-803",901,"CANCELLED",today.minusDays(1).atTime(9,0));
        addSession(c,"SES-804",901,"SCHEDULED",today.minusDays(1).atTime(10,0));
        addSession(c,"SES-805",902,"MISSED",today.minusDays(1).atTime(11,0));
        addSession(c,"SES-806",902,"CANCELLED",today.minusDays(1).atTime(12,0));
        sql(c,"UPDATE dbo.Training_Session SET actual_start=DATEADD(minute,-10,SYSDATETIME()) WHERE session_id IN ('SES-903','SES-904'); UPDATE dbo.Training_Session SET actual_end=DATEADD(minute,-5,SYSDATETIME()) WHERE session_id='SES-904';"
                +"INSERT dbo.Health_Profile(profile_id,horse_id,created_at,updated_at) VALUES('HLT-901','HOR-901',SYSDATETIME(),SYSDATETIME()),('HLT-908','HOR-908',SYSDATETIME(),SYSDATETIME()),('HLT-909','HOR-909',SYSDATETIME(),SYSDATETIME());"
                +"INSERT dbo.Medical_Record(medical_record_id,profile_id,veterinarian_id,exam_type,examined_at,status,confirmed_at,created_at,updated_at,training_eligible,final_conclusion) SELECT id,profile,'VET-901','INITIAL',SYSDATETIME(),'CONFIRMED',SYSDATETIME(),SYSDATETIME(),SYSDATETIME(),1,'FIT' FROM(VALUES('MED-901','HLT-901'),('MED-908','HLT-908'),('MED-909','HLT-909'))f(id,profile);"
                +"INSERT dbo.Training_Certificate(horse_package_id,certificate_number,horse_name_at_issue,issue_date) VALUES('HPG-913','RF-HPG-913',N'Historical horse','2026-01-01');"
                +"INSERT dbo.Training_Session_Assessment(session_id,checklist_version,passed_count,base_alert_level,alert_level,trigger_codes,review_status,notification_status,assessor_id,assessed_at,linked_medical_record_id,version) VALUES('SES-801','POST_TRAINING_V1',6,'VET_REVIEW_REQUIRED','VET_REVIEW_REQUIRED','','PENDING','SENT','HTR-901',SYSDATETIME(),'MED-901',0);"
                +"INSERT dbo.Training_Assessment_Notification_Link(link_id,session_id,recipient_id,notification_type,source,delivery_status,created_at) VALUES('test-link','SES-801','VET-901','POST_TRAINING_AUTO','AUTO','SENT',SYSDATETIME());");
        int n=0;for(var criterion:com.raceforge.backend.training.entity.TrainingAssessmentCriterion.values())
            sql(c,"INSERT dbo.Training_Session_Assessment_Item(item_id,session_id,criterion_code,passed) VALUES('item-"+(++n)+"','SES-801','"+criterion.name()+"',1)");
    }
    private static void addSession(Connection c,String id,int suffix,String status,LocalDateTime start) throws Exception {
        sql(c,"INSERT dbo.Training_Session(session_id,plan_id,horse_id,scheduled_start,scheduled_end,intensity,status,recorded_by) VALUES('"+id+"','PLN-"+suffix+"','HOR-"+suffix+"','"+start.format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)+"','"+start.plusMinutes(10).format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)+"','LOW','"+status+"',"+(status.equals("COMPLETED")?"'HTR-901'":"NULL")+")");
    }
    private static void sql(Connection c,String statement) throws Exception {try(var s=c.createStatement()){s.execute(statement);}}
    private static String value(Connection c,String query) throws Exception {try(var s=c.createStatement();var r=s.executeQuery(query)){assertTrue(r.next());return r.getString(1);}}
}

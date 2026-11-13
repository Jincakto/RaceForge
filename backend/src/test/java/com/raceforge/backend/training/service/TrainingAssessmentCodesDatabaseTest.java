package com.raceforge.backend.training.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Executes the manual rename only inside a fresh, UUID-named disposable database. */
@EnabledIfEnvironmentVariable(named="RUN_TRAINING_DB_TESTS", matches="true")
class TrainingAssessmentCodesDatabaseTest {
    private static final List<String> OLD = List.of("ALERTNESS","COORDINATION","BREATHING_EFFORT","GAIT",
            "LIMB_CONDITION","MUSCLE_COMFORT","EXTERNAL_INJURY","SWEATING","MUCOUS_MEMBRANES","NASAL_BLEEDING");
    private static final List<String> NEW = List.of("TASK_COMPLETION","SPEED_CONTROL","MOVEMENT_STABILITY","BALANCE",
            "COMMAND_RESPONSE","FOCUS","STAMINA","SPEED_TRANSITION","COOPERATION","PERFORMANCE_CONSISTENCY");

    @Test void renamePreservesDataAndOrderAndRejectsInvalidInputAtomically() throws Exception {
        String name="RaceForgeAssessmentCodesTest_"+UUID.randomUUID().toString().replace("-","");
        String root="jdbc:sqlserver://"+System.getenv().getOrDefault("TRAINING_TEST_SQL_SERVER","localhost:1433")
                +";encrypt=true;trustServerCertificate=true;databaseName=";
        String user=System.getenv().getOrDefault("DB_USERNAME","sa"),password=System.getenv().getOrDefault("DB_PASSWORD","12345");
        String script=Files.readString(Path.of("scripts/training/07_training_assessment_performance_codes.sql"));
        try(Connection admin=DriverManager.getConnection(root+"master",user,password)) {
            exec(admin,"CREATE DATABASE ["+name+"]");
            System.out.println("ISOLATED_DB_CREATED "+name);
            try(Connection c=DriverManager.getConnection(root+name,user,password)) {
                assertEquals(name,c.getCatalog());
                exec(c,"""
                    CREATE TABLE dbo.Training_Session_Assessment (
                      session_id varchar(20) NOT NULL PRIMARY KEY, trigger_codes varchar(500) NOT NULL,
                      passed_count int NOT NULL, alert_level varchar(30) NOT NULL,
                      review_status varchar(30) NOT NULL, notification_status varchar(40) NOT NULL,
                      linked_medical_record_id varchar(20) NULL, version bigint NOT NULL);
                    CREATE TABLE dbo.Training_Session_Assessment_Item (
                      item_id varchar(36) NOT NULL PRIMARY KEY,
                      session_id varchar(20) NOT NULL REFERENCES dbo.Training_Session_Assessment(session_id),
                      criterion_code varchar(40) NOT NULL, passed bit NOT NULL, fail_note varchar(1000) NULL,
                      CONSTRAINT UK_Test_Item UNIQUE(session_id,criterion_code));
                    CREATE TABLE dbo.Notification(notification_id int NOT NULL PRIMARY KEY,message varchar(255) NOT NULL);
                    INSERT dbo.Notification VALUES(1,'Previously delivered notification, unchanged');
                    """);
                allowCodes(c,OLD);
                parent(c,"SES-001","SCORE_REVIEW,COORDINATION,GAIT,NASAL_BLEEDING");
                for(int i=0;i<10;i++) item(c,"item-"+i,"SES-001",OLD.get(i),i%3!=0);
                String parentBefore=untouchedParent(c),itemsBefore=untouchedItems(c),notificationBefore=scalar(c,"SELECT message FROM dbo.Notification");
                exec(c,script);
                assertEquals("SCORE_REVIEW,SPEED_CONTROL,BALANCE,PERFORMANCE_CONSISTENCY",scalar(c,"SELECT trigger_codes FROM dbo.Training_Session_Assessment"));
                assertEquals(new TreeSet<>(NEW),codes(c));
                assertEquals(parentBefore,untouchedParent(c));assertEquals(itemsBefore,untouchedItems(c));
                assertEquals(notificationBefore,scalar(c,"SELECT message FROM dbo.Notification"));
                assertThrows(SQLException.class,()->item(c,"old-again","SES-001","ALERTNESS",true));
                assertEquals("0",scalar(c,"SELECT CONVERT(varchar(10),is_not_trusted) FROM sys.check_constraints WHERE name='CK_TSAI_Criterion'"));
                String snapshot=snapshot(c);
                exec(c,script);assertEquals(snapshot,snapshot(c));
                System.out.println("PASS SQL07 legacy rename, ordered triggers, unchanged values/links/notifications, strict constraint and repeat run");

                clear(c);allowCodes(c,java.util.stream.Stream.concat(OLD.stream(),NEW.stream()).toList());
                parent(c,"SES-002","SCORE_URGENT,SPEED_CONTROL,BREATHING_EFFORT,PERFORMANCE_CONSISTENCY");
                for(int i=0;i<10;i++) item(c,"mixed-"+i,"SES-002",i%2==0?OLD.get(i):NEW.get(i),true);
                exec(c,script);assertEquals(new TreeSet<>(NEW),codes(c));
                assertEquals("SCORE_URGENT,SPEED_CONTROL,MOVEMENT_STABILITY,PERFORMANCE_CONSISTENCY",scalar(c,"SELECT trigger_codes FROM dbo.Training_Session_Assessment"));
                clear(c);exec(c,script);exec(c,script);assertEquals("0",scalar(c,"SELECT COUNT(*) FROM dbo.Training_Session_Assessment_Item"));
                System.out.println("PASS SQL07 mixed old/new input, unchanged score tokens and empty database idempotence");

                clear(c);dropCriterion(c);parent(c,"SES-003","GAIT");
                item(c,"collision-old","SES-003","ALERTNESS",true);item(c,"collision-new","SES-003","TASK_COMPLETION",false);
                rejected(c,script,51002);
                clear(c);parent(c,"SES-004","GAIT");item(c,"unknown","SES-004","UNKNOWN",true);rejected(c,script,51001);
                clear(c);parent(c,"SES-005","SCORE_REVIEW,COORDINATION,UNKNOWN");item(c,"known","SES-005","ALERTNESS",false);rejected(c,script,51004);
                exec(c,"UPDATE dbo.Training_Session_Assessment SET trigger_codes='SCORE_REVIEW,,GAIT'");rejected(c,script,51004);
                exec(c,"UPDATE dbo.Training_Session_Assessment SET trigger_codes='"+String.join(",",Collections.nCopies(33,"NASAL_BLEEDING"))+"'");
                rejected(c,script,51005);
                System.out.println("PASS SQL07 collisions, unknown criteria/tokens, blank tokens and overflow roll back with no partial rename");
            } finally {
                if(!name.matches("RaceForgeAssessmentCodesTest_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe database name");
                exec(admin,"ALTER DATABASE ["+name+"] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ["+name+"]");
                System.out.println("ISOLATED_DB_DROPPED "+name);
            }
        }
    }
    private static void rejected(Connection c,String script,int code)throws Exception{
        String before=snapshot(c);
        SQLException error=assertThrows(SQLException.class,()->exec(c,script));assertEquals(code,error.getErrorCode());
        assertEquals(before,snapshot(c));assertEquals("0",scalar(c,"SELECT @@TRANCOUNT"));
    }
    private static void clear(Connection c)throws Exception{exec(c,"DELETE dbo.Training_Session_Assessment_Item; DELETE dbo.Training_Session_Assessment");}
    private static void dropCriterion(Connection c)throws Exception{
        exec(c,"IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_TSAI_Criterion') ALTER TABLE dbo.Training_Session_Assessment_Item DROP CONSTRAINT CK_TSAI_Criterion");
    }
    private static void allowCodes(Connection c,List<String> allowed)throws Exception{
        dropCriterion(c);exec(c,"ALTER TABLE dbo.Training_Session_Assessment_Item ADD CONSTRAINT CK_TSAI_Criterion CHECK(criterion_code IN ('"+String.join("','",allowed)+"'))");
    }
    private static void parent(Connection c,String id,String triggers)throws Exception{
        try(var p=c.prepareStatement("INSERT dbo.Training_Session_Assessment VALUES(?,?,6,'VET_REVIEW_REQUIRED','PENDING','SENT','MED-001',7)")){p.setString(1,id);p.setString(2,triggers);p.executeUpdate();}
    }
    private static void item(Connection c,String id,String session,String code,boolean pass)throws Exception{
        try(var p=c.prepareStatement("INSERT dbo.Training_Session_Assessment_Item VALUES(?,?,?,?,?)")){
            p.setString(1,id);p.setString(2,session);p.setString(3,code);p.setBoolean(4,pass);p.setString(5,"Preserved observation");p.executeUpdate();}
    }
    private static SortedSet<String> codes(Connection c)throws Exception{
        var codes=new TreeSet<String>();try(var s=c.createStatement();var r=s.executeQuery("SELECT criterion_code FROM dbo.Training_Session_Assessment_Item")){while(r.next())codes.add(r.getString(1));}return codes;
    }
    private static String untouchedParent(Connection c)throws Exception{
        return scalar(c,"SELECT session_id,passed_count,alert_level,review_status,notification_status,linked_medical_record_id,version FROM dbo.Training_Session_Assessment ORDER BY session_id FOR JSON PATH,INCLUDE_NULL_VALUES");
    }
    private static String untouchedItems(Connection c)throws Exception{
        return scalar(c,"SELECT item_id,session_id,passed,fail_note FROM dbo.Training_Session_Assessment_Item ORDER BY item_id FOR JSON PATH,INCLUDE_NULL_VALUES");
    }
    private static String snapshot(Connection c)throws Exception{
        return scalar(c,"SELECT * FROM dbo.Training_Session_Assessment ORDER BY session_id FOR JSON PATH,INCLUDE_NULL_VALUES")
                +scalar(c,"SELECT * FROM dbo.Training_Session_Assessment_Item ORDER BY item_id FOR JSON PATH,INCLUDE_NULL_VALUES");
    }
    private static String scalar(Connection c,String sql)throws Exception{
        try(var s=c.createStatement();var r=s.executeQuery(sql)){StringBuilder value=new StringBuilder();while(r.next())value.append(r.getString(1));return value.toString();}
    }
    private static void exec(Connection c,String sql)throws Exception{try(var s=c.createStatement()){s.execute(sql);}}
}

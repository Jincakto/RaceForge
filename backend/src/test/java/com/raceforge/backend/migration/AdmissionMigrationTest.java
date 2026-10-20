package com.raceforge.backend.migration;

import java.sql.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

/** Only an explicitly named, fresh disposable SQL Server database is accepted. */
@EnabledIfEnvironmentVariable(named="RACEFORGE_ADMISSION_TEST_URL",matches=".+")
class AdmissionMigrationTest {
    @Test void preservesLegacyDataAndEnforcesAssignmentConstraints() throws Exception {
        String url=System.getenv("RACEFORGE_ADMISSION_TEST_URL");
        assertTrue(url.matches("(?i).*;databaseName=RaceForge_AdmissionTest_[A-Za-z0-9_]+(?:;.*)?"));
        String user=System.getenv("DB_USERNAME"),password=System.getenv("DB_PASSWORD");
        try(Connection c=DriverManager.getConnection(url,user,password);Statement s=c.createStatement()){
            int tables;try(ResultSet rs=s.executeQuery("SELECT COUNT(*) FROM sys.tables")){rs.next();tables=rs.getInt(1);}
            if(tables>0){
                assertEquals("true",System.getenv("RACEFORGE_TEST_PREPARED_V7"),"Use a fresh database or explicitly prepared empty V7 test clone");
                try(ResultSet rs=s.executeQuery("SELECT TOP(1) version FROM dbo.flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC")){assertTrue(rs.next());assertEquals("7",rs.getString(1));}
                try(ResultSet rs=s.executeQuery("SELECT (SELECT COUNT(*) FROM dbo.[User])+(SELECT COUNT(*) FROM dbo.Horse)+(SELECT COUNT(*) FROM dbo.TRAINING_PACKAGE)")){rs.next();assertEquals(0,rs.getInt(1),"V7 test clone must have no business data");}
            }
        }
        Flyway.configure().dataSource(url,user,password).target("9").load().migrate();
        try(Connection c=DriverManager.getConnection(url,user,password);Statement s=c.createStatement()){
            s.executeUpdate("INSERT dbo.[User](user_id,role_id,full_name,email,status,email_verified) VALUES ('USR-500',5,N'Owner','owner@example.test','ACTIVE',1),('USR-100',1,N'Manager','cm@example.test','ACTIVE',1),('USR-300',3,N'Vet','vet@example.test','ACTIVE',1)");
            s.executeUpdate("INSERT dbo.Horse(horse_id,owner_id,horse_name,status) VALUES ('HOR-000','USR-500',N'Existing horse','ACTIVE')");
        }
        assertEquals(1,Flyway.configure().dataSource(url,user,password).target("10").load().migrate().migrationsExecuted);
        try(Connection c=DriverManager.getConnection(url,user,password);Statement s=c.createStatement()){
            try(ResultSet rs=s.executeQuery("SELECT a.status,h.horse_name,h.status FROM dbo.Horse_Admission a JOIN dbo.Horse h ON a.horse_id=h.horse_id")){
                assertTrue(rs.next());assertEquals("NEEDS_REVIEW",rs.getString(1));assertEquals("Existing horse",rs.getString(2));assertEquals("ACTIVE",rs.getString(3));assertFalse(rs.next());
            }
            String insert="INSERT dbo.Horse_Assignment(horse_id,kind,assigned_by,assignee_id,status,created_at) VALUES ('HOR-000','VET','USR-100','USR-300','PENDING',SYSDATETIME())";
            s.executeUpdate(insert);
            assertThrows(SQLException.class,()->s.executeUpdate(insert));
            assertThrows(SQLException.class,()->s.executeUpdate("UPDATE dbo.Horse_Assignment SET status='REJECTED'"));
            // Failed business transaction must not leave half a decision/assignment.
            c.setAutoCommit(false);
            s.executeUpdate("UPDATE dbo.Horse_Admission SET status='AWAITING_VET_ACCEPTANCE'");
            assertThrows(SQLException.class,()->s.executeUpdate(insert));c.rollback();c.setAutoCommit(true);
            try(ResultSet rs=s.executeQuery("SELECT status FROM dbo.Horse_Admission")){rs.next();assertEquals("NEEDS_REVIEW",rs.getString(1));}
            s.executeUpdate("UPDATE dbo.Horse_Assignment SET status='REJECTED',reason=N'Unavailable'");s.executeUpdate(insert);
            try(ResultSet rs=s.executeQuery("SELECT COUNT(*) FROM dbo.Horse_Assignment")){rs.next();assertEquals(2,rs.getInt(1));}
        }
    }
}

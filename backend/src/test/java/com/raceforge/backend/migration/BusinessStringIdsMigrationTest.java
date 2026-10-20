package com.raceforge.backend.migration;

import static org.junit.jupiter.api.Assertions.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import com.raceforge.backend.common.id.BusinessIdGenerator;
import com.raceforge.backend.common.exception.ApiException;

/** Opt-in only: an empty disposable SQL Server database, never the application database. */
@EnabledIfEnvironmentVariable(named="RACEFORGE_STRING_ID_TEST_URL",matches=".+")
class BusinessStringIdsMigrationTest {
    @Test void preservesReferencesRollsBackAndAllocatesUniqueBoundedIds() throws Exception {
        String url=System.getenv("RACEFORGE_STRING_ID_TEST_URL");
        assertTrue(url.matches("(?i).*;databaseName=RaceForge_StringIdTest_[A-Za-z0-9_]+(?:;.*)?"),"Disposable string-ID test database required");
        String username=System.getenv("DB_USERNAME"),password=System.getenv("DB_PASSWORD");
        Flyway.configure().dataSource(url,username,password).target("8").load().migrate();
        Flyway flyway=Flyway.configure().dataSource(url,username,password).target("9").load();
        try(Connection c=DriverManager.getConnection(url,username,password)) {
            assertEquals(0,number(c,"SELECT COUNT(*) FROM dbo.[User]"),"Use a fresh disposable database");
            Map<Integer,Integer> users=new LinkedHashMap<>();
            for(int role : List.of(1,2,3,4,5,7)) users.put(role,insert(c,"INSERT dbo.[User](role_id,full_name,email,status,email_verified) VALUES ("+role+",N'Fixture','fixture"+role+"@example.test','ACTIVE',1)"));
            int owner=users.get(5),vet=users.get(3);
            int horse=insert(c,"INSERT dbo.Horse(owner_id,head_trainer_id,horse_name,status) VALUES ("+owner+","+users.get(2)+",N'Fixture horse','ACTIVE')");
            int profile=insert(c,"INSERT dbo.Health_Profile(horse_id) VALUES ("+horse+")");
            int record=insert(c,"INSERT dbo.Medical_Record(profile_id,veterinarian_id,exam_type,diagnosis) VALUES ("+profile+","+vet+",'INITIAL',N'Preserve diagnosis')");
            int correction=insert(c,"INSERT dbo.Medical_Record(profile_id,veterinarian_id,exam_type,correction_of_id) VALUES ("+profile+","+vet+",'FOLLOW_UP',"+record+")");
            int pkg=insert(c,"INSERT dbo.TRAINING_PACKAGE(package_name,package_type,duration_days,price) VALUES (N'Fixture','BASIC',30,123456)");
            execute(c,"INSERT dbo.Email_Verification_OTP(user_id,otp_hash,expires_at,sent_at,attempt_count) VALUES ("+owner+",REPLICATE('a',64),DATEADD(day,1,SYSUTCDATETIME()),SYSUTCDATETIME(),0)");
            execute(c,"INSERT dbo.Audit_Log(user_id,horse_id,action,entity_type,entity_id) VALUES ("+vet+","+horse+",'TEST','MEDICAL_RECORD',"+record+")");
            execute(c,"INSERT dbo.Audit_Log(user_id,action,entity_type,entity_id) VALUES ("+users.get(1)+",'GRANT','ROLE_PERMISSION',2)");
            // Capacity preflight must fail without changing schema, rows, or creating the mapping.
            execute(c,"WITH n AS (SELECT TOP(1001) ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) AS n FROM sys.all_objects a CROSS JOIN sys.all_objects b) INSERT dbo.Horse(owner_id,horse_name,status) SELECT "+owner+",'capacity fixture','INACTIVE' FROM n");
            assertThrows(FlywayException.class,flyway::migrate);
            assertEquals(0,number(c,"SELECT COUNT(*) FROM sys.tables WHERE name='String_Id_Mapping'"));
            assertEquals(1002,number(c,"SELECT COUNT(*) FROM dbo.Horse"));
            execute(c,"DELETE dbo.Horse WHERE horse_name='capacity fixture'");
            // Unsupported role is never silently promoted during conversion.
            int unsupported=insert(c,"INSERT dbo.[User](role_id,full_name,email,status,email_verified) VALUES (6,N'Legacy','unsupported@example.test','INACTIVE',0)");
            assertThrows(FlywayException.class,flyway::migrate);
            execute(c,"DELETE dbo.[User] WHERE user_id="+unsupported);
            // Force a late failure when constraints are restored, after shadow-table replacement.
            execute(c,"ALTER TABLE dbo.Horse ADD CONSTRAINT CK_Test_Integer_Horse CHECK(horse_id>0)");
            assertThrows(FlywayException.class,flyway::migrate);
            assertEquals("int",text(c,"SELECT TYPE_NAME(user_type_id) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Horse') AND name='horse_id'"));
            assertEquals(0,number(c,"SELECT COUNT(*) FROM sys.tables WHERE name='String_Id_Mapping'"));
            assertEquals(1,number(c,"SELECT COUNT(*) FROM dbo.Horse WHERE horse_id="+horse));
            execute(c,"ALTER TABLE dbo.Horse DROP CONSTRAINT CK_Test_Integer_Horse");
            assertEquals(1,flyway.migrate().migrationsExecuted);
            assertEquals(0,flyway.migrate().migrationsExecuted);
            assertEquals("HOR-000",mapped(c,"Horse",horse));
            assertEquals("USR-500",mapped(c,"User",owner));
            assertEquals("USR-300",mapped(c,"User",vet));
            assertEquals("PKG-000",mapped(c,"TRAINING_PACKAGE",pkg));
            assertEquals("HOR-000",text(c,"SELECT horse_id FROM dbo.Health_Profile WHERE profile_id="+profile));
            assertEquals(mapped(c,"Medical_Record",record),text(c,"SELECT correction_of_id FROM dbo.Medical_Record WHERE medical_record_id='"+mapped(c,"Medical_Record",correction)+"'"));
            assertEquals("Preserve diagnosis",text(c,"SELECT diagnosis FROM dbo.Medical_Record WHERE medical_record_id='"+mapped(c,"Medical_Record",record)+"'"));
            assertEquals(mapped(c,"Medical_Record",record),text(c,"SELECT entity_id FROM dbo.Audit_Log WHERE action='TEST'"));
            assertEquals("2",text(c,"SELECT entity_id FROM dbo.Audit_Log WHERE entity_type='ROLE_PERMISSION'"));
            assertEquals("USR-500",text(c,"SELECT user_id FROM dbo.Email_Verification_OTP"));
            assertEquals(1,number(c,"SELECT COUNT(*) FROM dbo.Email_Verification_OTP WHERE expires_at<=SYSUTCDATETIME()"));
            assertEquals(1,number(c,"SELECT COLUMNPROPERTY(OBJECT_ID('dbo.Health_Profile'),'profile_id','IsIdentity')"));
            assertEquals(0,number(c,"SELECT COLUMNPROPERTY(OBJECT_ID('dbo.Horse'),'horse_id','IsIdentity')"));

            DriverManagerDataSource ds=new DriverManagerDataSource(url,username,password);
            BusinessIdGenerator generator=new BusinessIdGenerator();
            ExecutorService executor=Executors.newFixedThreadPool(8);
            try {
                List<Callable<String>> jobs=new ArrayList<>();
                for(int i=0;i<32;i++)jobs.add(()->generator.next("HOR"));
                Set<String> unique=new HashSet<>();
                for(Future<String> result : executor.invokeAll(jobs))assertTrue(unique.add(result.get()));
                assertEquals(32,unique.size());
            } finally { executor.shutdownNow(); }
            String deleted=generator.next("HOR");
            execute(c,"INSERT dbo.Horse(horse_id,owner_id,horse_name,status) VALUES ('"+deleted+"','USR-500','delete fixture','INACTIVE')");
            execute(c,"DELETE dbo.Horse WHERE horse_id='"+deleted+"'");
            assertNotEquals(deleted,generator.next("HOR"));
            execute(c,"ALTER SEQUENCE dbo.seq_business_PKG RESTART WITH 999");
            assertEquals("PKG-999",generator.next("PKG"));
            ApiException exhausted=assertThrows(ApiException.class,()->generator.next("PKG"));
            assertEquals("ID_CAPACITY_EXCEEDED",exhausted.getCode());
        }
    }
    private static String mapped(Connection c,String entity,int id) throws SQLException { return text(c,"SELECT new_id FROM dbo.String_Id_Mapping WHERE entity_type='"+entity+"' AND old_id="+id); }
    private static int insert(Connection c,String sql) throws SQLException { try(Statement s=c.createStatement()){s.executeUpdate(sql,Statement.RETURN_GENERATED_KEYS);try(ResultSet r=s.getGeneratedKeys()){assertTrue(r.next());return r.getInt(1);}} }
    private static void execute(Connection c,String sql) throws SQLException {try(Statement s=c.createStatement()){s.execute(sql);}}
    private static long number(Connection c,String sql) throws SQLException {try(Statement s=c.createStatement();ResultSet r=s.executeQuery(sql)){assertTrue(r.next());return r.getLong(1);}}
    private static String text(Connection c,String sql) throws SQLException {try(Statement s=c.createStatement();ResultSet r=s.executeQuery(sql)){assertTrue(r.next());return r.getString(1);}}
}

package com.raceforge.backend.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@EnabledIfEnvironmentVariable(named = "RACEFORGE_MIGRATION_TEST_URL", matches = ".+")
class IntegerIdsMigrationTest {
    @Test
    void convertsIdsPreservesReferencesAndRollsBackUnsupportedIdentities() throws Exception {
        String url = System.getenv("RACEFORGE_MIGRATION_TEST_URL");
        assertTrue(url.contains("databaseName=RaceForge_IdMigrationTest_"), "Use a restored test database, never the application database");
        String username = System.getenv("DB_USERNAME");
        String password = System.getenv("DB_PASSWORD");
        Flyway flyway = Flyway.configure().dataSource(url, username, password).locations("classpath:db/migration").load();
        try (Connection connection = DriverManager.getConnection(url, username, password)) {
            execute(connection, """
                    ALTER TABLE dbo.User_External_Login NOCHECK CONSTRAINT ALL;
                    DECLARE @user varchar(20)=(SELECT TOP(1) user_id FROM dbo.[User] ORDER BY user_id);
                    INSERT dbo.User_External_Login(external_login_id,user_id,provider,provider_user_id)
                    VALUES ('MIGRATION_OTHER',@user,'OTHER','external-identity-test');
                    """);
            assertThrows(FlywayException.class, flyway::migrate);
            assertEquals(0, scalar(connection, "SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.[User]') AND name='google_subject'"));
            assertEquals(1, scalar(connection, "SELECT COUNT(*) FROM sys.tables WHERE name='User_External_Login'"));
            execute(connection, "DELETE dbo.User_External_Login WHERE external_login_id='MIGRATION_OTHER'");
            execute(connection, "ALTER TABLE dbo.User_External_Login WITH CHECK CHECK CONSTRAINT ALL");
            execute(connection, """
                    DECLARE @user varchar(20)=(SELECT TOP(1) user_id FROM dbo.[User] ORDER BY user_id);
                    INSERT dbo.User_External_Login(external_login_id,user_id,provider,provider_user_id)
                    VALUES ('MIGRATION_GOOGLE',@user,'GOOGLE','google-subject-kept-as-string');
                    INSERT dbo.Horse(horse_id,owner_id,horse_name,status) VALUES ('HORSE_MIGRATION',@user,N'Migration fixture','ACTIVE');
                    INSERT dbo.Training_Plan(plan_id,created_by,plan_name,status) VALUES ('PLAN_MIGRATION',@user,N'Migration fixture','ACTIVE');
                    INSERT dbo.Horse_Plan(plan_id,horse_id,status) VALUES ('PLAN_MIGRATION','HORSE_MIGRATION','ACTIVE');
                    INSERT dbo.Training_Session(session_id,plan_id,horse_id,scheduled_start,status)
                    VALUES ('SESSION_MIGRATION','PLAN_MIGRATION','HORSE_MIGRATION',SYSUTCDATETIME(),'SCHEDULED');
                    INSERT dbo.Care_Task(care_task_id,horse_id,assigned_to,assigned_by,task_type,scheduled_at,status)
                    VALUES ('CARE_MIGRATION','HORSE_MIGRATION',@user,@user,N'FEED',SYSUTCDATETIME(),'PENDING');
                    INSERT dbo.TRAINING_PACKAGE(package_id,package_name,package_type,duration_days,price)
                    VALUES ('PACKAGE_MIGRATION',N'Migration fixture','BASIC',1,100);
                    INSERT dbo.HORSE_PACKAGE(horse_package_id,horse_id,package_id,total_price)
                    VALUES ('HP_MIGRATION_1','HORSE_MIGRATION','PACKAGE_MIGRATION',100);
                    INSERT dbo.HORSE_PACKAGE(horse_package_id,horse_id,package_id,total_price,replaced_horse_package_id)
                    VALUES ('HP_MIGRATION_2','HORSE_MIGRATION','PACKAGE_MIGRATION',100,'HP_MIGRATION_1');
                    INSERT dbo.Audit_Log(audit_id,user_id,horse_id,action,entity_type,entity_id)
                    VALUES ('AUDIT_MIGRATION',@user,'HORSE_MIGRATION','MIGRATION_TEST','Horse','HORSE_MIGRATION');
                    """);
            Map<String, Long> counts = counts(connection);
            Map<String, String> oldPasswords = new LinkedHashMap<>();
            try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("SELECT user_id,password FROM dbo.[User] WHERE password IS NOT NULL")) {
                while (rows.next()) oldPasswords.put(rows.getString(1), rows.getString(2));
            }
            assertEquals(1, flyway.migrate().migrationsExecuted);
            Map<String, Long> after = counts(connection);
            for (Map.Entry<String, Long> entry : counts.entrySet()) {
                if (!entry.getKey().equals("Email_Verification_OTP") && !entry.getKey().equals("User_External_Login"))
                    assertEquals(entry.getValue() + (entry.getKey().equals("Role") ? 1 : 0), after.get(entry.getKey()), entry.getKey());
            }
            assertEquals(0, scalar(connection, """
                    SELECT COUNT(*) FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id
                    JOIN sys.types ty ON ty.user_type_id=c.user_type_id
                    WHERE SCHEMA_NAME(t.schema_id)='dbo' AND t.name NOT IN ('sysdiagrams','flyway_schema_history')
                    AND c.name LIKE '%[_]id' AND ty.name<>'int'
                    """));
            assertEquals(0, scalar(connection, "SELECT COUNT(*) FROM sys.tables WHERE name IN ('Email_Verification_OTP','User_External_Login')"));
            assertEquals(1, scalar(connection, "SELECT COUNT(*) FROM dbo.[User] WHERE google_subject='google-subject-kept-as-string'"));
            assertEquals(6, scalar(connection, "SELECT role_id FROM dbo.Role WHERE role_name='USER'"));
            assertEquals(1, scalar(connection, """
                    SELECT COUNT(*) FROM dbo.Care_Task c JOIN dbo.Horse h ON h.horse_id=c.horse_id
                    WHERE c.assigned_to=h.owner_id AND c.assigned_by=h.owner_id
                    """));
            assertEquals(1, scalar(connection, "SELECT COUNT(*) FROM dbo.Training_Session s JOIN dbo.Horse_Plan p ON p.plan_id=s.plan_id AND p.horse_id=s.horse_id"));
            assertEquals(1, scalar(connection, "SELECT COUNT(*) FROM dbo.HORSE_PACKAGE p JOIN dbo.HORSE_PACKAGE old ON old.horse_package_id=p.replaced_horse_package_id"));
            assertEquals(1, scalar(connection, "SELECT COUNT(*) FROM dbo.Audit_Log a JOIN dbo.Horse h ON h.horse_id=a.entity_id WHERE a.entity_type='Horse'"));
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
            for (Map.Entry<String, String> entry : oldPasswords.entrySet()) {
                try (var query = connection.prepareStatement("SELECT u.password FROM dbo.[User] u JOIN dbo.Legacy_Id_Mapping m ON m.table_name='User' AND m.current_id=u.user_id WHERE m.legacy_value=?")) {
                    query.setString(1,entry.getKey());
                    try (ResultSet row = query.executeQuery()) {
                        assertTrue(row.next());
                        String hash = row.getString(1);
                        assertTrue(hash.startsWith("$2"));
                        assertTrue(entry.getValue().startsWith("$2") ? entry.getValue().equals(hash) : encoder.matches(entry.getValue(),hash));
                    }
                }
            }
            execute(connection, "INSERT dbo.Notification(user_id,notification_type,title,message) SELECT TOP(1) user_id,'TEST',N'Test',N'Test' FROM dbo.[User]");
            assertTrue(scalar(connection,"SELECT MAX(notification_id) FROM dbo.Notification")>0);
            try (Statement statement = connection.createStatement()) {
                if (statement.execute("DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS")) {
                    try (ResultSet result = statement.getResultSet()) {
                        assertTrue(!result.next(), "Foreign key and check constraints must remain valid");
                    }
                }
            }
            assertEquals(0,flyway.migrate().migrationsExecuted);
        }
    }

    private Map<String, Long> counts(Connection connection) throws Exception {
        Map<String, Long> result = new LinkedHashMap<>();
        try (Statement statement = connection.createStatement(); ResultSet tables = statement.executeQuery("SELECT name FROM sys.tables WHERE SCHEMA_NAME(schema_id)='dbo' AND name NOT IN ('sysdiagrams','flyway_schema_history','Legacy_Id_Mapping')")) {
            while (tables.next()) {
                String name=tables.getString(1);
                result.put(name,scalar(connection,"SELECT COUNT_BIG(*) FROM dbo.["+name.replace("]","]]")+"]"));
            }
        }
        return result;
    }

    private long scalar(Connection connection, String sql) throws Exception {
        try (Statement statement=connection.createStatement(); ResultSet rows=statement.executeQuery(sql)) { rows.next(); return rows.getLong(1); }
    }
    private void execute(Connection connection, String sql) throws Exception {
        try (Statement statement=connection.createStatement()) { statement.execute(sql); }
    }
}

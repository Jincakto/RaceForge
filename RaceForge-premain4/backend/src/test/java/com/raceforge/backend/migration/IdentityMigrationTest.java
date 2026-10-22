package com.raceforge.backend.migration;

import static org.junit.jupiter.api.Assertions.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Requires a disposable restored V4/V6 database; adds fixtures only to that clone. */
@EnabledIfEnvironmentVariable(named = "RACEFORGE_IDENTITY_TEST_URL", matches = ".+")
class IdentityMigrationTest {
    @Test
    void preservesDataAndConstraintsRollsBackFailuresAndGeneratesIds() throws Exception {
        String url = System.getenv("RACEFORGE_IDENTITY_TEST_URL");
        assertTrue(url.matches("(?i).*;databaseName=RaceForge_IdMigrationTest_[A-Za-z0-9_]+(?:;.*)?"));
        String username = System.getenv("DB_USERNAME"), password = System.getenv("DB_PASSWORD");
        Flyway.configure().dataSource(url, username, password).target("6").load().migrate();
        Flyway flyway = Flyway.configure().dataSource(url, username, password).target("7").load();
        try (Connection connection = DriverManager.getConnection(url, username, password)) {
            Map<String, String> roots = roots(connection);
            assertEquals(22, roots.size());
            seed(connection, true);
            List<String> foreignKeys = query(connection, "SELECT OBJECT_SCHEMA_NAME(parent_object_id),OBJECT_NAME(parent_object_id),name,"
                    + "OBJECT_SCHEMA_NAME(referenced_object_id),OBJECT_NAME(referenced_object_id),delete_referential_action,update_referential_action,is_disabled,is_not_trusted FROM sys.foreign_keys");
            List<String> indexes = query(connection, "SELECT OBJECT_NAME(i.object_id),i.name,i.type,i.is_unique,i.is_primary_key,i.is_unique_constraint,i.filter_definition,"
                    + "c.name,ic.key_ordinal,ic.is_descending_key,ic.is_included_column FROM sys.indexes i JOIN sys.index_columns ic"
                    + " ON i.object_id=ic.object_id AND i.index_id=ic.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id"
                    + " WHERE OBJECT_SCHEMA_NAME(i.object_id)='dbo' AND OBJECT_NAME(i.object_id)<>'flyway_schema_history'");
            Map<String, List<String>> before = snapshot(connection);

            execute(connection, "ALTER TABLE dbo.Supply_Item ADD identity_test_computed AS (current_quantity+1)");
            assertTrue(assertThrows(FlywayException.class, flyway::migrate).getMessage().contains("Supply_Item"));
            execute(connection, "ALTER TABLE dbo.Supply_Item DROP COLUMN identity_test_computed");
            assertEquals(before, snapshot(connection));

            execute(connection, "INSERT dbo.Supply_Item(supply_item_id,item_name,status) VALUES(2147483647,N'Overflow','ACTIVE')");
            assertTrue(assertThrows(FlywayException.class, flyway::migrate).getMessage().contains("Integer ID range exhausted"));
            execute(connection, "DELETE dbo.Supply_Item WHERE supply_item_id=2147483647");

            // This external dependency fails at DROP SEQUENCE, after the table rebuilds.
            execute(connection, "CREATE TABLE dbo.IdentityTestBlocker(id int DEFAULT(NEXT VALUE FOR dbo.seq_User))");
            FlywayException lateFailure = assertThrows(FlywayException.class, flyway::migrate);
            assertTrue(lateFailure.getMessage().contains("seq_User"), lateFailure.getMessage());
            execute(connection, "DROP TABLE dbo.IdentityTestBlocker");
            assertEquals(before, snapshot(connection), "Late failure must roll back all copied tables");
            assertEquals(22, scalar(connection, "SELECT COUNT(*) FROM sys.sequences WHERE SCHEMA_NAME(schema_id)='dbo'"));
            assertEquals(0, scalar(connection, "SELECT COUNT(*) FROM sys.tables WHERE name LIKE '__V7_Identity_%'"));

            assertEquals(1, flyway.migrate().migrationsExecuted);
            assertEquals(before, snapshot(connection), "Every original value and ID must survive");
            assertEquals(foreignKeys, query(connection, "SELECT OBJECT_SCHEMA_NAME(parent_object_id),OBJECT_NAME(parent_object_id),name,"
                    + "OBJECT_SCHEMA_NAME(referenced_object_id),OBJECT_NAME(referenced_object_id),delete_referential_action,update_referential_action,is_disabled,is_not_trusted FROM sys.foreign_keys"));
            assertEquals(indexes, query(connection, "SELECT OBJECT_NAME(i.object_id),i.name,i.type,i.is_unique,i.is_primary_key,i.is_unique_constraint,i.filter_definition,"
                    + "c.name,ic.key_ordinal,ic.is_descending_key,ic.is_included_column FROM sys.indexes i JOIN sys.index_columns ic"
                    + " ON i.object_id=ic.object_id AND i.index_id=ic.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id"
                    + " WHERE OBJECT_SCHEMA_NAME(i.object_id)='dbo' AND OBJECT_NAME(i.object_id)<>'flyway_schema_history'"));
            assertEquals(0, scalar(connection, "SELECT COUNT(*) FROM sys.sequences WHERE SCHEMA_NAME(schema_id)='dbo'"));
            assertEquals(0, scalar(connection, "SELECT COUNT(*) FROM sys.default_constraints WHERE definition LIKE '%NEXT VALUE FOR%'"));
            for (Map.Entry<String, String> root : roots.entrySet()) {
                assertEquals(1, scalar(connection, "SELECT COLUMNPROPERTY(OBJECT_ID('dbo.[" + root.getKey() + "]'),'" + root.getValue() + "','IsIdentity')"));
            }
            assertEquals(0, scalar(connection, "SELECT COLUMNPROPERTY(OBJECT_ID('dbo.Email_Verification_OTP'),'user_id','IsIdentity')"));
            seed(connection, false);
            for (Map.Entry<String, String> root : roots.entrySet()) {
                long maximum = scalar(connection, "SELECT MAX([" + root.getValue() + "]) FROM dbo.[" + root.getKey() + "]");
                assertTrue(root.getKey().equals("Supply_Item") ? maximum == 1 : maximum > 70001, root.getKey());
            }
            assertEquals(0, flyway.migrate().migrationsExecuted);
            try (Statement statement = connection.createStatement()) {
                boolean result = statement.execute("DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS");
                while (true) {
                    if (result) {
                        try (ResultSet violations = statement.getResultSet()) { assertFalse(violations.next()); }
                    } else if (statement.getUpdateCount() == -1) break;
                    result = statement.getMoreResults();
                }
            }
        }
    }

    private void seed(Connection c, boolean manual) throws Exception {
        String suffix = manual ? "before" : "after";
        int role = insert(c, manual, "Role", "role_id", "role_name", "'IDENTITY_" + suffix + "'");
        int user = insert(c, manual, "User", "user_id", "role_id,full_name,email,status", role + ",N'Identity test  ','identity-" + suffix + "@example.com','ACTIVE'");
        int permission = insert(c, manual, "Permission", "permission_id", "permission_name", "'IDENTITY_" + suffix + "'");
        execute(c, "INSERT dbo.Role_Permission VALUES(" + role + "," + permission + ")");
        execute(c, "INSERT dbo.Email_Verification_OTP(user_id,otp_hash,expires_at,sent_at) VALUES(" + user + ",REPLICATE('a',64),DATEADD(hour,1,SYSUTCDATETIME()),SYSUTCDATETIME())");
        insert(c, manual, "Refresh_Token", "refresh_token_id", "user_id,token_hash,expires_at", user + ",'refresh-" + suffix + "',DATEADD(day,1,SYSUTCDATETIME())");
        insert(c, manual, "Password_Reset_Token", "reset_token_id", "user_id,token_hash,expires_at", user + ",'reset-" + suffix + "',DATEADD(day,1,SYSUTCDATETIME())");
        insert(c, manual, "Registration_Request", "request_id", "user_id,requested_role_id", user + ",5");
        insert(c, manual, "Notification", "notification_id", "user_id,notification_type,title,message", user + ",'TEST',N'Test',N'Case and spaces  '");
        int horse = insert(c, manual, "Horse", "horse_id", "owner_id,horse_name,status,weight", user + ",N'Identity test','ACTIVE',432.15");
        int profile = insert(c, manual, "Health_Profile", "profile_id", "horse_id", "" + horse);
        int medical = insert(c, manual, "Medical_Record", "medical_record_id", "profile_id,veterinarian_id,exam_type", profile + "," + user + ",'INITIAL'");
        execute(c, "UPDATE dbo.Medical_Record SET correction_of_id=" + medical + " WHERE medical_record_id=" + medical);
        insert(c, manual, "Medical_Clinical_Exam", "clinical_exam_id", "medical_record_id,examination_area,condition_status", medical + ",'EYES','NORMAL'");
        insert(c, manual, "Medical_Vital_Sign", "vital_sign_id", "medical_record_id,body_temperature", medical + ",37.5");
        insert(c, manual, "Training_Lock", "lock_id", "horse_id,medical_record_id,locked_by,locked_at,lock_reason", horse + "," + medical + "," + user + ",SYSUTCDATETIME(),N'Test'");
        insert(c, manual, "HORSE_RACE_HISTORY", "race_history_id", "horse_id,race_name,prize", horse + ",N'Test',123.45");
        int plan = insert(c, manual, "Training_Plan", "plan_id", "created_by,plan_name,status", user + ",N'Test','ACTIVE'");
        execute(c, "INSERT dbo.Horse_Plan(plan_id,horse_id,status) VALUES(" + plan + "," + horse + ",'ACTIVE')");
        insert(c, manual, "Training_Session", "session_id", "plan_id,horse_id,scheduled_start,status,avg_speed,recorded_by", plan + "," + horse + ",SYSUTCDATETIME(),'SCHEDULED',23.75," + user);
        int pack = insert(c, manual, "TRAINING_PACKAGE", "package_id", "package_name,package_type,duration_days,price", "N'Test','BASIC',30,123.45");
        int hp = insert(c, manual, "HORSE_PACKAGE", "horse_package_id", "horse_id,package_id,total_price", horse + "," + pack + ",123.45");
        execute(c, "UPDATE dbo.HORSE_PACKAGE SET replaced_horse_package_id=" + hp + " WHERE horse_package_id=" + hp);
        insert(c, manual, "Audit_Log", "audit_id", "user_id,horse_id,action,entity_type,entity_id,result", user + "," + horse + ",'TEST','Horse'," + horse + ",'SUCCESS'");
        insert(c, manual, "Care_Task", "care_task_id", "horse_id,assigned_to,assigned_by,task_type,scheduled_at,status", horse + "," + user + "," + user + ",N'FEED',SYSUTCDATETIME(),'PENDING'");
        insert(c, manual, "Nutrition_Plan", "nutrition_plan_id", "horse_id,created_by,plan_name,status", horse + "," + user + ",N'Test','ACTIVE'");
        if (!manual) insert(c, false, "Supply_Item", "supply_item_id", "item_name,status", "N'Test','ACTIVE'");
    }

    private int insert(Connection c, boolean manual, String table, String key, String columns, String values) throws Exception {
        return (int) scalar(c, "INSERT dbo.[" + table + "](" + (manual ? "[" + key + "]," : "") + columns + ") OUTPUT inserted.[" + key + "] VALUES(" + (manual ? "70001," : "") + values + ")");
    }
    private Map<String, String> roots(Connection c) throws Exception {
        Map<String, String> result = new LinkedHashMap<>();
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery("SELECT OBJECT_NAME(parent_object_id),COL_NAME(parent_object_id,parent_column_id) FROM sys.default_constraints WHERE definition LIKE '%NEXT VALUE FOR%'")) {
            while (r.next()) result.put(r.getString(1), r.getString(2));
        }
        return result;
    }
    private Map<String, List<String>> snapshot(Connection c) throws Exception {
        Map<String, List<String>> result = new LinkedHashMap<>();
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery("SELECT name FROM sys.tables WHERE SCHEMA_NAME(schema_id)='dbo' AND name NOT IN ('sysdiagrams','flyway_schema_history') ORDER BY name")) {
            while (r.next()) result.put(r.getString(1), query(c, "SELECT * FROM dbo.[" + r.getString(1).replace("]", "]]") + "]"));
        }
        return result;
    }
    private List<String> query(Connection c, String sql) throws Exception {
        List<String> result = new ArrayList<>();
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) {
            while (r.next()) {
                List<String> columns = new ArrayList<>();
                for (int i = 1; i <= r.getMetaData().getColumnCount(); i++) {
                    String value = r.getString(i);
                    columns.add(value == null ? "NULL" : Base64.getEncoder().encodeToString(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                }
                result.add(String.join("|", columns));
            }
        }
        Collections.sort(result);
        return result;
    }
    private long scalar(Connection c, String sql) throws Exception {
        try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { assertTrue(r.next()); return r.getLong(1); }
    }
    private void execute(Connection c, String sql) throws Exception {
        try (Statement s = c.createStatement()) { s.execute(sql); }
    }
}

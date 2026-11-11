package com.raceforge.backend.training.service;

import com.raceforge.backend.BackendApplication;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "RUN_TRAINING_DB_TESTS", matches = "true")
class TrainingCertificateDatabaseTest {
    private static final LocalDate END_DATE = LocalDate.of(2026, 1, 12);

    @Test
    void expiryCommitsOnceWithoutIssuingCertificatesUnderConcurrentCalls() throws Exception {
        String database = "RaceForgeCertificateTest_" + UUID.randomUUID().toString().replace("-", "");
        String host = System.getenv().getOrDefault("TRAINING_TEST_SQL_SERVER", "localhost:1433");
        String root = "jdbc:sqlserver://" + host + ";encrypt=true;trustServerCertificate=true;databaseName=";
        String user = System.getenv().getOrDefault("DB_USERNAME", "sa");
        String password = System.getenv().getOrDefault("DB_PASSWORD", "12345");

        try (var admin = DriverManager.getConnection(root + "master", user, password)) {
            execute(admin, "CREATE DATABASE [" + database + "]");
            try (var connection = DriverManager.getConnection(root + database, user, password)) {
                TrainingRoadmapDatabaseTest.script(connection,
                        Files.readString(Path.of("scripts/training/00_canonical_base_schema.sql")));
                var flyway = Flyway.configure().dataSource(root + database, user, password)
                        .baselineVersion("12").locations("classpath:db/migration").load();
                flyway.baseline();
                flyway.migrate();
                TrainingRoadmapDatabaseTest.script(connection, Files.readString(Path.of("scripts/training/06_horse_package_expired_status.sql")));
                TrainingRoadmapDatabaseTest.script(connection, Files.readString(Path.of("src/test/resources/training/assessment_schema_TEST_ONLY.sql")));
                TrainingRoadmapDatabaseTest.script(connection, Files.readString(Path.of("scripts/training/07_training_assessment_performance_codes.sql")));
                seed(connection);

                // Validate the complete current schema in the isolated fixture.
                try (var app = new SpringApplicationBuilder(BackendApplication.class).run(
                        "--server.port=0", "--spring.datasource.url=" + root + database,
                        "--spring.datasource.username=" + user, "--spring.datasource.password=" + password,
                        "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.enabled=false",
                        "--raceforge.bootstrap-admin.enabled=false", "--raceforge.training.package-expiry-cron=-",
                        "--logging.level.root=WARN")) {
                    var expiry = app.getBean(TrainingPackageExpirationService.class);
                    assertFalse(expiry.expireRegistration("HPG-901", END_DATE));
                    assertFalse(expiry.expireRegistration("HPG-902", END_DATE.plusDays(1)));
                    assertFalse(expiry.expireRegistration("HPG-903", END_DATE.plusDays(1)));
                    assertFalse(expiry.expireRegistration("HPG-904", END_DATE.plusDays(1)));
                    assertEquals("0", value(connection, "SELECT COUNT(*) FROM dbo.Training_Certificate"));

                    assertRollback(connection, expiry);
                    expireConcurrently(expiry);
                    assertFalse(expiry.expireRegistration("HPG-901", END_DATE.plusDays(1)));
                    assertEquals("EXPIRED", value(connection,
                            "SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-901'"));
                    assertEquals("0", value(connection, "SELECT COUNT(*) FROM dbo.Training_Certificate"));


                }
            } finally {
                if (!database.matches("RaceForgeCertificateTest_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe database name");
                execute(admin, "ALTER DATABASE [" + database + "] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; "
                        + "DROP DATABASE [" + database + "]");
            }
        }
    }

    private static void seed(Connection connection) throws Exception {
        execute(connection, """
                SET IDENTITY_INSERT dbo.Role ON;
                INSERT dbo.Role(role_id,role_name) VALUES (5,'HORSE_OWNER');
                SET IDENTITY_INSERT dbo.Role OFF;
                INSERT dbo.[User](user_id,role_id,full_name,email,password,status,email_verified)
                VALUES ('OWN-901',5,N'Test Owner','owner@example.invalid','unused','ACTIVE',1);
                INSERT dbo.Horse(horse_id,owner_id,horse_name,health_status,training_locked,status)
                VALUES ('HOR-901','OWN-901',N'Ánh Dương','READY',0,'ACTIVE');
                INSERT dbo.TRAINING_PACKAGE(package_id,package_name,package_type,duration_days,price,status,created_at,updated_at)
                VALUES ('PKG-901',N'Test training','BASIC',12,1000,'ACTIVE',SYSDATETIME(),SYSDATETIME());
                INSERT dbo.HORSE_PACKAGE(horse_package_id,horse_id,package_id,registered_at,start_date,end_date,status,
                    payment_status,total_price,created_at,updated_at)
                SELECT id,'HOR-901','PKG-901',SYSDATETIME(),'20260101','20260112',status,'PAID',1000,
                    SYSDATETIME(),SYSDATETIME()
                FROM (VALUES ('HPG-901','ACTIVE'), ('HPG-902','PAUSED'), ('HPG-903','CANCELLED'),
                    ('HPG-904','COMPLETED')) fixture(id,status);
                """);
    }

    private static void assertRollback(Connection connection, TrainingPackageExpirationService expiry) throws Exception {
        execute(connection, "ALTER TABLE dbo.HORSE_PACKAGE ADD CONSTRAINT CK_Test_Reject_Expiry "
                + "CHECK (horse_package_id <> 'HPG-901' OR status <> 'EXPIRED')");
        try {
            assertThrows(RuntimeException.class, () -> expiry.expireRegistration("HPG-901", END_DATE.plusDays(1)));
            assertEquals("ACTIVE", value(connection,
                    "SELECT status FROM dbo.HORSE_PACKAGE WHERE horse_package_id='HPG-901'"));
            assertEquals("0", value(connection, "SELECT COUNT(*) FROM dbo.Training_Certificate"));
        } finally {
            execute(connection, "ALTER TABLE dbo.HORSE_PACKAGE DROP CONSTRAINT CK_Test_Reject_Expiry");
        }
    }

    private static void expireConcurrently(TrainingPackageExpirationService expiry) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        Callable<Boolean> expire = () -> {
            ready.countDown();
            assertTrue(start.await(10, TimeUnit.SECONDS));
            return expiry.expireRegistration("HPG-901", END_DATE.plusDays(1));
        };
        try {
            var first = executor.submit(expire);
            var second = executor.submit(expire);
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            assertNotEquals(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (var statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static String value(Connection connection, String sql) throws Exception {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(sql)) {
            assertTrue(rows.next());
            return rows.getString(1);
        }
    }
}

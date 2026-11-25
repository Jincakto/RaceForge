package com.raceforge.backend.migration;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.api.configuration.ClassicConfiguration;
import org.flywaydb.core.internal.parser.ParsingContext;
import org.flywaydb.core.internal.resource.StringResource;
import org.flywaydb.database.sqlserver.SQLServerParser;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** Exercises Flyway's real SQL Server batch parser, without connecting to a DB. */
class PackageScreeningMigrationParserTest {
    private List<String> batches(String filename) throws Exception {
        String path = "/db/migration/" + filename;
        String sql;
        try (var resource = getClass().getResourceAsStream(path)) {
            assertNotNull(resource, path);
            sql = new String(resource.readAllBytes(), StandardCharsets.UTF_8);
        }
        var configuration = new ClassicConfiguration();
        configuration.setPlaceholderReplacement(false);
        var parser = new SQLServerParser(configuration, new ParsingContext());
        var result = new ArrayList<String>();
        try (var statements = parser.parse(new StringResource(sql))) {
            while (statements.hasNext()) result.add(statements.next().getSql());
        }
        return result;
    }

    @Test void packageBackfillAndIndexesAreCompiledAfterNewColumnsExist() throws Exception {
        var batches = batches("V21__package_versions_and_payment_deadlines.sql");
        int create = containing(batches, "ADD package_family_id");
        int backfill = containing(batches, "UPDATE dbo.TRAINING_PACKAGE");
        int notNull = containing(batches, "ALTER COLUMN package_family_id");
        int constraints = containing(batches, "ADD CONSTRAINT FK_PACKAGE_PREVIOUS");
        int indexes = containing(batches, "CREATE UNIQUE INDEX UX_PACKAGE_FAMILY_VERSION");
        assertTrue(create < backfill && backfill < notNull);
        assertTrue(notNull < constraints && constraints < indexes);
        assertTrue(batches.get(create).contains("COL_LENGTH"));
        assertTrue(batches.get(backfill).contains("WHERE package_family_id IS NULL"), "Do not overwrite existing version families");
        assertTrue(batches.get(indexes).contains("sys.indexes"));
    }

    @Test void screeningConstraintsAreCompiledInALaterBatch() throws Exception {
        var batches = batches("V22__horse_admission_screening.sql");
        assertTrue(containing(batches, "ADD screening_status") < containing(batches, "ADD CONSTRAINT CK_HorseAdmission_Screening"));
        assertTrue(batches.get(0).contains("COL_LENGTH"));
        assertTrue(batches.stream().noneMatch(batch -> batch.contains("UPDATE dbo.Horse_Admission")), "Preserve prior screening decisions");
    }

    private int containing(List<String> batches, String fragment) {
        for (int i = 0; i < batches.size(); i++) if (batches.get(i).contains(fragment)) return i;
        fail("Missing SQL operation: " + fragment);
        return -1;
    }
}

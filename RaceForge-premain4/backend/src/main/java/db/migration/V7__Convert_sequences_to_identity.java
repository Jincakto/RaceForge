package db.migration;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Rebuilds sequence-backed tables atomically, preserving existing IDs and references. */
public class V7__Convert_sequences_to_identity extends BaseJavaMigration {
    private static final List<String> TABLES = List.of(
            "Audit_Log", "Care_Task", "Health_Profile", "Horse", "HORSE_PACKAGE", "HORSE_RACE_HISTORY",
            "Medical_Clinical_Exam", "Medical_Record", "Medical_Vital_Sign", "Notification", "Nutrition_Plan",
            "Password_Reset_Token", "Permission", "Refresh_Token", "Registration_Request", "Role", "Supply_Item",
            "Training_Lock", "TRAINING_PACKAGE", "Training_Plan", "Training_Session", "User");

    private record Definition(String table, String key, String columns, String names,
                              String binaryNames, List<String> constraints, List<String> indexes) {}
    private record ForeignKey(String drop, String create, String disable) {}

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        if (connection.getAutoCommit()) throw new SQLException("V7 requires a Flyway transaction");
        execute(connection, "SET XACT_ABORT ON; SET LOCK_TIMEOUT 30000;");
        try {
            List<Definition> tables = new ArrayList<>();
            for (String name : TABLES) {
                if (scalar(connection, "SELECT COUNT(*) FROM sys.tables WHERE object_id=OBJECT_ID(" + literal(table(name)) + ")") != 1)
                    throw new SQLException("V7 requires application table " + name);
                scalar(connection, "SELECT COUNT_BIG(*) FROM " + table(name) + " WITH (TABLOCKX,HOLDLOCK)");
            }
            for (String name : TABLES) tables.add(inspect(connection, name));
            List<ForeignKey> foreignKeys = foreignKeys(connection);
            // Capture all metadata before the first destructive operation.
            for (ForeignKey key : foreignKeys) execute(connection, key.drop());
            for (Definition definition : tables) rebuild(connection, definition);
            for (Definition definition : tables) {
                for (String sql : definition.constraints()) execute(connection, sql);
                for (String sql : definition.indexes()) execute(connection, sql);
            }
            for (ForeignKey key : foreignKeys) {
                execute(connection, key.create());
                if (key.disable() != null) execute(connection, key.disable());
            }
            try (Statement statement = connection.createStatement()) {
                boolean result = statement.execute("DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS, ALL_ERRORMSGS");
                while (true) {
                    if (result) {
                        try (ResultSet violations = statement.getResultSet()) {
                            if (violations.next()) throw new SQLException("Constraint violation after identity migration");
                        }
                    } else if (statement.getUpdateCount() == -1) break;
                    result = statement.getMoreResults();
                }
            }
            for (String name : TABLES) execute(connection, "DROP SEQUENCE " + table("seq_" + name));
        } finally {
            execute(connection, "SET LOCK_TIMEOUT -1");
        }
    }

    private Definition inspect(Connection connection, String name) throws SQLException {
        String object = "OBJECT_ID(" + literal(table(name)) + ")";
        requireZero(connection, "SELECT COUNT(*) FROM sys.tables WHERE object_id=" + object
                + " AND (temporal_type<>0 OR is_memory_optimized=1 OR is_filetable=1 OR is_replicated=1 OR is_tracked_by_cdc=1)", name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.columns WHERE object_id=" + object
                + " AND (is_identity=1 OR is_computed=1 OR is_sparse=1 OR is_column_set=1 OR is_rowguidcol=1"
                + " OR generated_always_type<>0 OR encryption_type IS NOT NULL OR default_object_id<>0 AND NOT EXISTS"
                + " (SELECT 1 FROM sys.default_constraints d WHERE d.object_id=sys.columns.default_object_id))", name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.triggers WHERE parent_id=" + object, name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.sql_expression_dependencies WHERE referenced_id=" + object
                + " AND referencing_id IN (SELECT object_id FROM sys.objects WHERE type IN ('V','P','FN','IF','TF'))", name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.security_predicates WHERE target_object_id=" + object, name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.database_permissions WHERE class=1 AND major_id=" + object, name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.extended_properties WHERE class=1 AND major_id=" + object, name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.fulltext_indexes WHERE object_id=" + object, name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.stats WHERE object_id=" + object + " AND user_created=1", name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.partitions WHERE object_id=" + object
                + " AND (partition_number<>1 OR data_compression<>0)", name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.indexes WHERE object_id=" + object
                + " AND (type NOT IN (0,1,2) OR is_disabled=1 OR is_hypothetical=1 OR data_space_id NOT IN"
                + " (SELECT data_space_id FROM sys.filegroups WHERE is_default=1))", name);

        String key;
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT c.name FROM sys.indexes i JOIN sys.index_columns ic ON i.object_id=ic.object_id AND i.index_id=ic.index_id"
                + " JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id"
                + " WHERE i.object_id=" + object + " AND i.is_primary_key=1 AND ic.key_ordinal>0")) {
            if (!rows.next()) throw new SQLException("Missing primary key on " + name);
            key = rows.getString(1);
            if (rows.next()) throw new SQLException("Expected single-column primary key on " + name);
        }
        if (scalar(connection, "SELECT COUNT(*) FROM sys.columns WHERE object_id=" + object
                + " AND name=" + literal(key) + " AND TYPE_NAME(user_type_id)='int' AND is_nullable=0") != 1)
            throw new SQLException("Expected int primary key on " + name);
        if (scalar(connection, "SELECT COUNT(*) FROM sys.sequences WHERE object_id=OBJECT_ID("
                + literal(table("seq_" + name)) + ") AND TYPE_NAME(user_type_id)='int' AND increment=1 AND is_cycling=0") != 1)
            throw new SQLException("Missing or incompatible sequence on " + name);
        if (scalar(connection, "SELECT COALESCE(MAX(CONVERT(bigint," + quote(key) + ")),0) FROM " + table(name)) >= Integer.MAX_VALUE)
            throw new SQLException("Integer ID range exhausted on " + name);
        if (scalar(connection, "SELECT COUNT(*) FROM sys.tables WHERE object_id=OBJECT_ID(" + literal(table(shadow(name))) + ")") != 0)
            throw new SQLException("Shadow table already exists for " + name);

        List<String> columns = new ArrayList<>(), names = new ArrayList<>(), binaryNames = new ArrayList<>();
        List<String> constraints = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT c.name,t.name,c.max_length,c.precision,c.scale,c.is_nullable,c.collation_name,d.name,d.definition,t.is_user_defined"
                + " FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints d"
                + " ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE c.object_id=" + object + " ORDER BY c.column_id")) {
            while (rows.next()) {
                String column = rows.getString(1), type = rows.getString(2);
                if (rows.getBoolean(10)) throw new SQLException("Unsupported user-defined type on " + name);
                String sqlType = switch (type) {
                    case "varchar", "char", "varbinary", "binary" -> type + "(" + length(rows.getInt(3)) + ")";
                    case "nvarchar", "nchar" -> type + "(" + (rows.getInt(3) == -1 ? "max" : rows.getInt(3) / 2) + ")";
                    case "decimal", "numeric" -> type + "(" + rows.getInt(4) + "," + rows.getInt(5) + ")";
                    case "datetime2", "datetimeoffset", "time" -> type + "(" + rows.getInt(5) + ")";
                    case "float" -> type + "(" + rows.getInt(4) + ")";
                    case "int", "bigint", "smallint", "tinyint", "bit", "date", "datetime", "smalldatetime",
                            "real", "money", "smallmoney", "uniqueidentifier" -> type;
                    default -> throw new SQLException("Unsupported type " + type + " on " + name);
                };
                String collation = rows.getString(7);
                if (collation != null && !collation.matches("[A-Za-z0-9_]+"))
                    throw new SQLException("Unsupported collation on " + name);
                columns.add(quote(column) + " " + sqlType + (column.equals(key) ? " IDENTITY(1,1)" : "")
                        + (collation == null ? "" : " COLLATE " + collation) + (rows.getBoolean(6) ? " NULL" : " NOT NULL"));
                names.add(quote(column));
                binaryNames.add("CONVERT(varbinary(max)," + quote(column) + ")");
                String defaultName = rows.getString(8), defaultSql = rows.getString(9);
                if (defaultSql != null) {
                    if (column.equals(key)) {
                        String expected = "(NEXTVALUEFOR[dbo].[seq_" + name + "])";
                        if (!defaultSql.replaceAll("\\s+", "").equalsIgnoreCase(expected))
                            throw new SQLException("Unexpected ID default on " + name);
                    } else {
                        if (defaultSql.toUpperCase(java.util.Locale.ROOT).contains("NEXT VALUE FOR"))
                            throw new SQLException("Unexpected sequence default on " + name + "." + column);
                        constraints.add("ALTER TABLE " + table(name) + " ADD CONSTRAINT " + quote(defaultName)
                                + " DEFAULT " + defaultSql + " FOR " + quote(column));
                    }
                } else if (column.equals(key)) throw new SQLException("Missing sequence default on " + name);
            }
        }
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT name,definition,is_not_trusted,is_disabled,is_not_for_replication FROM sys.check_constraints WHERE parent_object_id=" + object)) {
            while (rows.next()) {
                if (rows.getBoolean(5)) throw new SQLException("Replication constraint on " + name);
                constraints.add("ALTER TABLE " + table(name) + (rows.getBoolean(3) ? " WITH NOCHECK" : " WITH CHECK")
                        + " ADD CONSTRAINT " + quote(rows.getString(1)) + " CHECK " + rows.getString(2));
                if (rows.getBoolean(4)) constraints.add("ALTER TABLE " + table(name) + " NOCHECK CONSTRAINT " + quote(rows.getString(1)));
            }
        }
        return new Definition(name, key, String.join(",", columns), String.join(",", names),
                String.join(",", binaryNames), constraints, indexes(connection, name));
    }

    private void rebuild(Connection connection, Definition definition) throws SQLException {
        String source = table(definition.table()), target = table(shadow(definition.table()));
        execute(connection, "CREATE TABLE " + target + " (" + definition.columns() + ")");
        execute(connection, "SET IDENTITY_INSERT " + target + " ON");
        try {
            execute(connection, "INSERT " + target + " (" + definition.names() + ") SELECT " + definition.names() + " FROM " + source);
        } finally {
            execute(connection, "SET IDENTITY_INSERT " + target + " OFF");
        }
        long count = scalar(connection, "SELECT COUNT_BIG(*) FROM " + source);
        if (count != scalar(connection, "SELECT COUNT_BIG(*) FROM " + target)) throw new SQLException("Row count mismatch on " + source);
        // Binary comparisons preserve case and trailing spaces; EXCEPT checks the entire copied row.
        if (scalar(connection, "SELECT CASE WHEN EXISTS (SELECT " + definition.binaryNames() + " FROM " + source
                + " EXCEPT SELECT " + definition.binaryNames() + " FROM " + target + ") OR EXISTS (SELECT "
                + definition.binaryNames() + " FROM " + target + " EXCEPT SELECT " + definition.binaryNames() + " FROM " + source
                + ") THEN 1 ELSE 0 END") != 0) throw new SQLException("Copied data differs on " + source);
        if (count > 0) {
            long maximum = scalar(connection, "SELECT MAX(" + quote(definition.key()) + ") FROM " + source);
            execute(connection, "DBCC CHECKIDENT (" + literal(target) + ", RESEED, " + maximum + ") WITH NO_INFOMSGS");
        }
        execute(connection, "DROP TABLE " + source);
        execute(connection, "EXEC sys.sp_rename " + literal(target) + ", " + literal(definition.table()) + ", 'OBJECT'");
    }

    private List<String> indexes(Connection connection, String name) throws SQLException {
        List<String> result = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT index_id,name,type,is_unique,is_primary_key,is_unique_constraint,filter_definition,fill_factor,"
                + "is_padded,ignore_dup_key,allow_row_locks,allow_page_locks,optimize_for_sequential_key,"
                + "(SELECT no_recompute FROM sys.stats s WHERE s.object_id=i.object_id AND s.stats_id=i.index_id) AS no_recompute"
                + " FROM sys.indexes i WHERE object_id=OBJECT_ID(" + literal(table(name)) + ") AND index_id>0 ORDER BY type,index_id")) {
            while (rows.next()) {
                List<String> keys = new ArrayList<>(), includes = new ArrayList<>();
                try (Statement statement2 = connection.createStatement(); ResultSet parts = statement2.executeQuery(
                        "SELECT c.name,ic.is_descending_key,ic.is_included_column,ic.key_ordinal FROM sys.index_columns ic"
                        + " JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=OBJECT_ID("
                        + literal(table(name)) + ") AND ic.index_id=" + rows.getInt(1) + " ORDER BY ic.key_ordinal,ic.index_column_id")) {
                    while (parts.next()) {
                        if (parts.getBoolean(3)) includes.add(quote(parts.getString(1)));
                        else if (parts.getInt(4) > 0) keys.add(quote(parts.getString(1)) + (parts.getBoolean(2) ? " DESC" : " ASC"));
                    }
                }
                boolean primary = rows.getBoolean(5), uniqueConstraint = rows.getBoolean(6);
                String kind = rows.getInt(3) == 1 ? "CLUSTERED" : "NONCLUSTERED";
                String sql = primary || uniqueConstraint
                        ? "ALTER TABLE " + table(name) + " ADD CONSTRAINT " + quote(rows.getString(2)) + (primary ? " PRIMARY KEY " : " UNIQUE ") + kind
                        : "CREATE " + (rows.getBoolean(4) ? "UNIQUE " : "") + kind + " INDEX " + quote(rows.getString(2)) + " ON " + table(name);
                sql += " (" + String.join(",", keys) + ")";
                if (!includes.isEmpty()) sql += " INCLUDE (" + String.join(",", includes) + ")";
                if (rows.getString(7) != null) sql += " WHERE " + rows.getString(7);
                sql += " WITH (" + (rows.getInt(8) == 0 ? "" : "FILLFACTOR=" + rows.getInt(8) + ",") + "PAD_INDEX=" + onOff(rows.getBoolean(9))
                        + ",IGNORE_DUP_KEY=" + onOff(rows.getBoolean(10)) + ",ALLOW_ROW_LOCKS=" + onOff(rows.getBoolean(11))
                        + ",ALLOW_PAGE_LOCKS=" + onOff(rows.getBoolean(12)) + ",OPTIMIZE_FOR_SEQUENTIAL_KEY=" + onOff(rows.getBoolean(13))
                        + ",STATISTICS_NORECOMPUTE=" + onOff(rows.getBoolean(14)) + ")";
                result.add(sql);
            }
        }
        return result;
    }

    private List<ForeignKey> foreignKeys(Connection connection) throws SQLException {
        List<ForeignKey> result = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT f.object_id,OBJECT_SCHEMA_NAME(f.parent_object_id),OBJECT_NAME(f.parent_object_id),f.name,"
                + "OBJECT_SCHEMA_NAME(f.referenced_object_id),OBJECT_NAME(f.referenced_object_id),f.delete_referential_action_desc,"
                + "f.update_referential_action_desc,f.is_not_trusted,f.is_disabled,f.is_not_for_replication FROM sys.foreign_keys f ORDER BY f.object_id")) {
            while (rows.next()) {
                if (!(rows.getString(2).equals("dbo") && TABLES.contains(rows.getString(3)))
                        && !(rows.getString(5).equals("dbo") && TABLES.contains(rows.getString(6)))) continue;
                if (rows.getBoolean(11)) throw new SQLException("Unsupported replication foreign key " + rows.getString(4));
                List<String> source = new ArrayList<>(), target = new ArrayList<>();
                try (Statement statement2 = connection.createStatement(); ResultSet parts = statement2.executeQuery(
                        "SELECT COL_NAME(parent_object_id,parent_column_id),COL_NAME(referenced_object_id,referenced_column_id)"
                        + " FROM sys.foreign_key_columns WHERE constraint_object_id=" + rows.getInt(1) + " ORDER BY constraint_column_id")) {
                    while (parts.next()) { source.add(quote(parts.getString(1))); target.add(quote(parts.getString(2))); }
                }
                String alter = "ALTER TABLE " + quote(rows.getString(2)) + "." + quote(rows.getString(3));
                String constraint = quote(rows.getString(4));
                result.add(new ForeignKey(alter + " DROP CONSTRAINT " + constraint,
                        alter + (rows.getBoolean(9) ? " WITH NOCHECK" : " WITH CHECK") + " ADD CONSTRAINT " + constraint
                        + " FOREIGN KEY (" + String.join(",", source) + ") REFERENCES " + quote(rows.getString(5)) + "." + quote(rows.getString(6))
                        + " (" + String.join(",", target) + ") ON DELETE " + rows.getString(7).replace('_', ' ')
                        + " ON UPDATE " + rows.getString(8).replace('_', ' '),
                        rows.getBoolean(10) ? alter + " NOCHECK CONSTRAINT " + constraint : null));
            }
        }
        return result;
    }

    private static String shadow(String name) { return "__V7_Identity_" + name; }
    private static String length(int length) { return length == -1 ? "max" : Integer.toString(length); }
    private static String onOff(boolean value) { return value ? "ON" : "OFF"; }
    private static String quote(String name) { return "[" + name.replace("]", "]]") + "]"; }
    private static String table(String name) { return "[dbo]." + quote(name); }
    private static String literal(String value) { return "N'" + value.replace("'", "''") + "'"; }
    private static void requireZero(Connection connection, String sql, String name) throws SQLException {
        if (scalar(connection, sql) != 0) throw new SQLException("Unsupported schema dependency or table feature on " + name + "; V7 stopped before rebuilding");
    }
    private static long scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            if (!rows.next()) throw new SQLException("Missing scalar result");
            return rows.getLong(1);
        }
    }
    private static void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) { statement.execute(sql); }
    }
}

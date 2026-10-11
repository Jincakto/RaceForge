package db.migration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** Converts application identifiers together with all references in one Flyway transaction. */
public class V2__Integer_ids_and_user_auth extends BaseJavaMigration {
    private static final Pattern BCRYPT = Pattern.compile("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$");
    private static final Map<String, Integer> ROLE_IDS = Map.of(
            "CLUB_MANAGER", 1, "HEAD_TRAINER", 2, "VETERINARIAN", 3,
            "GROOM", 4, "HORSE_OWNER", 5, "USER", 6);

    private record Column(String table, String name) {}
    private record ForeignKey(String table, String name, String target, String columns,
                              String targets, String deleteAction, String updateAction,
                              boolean trusted, boolean disabled) {}
    private record Index(String table, String name, String kind, boolean unique,
                         boolean primary, boolean constraint, String keys, String includes, String filter) {}
    private record Check(String table, String name, String definition, boolean trusted, boolean disabled) {}

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        mergeGoogleAndRemoveOtpTables(connection);
        execute(connection, """
                IF NOT EXISTS (SELECT 1 FROM dbo.[Role] WHERE role_name='USER')
                    INSERT dbo.[Role](role_id,role_name) VALUES ('ROL006','USER');
                """);

        List<Column> roots = singlePrimaryKeys(connection);
        Map<Column, Column> references = references(connection);
        Map<Column, Column> columns = conversionColumns(connection, roots, references);
        List<ForeignKey> foreignKeys = foreignKeys(connection);
        List<Index> indexes = indexes(connection);
        List<Check> checks = checks(connection);
        createIdMap(connection, roots);

        for (ForeignKey key : foreignKeys) execute(connection, "ALTER TABLE " + table(key.table()) + " DROP CONSTRAINT " + quote(key.name()));
        for (Check check : checks) execute(connection, "ALTER TABLE " + table(check.table()) + " DROP CONSTRAINT " + quote(check.name()));
        for (Index index : indexes) {
            execute(connection, index.constraint() || index.primary()
                    ? "ALTER TABLE " + table(index.table()) + " DROP CONSTRAINT " + quote(index.name())
                    : "DROP INDEX " + quote(index.name()) + " ON " + table(index.table()));
        }
        dropIdDefaults(connection, columns.keySet(), new LinkedHashSet<>(roots));

        // Every reference uses the same immutable map, including composite and self references.
        convertAuditEntityIds(connection);
        for (Map.Entry<Column, Column> entry : columns.entrySet()) {
            Column source = entry.getKey();
            String sourceValue = "CONVERT(nvarchar(255), s." + quote(source.name()) + ")";
            String join = "m.table_name=? AND m.legacy_value=" + sourceValue;
            try (PreparedStatement check = connection.prepareStatement("SELECT COUNT(*) FROM " + table(source.table())
                    + " s LEFT JOIN dbo.Legacy_Id_Mapping m ON " + join
                    + " WHERE s." + quote(source.name()) + " IS NOT NULL AND m.current_id IS NULL")) {
                check.setString(1, entry.getValue().table());
                try (ResultSet result = check.executeQuery()) {
                    result.next();
                    if (result.getInt(1) != 0) throw new SQLException("Unmapped identifier in " + source);
                }
            }
            try (PreparedStatement update = connection.prepareStatement("UPDATE s SET " + quote(source.name())
                    + "=CONVERT(varchar(20),m.current_id) FROM " + table(source.table())
                    + " s JOIN dbo.Legacy_Id_Mapping m ON " + join)) {
                update.setString(1, entry.getValue().table());
                update.executeUpdate();
            }
        }
        Set<Column> converted = new LinkedHashSet<>(columns.keySet());
        converted.add(new Column("Audit_Log", "entity_id"));
        for (Column column : converted) {
            boolean nullable = nullable(connection, column);
            execute(connection, "ALTER TABLE " + table(column.table()) + " ALTER COLUMN " + quote(column.name())
                    + " int " + (nullable ? "NULL" : "NOT NULL"));
        }

        for (Index index : indexes) restoreIndex(connection, index);
        for (Check check : checks) {
            execute(connection, "ALTER TABLE " + table(check.table()) + (check.trusted() ? " WITH CHECK" : " WITH NOCHECK")
                    + " ADD CONSTRAINT " + quote(check.name()) + " CHECK " + check.definition());
            if (check.disabled()) execute(connection, "ALTER TABLE " + table(check.table()) + " NOCHECK CONSTRAINT " + quote(check.name()));
        }
        for (ForeignKey key : foreignKeys) {
            execute(connection, "ALTER TABLE " + table(key.table()) + (key.trusted() ? " WITH CHECK" : " WITH NOCHECK")
                    + " ADD CONSTRAINT " + quote(key.name()) + " FOREIGN KEY (" + key.columns() + ") REFERENCES "
                    + table(key.target()) + " (" + key.targets() + ") ON DELETE " + key.deleteAction()
                    + " ON UPDATE " + key.updateAction());
            if (key.disabled()) execute(connection, "ALTER TABLE " + table(key.table()) + " NOCHECK CONSTRAINT " + quote(key.name()));
        }
        for (Column root : roots) {
            int maximum;
            try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(
                    "SELECT COALESCE(MAX(" + quote(root.name()) + "),0) FROM " + table(root.table()))) {
                result.next(); maximum = result.getInt(1);
            }
            if (maximum == Integer.MAX_VALUE) throw new SQLException("Integer ID range exhausted for " + root.table());
            String sequence = table("seq_" + root.table());
            execute(connection, "CREATE SEQUENCE " + sequence + " AS int START WITH " + (maximum + 1) + " INCREMENT BY 1 NO CYCLE");
            execute(connection, "ALTER TABLE " + table(root.table()) + " ADD CONSTRAINT " + quote("DF_" + root.table() + "_IntegerId")
                    + " DEFAULT (NEXT VALUE FOR " + sequence + ") FOR " + quote(root.name()));
        }
        execute(connection, """
                UPDATE dbo.[User] SET role_id=6 WHERE role_id IS NULL OR status IN ('UNVERIFIED','PENDING','REJECTED');
                ALTER TABLE dbo.[User] ALTER COLUMN role_id int NOT NULL;
                ALTER TABLE dbo.[User] ADD CONSTRAINT DF_User_DefaultRole DEFAULT 6 FOR role_id;
                CREATE UNIQUE INDEX UX_User_GoogleSubject ON dbo.[User](google_subject) WHERE google_subject IS NOT NULL;
                UPDATE dbo.Refresh_Token SET revoked_at=SYSUTCDATETIME() WHERE revoked_at IS NULL;
                UPDATE dbo.Password_Reset_Token SET used_at=SYSUTCDATETIME() WHERE used_at IS NULL;
                """);
        hashLegacyPasswords(connection);
    }

    private void mergeGoogleAndRemoveOtpTables(Connection connection) throws SQLException {
        execute(connection, """
                ALTER TABLE dbo.[User] ADD google_subject varchar(255) NULL, google_linked_at datetime2 NULL,
                    otp_hash varchar(64) NULL, otp_expires_at datetime2 NULL, otp_sent_at datetime2 NULL,
                    otp_attempt_count int NOT NULL CONSTRAINT DF_User_OtpAttempts DEFAULT 0;
                """);
        execute(connection, """
                IF EXISTS (SELECT 1 FROM dbo.User_External_Login WHERE provider <> 'GOOGLE')
                    THROW 50001, 'Unsupported external provider; migration stopped to preserve identities', 1;
                IF EXISTS (SELECT user_id FROM dbo.User_External_Login GROUP BY user_id HAVING COUNT(*)>1)
                    THROW 50001, 'Multiple Google identities for one user; migration stopped', 1;
                UPDATE u SET google_subject=l.provider_user_id,google_linked_at=l.created_at
                FROM dbo.[User] u JOIN dbo.User_External_Login l ON l.user_id=u.user_id;
                DROP TABLE dbo.User_External_Login;
                DROP TABLE dbo.Email_Verification_OTP;
                """);
    }

    private List<Column> singlePrimaryKeys(Connection connection) throws SQLException {
        List<Column> result = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT t.name,c.name FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id AND i.is_primary_key=1
                JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
                JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
                WHERE SCHEMA_NAME(t.schema_id)='dbo' AND t.name NOT IN ('sysdiagrams','flyway_schema_history')
                AND (SELECT COUNT(*) FROM sys.index_columns x WHERE x.object_id=i.object_id AND x.index_id=i.index_id AND x.key_ordinal>0)=1
                ORDER BY t.name
                """)) {
            while (rows.next()) result.add(new Column(rows.getString(1), rows.getString(2)));
        }
        return result;
    }

    private Map<Column, Column> references(Connection connection) throws SQLException {
        Map<Column, Column> result = new LinkedHashMap<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT OBJECT_NAME(parent_object_id),COL_NAME(parent_object_id,parent_column_id),
                       OBJECT_NAME(referenced_object_id),COL_NAME(referenced_object_id,referenced_column_id)
                FROM sys.foreign_key_columns WHERE OBJECT_SCHEMA_NAME(parent_object_id)='dbo'
                """)) {
            while (rows.next()) {
                Column column = new Column(rows.getString(1), rows.getString(2));
                Column target = new Column(rows.getString(3), rows.getString(4));
                Column old = result.put(column, target);
                if (old != null && !old.equals(target)) throw new SQLException("Ambiguous reference for " + column);
            }
        }
        return result;
    }

    private Map<Column, Column> conversionColumns(Connection connection, List<Column> roots,
                                                  Map<Column, Column> references) throws SQLException {
        Set<Column> candidates = new LinkedHashSet<>(roots);
        candidates.addAll(references.keySet());
        Map<Column, Column> result = new LinkedHashMap<>();
        for (Column candidate : candidates) {
            Column root = candidate;
            Set<Column> visited = new LinkedHashSet<>();
            while (!roots.contains(root)) {
                if (!visited.add(root) || !references.containsKey(root)) throw new SQLException("Cannot resolve identifier root for " + candidate);
                root = references.get(root);
            }
            result.put(candidate, root);
        }
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT t.name,c.name FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
                WHERE SCHEMA_NAME(t.schema_id)='dbo' AND t.name NOT IN ('sysdiagrams','flyway_schema_history') AND c.name LIKE '%[_]id'
                """)) {
            while (rows.next()) {
                Column column = new Column(rows.getString(1), rows.getString(2));
                if (!result.containsKey(column) && !column.equals(new Column("Audit_Log", "entity_id")))
                    throw new SQLException("Identifier has no primary or foreign key mapping: " + column);
            }
        }
        return result;
    }

    private void createIdMap(Connection connection, List<Column> roots) throws SQLException {
        execute(connection, """
                CREATE TABLE dbo.Legacy_Id_Mapping (
                    table_name nvarchar(128) NOT NULL, legacy_value nvarchar(255) NOT NULL, current_id int NOT NULL,
                    CONSTRAINT PK_Legacy_Id_Mapping PRIMARY KEY(table_name,legacy_value),
                    CONSTRAINT UX_Legacy_Id_Mapping UNIQUE(table_name,current_id)
                );
                """);
        try (PreparedStatement insert = connection.prepareStatement("INSERT dbo.Legacy_Id_Mapping(table_name,legacy_value,current_id) VALUES (?,?,?)")) {
            for (Column root : roots) {
                String query = "SELECT CONVERT(nvarchar(255)," + quote(root.name()) + ")"
                        + (root.table().equals("Role") ? ",role_name" : "") + " FROM " + table(root.table()) + " ORDER BY " + quote(root.name());
                try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(query)) {
                    int next = root.table().equals("Role") ? 7 : 1;
                    while (rows.next()) {
                        int number;
                        if (root.table().equals("Role") && ROLE_IDS.containsKey(rows.getString(2))) number = ROLE_IDS.get(rows.getString(2));
                        else number = next++;
                        if (number <= 0) throw new SQLException("Integer ID range exhausted");
                        insert.setString(1, root.table()); insert.setString(2, rows.getString(1)); insert.setInt(3, number); insert.addBatch();
                    }
                }
            }
            insert.executeBatch();
        }
    }

    private void convertAuditEntityIds(Connection connection) throws SQLException {
        execute(connection, """
                IF EXISTS (SELECT 1 FROM dbo.Audit_Log a LEFT JOIN dbo.Legacy_Id_Mapping m
                    ON LOWER(REPLACE(m.table_name,'_',''))=LOWER(REPLACE(a.entity_type,'_','')) AND m.legacy_value=a.entity_id
                    WHERE a.entity_id IS NOT NULL AND m.current_id IS NULL)
                    THROW 50001, 'Audit entity ID has no mapping; migration stopped', 1;
                UPDATE a SET entity_id=CONVERT(varchar(20),m.current_id) FROM dbo.Audit_Log a JOIN dbo.Legacy_Id_Mapping m
                    ON LOWER(REPLACE(m.table_name,'_',''))=LOWER(REPLACE(a.entity_type,'_','')) AND m.legacy_value=a.entity_id;
                """);
    }

    private List<ForeignKey> foreignKeys(Connection connection) throws SQLException {
        List<ForeignKey> result = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT f.object_id,OBJECT_NAME(f.parent_object_id),f.name,OBJECT_NAME(f.referenced_object_id),
                    f.delete_referential_action_desc,f.update_referential_action_desc,f.is_not_trusted,f.is_disabled
                FROM sys.foreign_keys f WHERE OBJECT_SCHEMA_NAME(f.parent_object_id)='dbo' ORDER BY f.name
                """)) {
            while (rows.next()) {
                List<String> source = new ArrayList<>(), target = new ArrayList<>();
                try (PreparedStatement columns = connection.prepareStatement("SELECT COL_NAME(parent_object_id,parent_column_id),COL_NAME(referenced_object_id,referenced_column_id) FROM sys.foreign_key_columns WHERE constraint_object_id=? ORDER BY constraint_column_id")) {
                    columns.setInt(1, rows.getInt(1));
                    try (ResultSet parts = columns.executeQuery()) { while (parts.next()) { source.add(quote(parts.getString(1))); target.add(quote(parts.getString(2))); } }
                }
                result.add(new ForeignKey(rows.getString(2),rows.getString(3),rows.getString(4),String.join(",",source),String.join(",",target),
                        rows.getString(5).replace('_',' '),rows.getString(6).replace('_',' '),!rows.getBoolean(7),rows.getBoolean(8)));
            }
        }
        return result;
    }

    private List<Index> indexes(Connection connection) throws SQLException {
        List<Index> result = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("""
                SELECT i.object_id,i.index_id,t.name,i.name,i.type,i.is_unique,i.is_primary_key,i.is_unique_constraint,i.filter_definition
                FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE SCHEMA_NAME(t.schema_id)='dbo'
                AND t.name NOT IN ('sysdiagrams','flyway_schema_history','Legacy_Id_Mapping') AND i.index_id>0 ORDER BY i.is_primary_key,t.name,i.index_id
                """)) {
            while (rows.next()) {
                int type = rows.getInt(5);
                if (type != 1 && type != 2) throw new SQLException("Unsupported index type on " + rows.getString(3));
                List<String> keys = new ArrayList<>(), includes = new ArrayList<>();
                try (PreparedStatement columns = connection.prepareStatement("SELECT c.name,ic.is_descending_key,ic.is_included_column FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=? AND ic.index_id=? ORDER BY ic.key_ordinal,ic.index_column_id")) {
                    columns.setInt(1,rows.getInt(1)); columns.setInt(2,rows.getInt(2));
                    try (ResultSet parts = columns.executeQuery()) {
                        while (parts.next()) {
                            if (parts.getBoolean(3)) includes.add(quote(parts.getString(1)));
                            else keys.add(quote(parts.getString(1)) + (parts.getBoolean(2) ? " DESC" : " ASC"));
                        }
                    }
                }
                result.add(new Index(rows.getString(3),rows.getString(4),type==1?"CLUSTERED":"NONCLUSTERED",rows.getBoolean(6),
                        rows.getBoolean(7),rows.getBoolean(8),String.join(",",keys),String.join(",",includes),rows.getString(9)));
            }
        }
        return result;
    }

    private void restoreIndex(Connection connection, Index index) throws SQLException {
        if (index.primary() || index.constraint()) {
            execute(connection, "ALTER TABLE " + table(index.table()) + " ADD CONSTRAINT " + quote(index.name())
                    + (index.primary() ? " PRIMARY KEY " : " UNIQUE ") + index.kind() + " (" + index.keys() + ")");
        } else {
            execute(connection, "CREATE " + (index.unique()?"UNIQUE ":"") + index.kind() + " INDEX " + quote(index.name())
                    + " ON " + table(index.table()) + " (" + index.keys() + ")"
                    + (index.includes().isEmpty()?"":" INCLUDE ("+index.includes()+")")
                    + (index.filter()==null?"":" WHERE "+index.filter()));
        }
    }

    private List<Check> checks(Connection connection) throws SQLException {
        List<Check> result = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("SELECT OBJECT_NAME(parent_object_id),name,definition,is_not_trusted,is_disabled FROM sys.check_constraints WHERE OBJECT_SCHEMA_NAME(parent_object_id)='dbo'")) {
            while (rows.next()) result.add(new Check(rows.getString(1),rows.getString(2),rows.getString(3),!rows.getBoolean(4),rows.getBoolean(5)));
        }
        return result;
    }

    private void dropIdDefaults(Connection connection, Set<Column> columns, Set<Column> roots) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("SELECT OBJECT_NAME(parent_object_id),COL_NAME(parent_object_id,parent_column_id),name FROM sys.default_constraints WHERE OBJECT_SCHEMA_NAME(parent_object_id)='dbo'")) {
            List<String> commands = new ArrayList<>();
            while (rows.next()) {
                Column column = new Column(rows.getString(1),rows.getString(2));
                if (columns.contains(column)) {
                    if (!roots.contains(column))
                        throw new SQLException("Foreign-key default needs an explicit ID mapping: " + column);
                    commands.add("ALTER TABLE " + table(rows.getString(1)) + " DROP CONSTRAINT " + quote(rows.getString(3)));
                }
            }
            for (String command : commands) execute(connection,command);
        }
    }

    private boolean nullable(Connection connection, Column column) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT is_nullable FROM sys.columns WHERE object_id=OBJECT_ID(?) AND name=?")) {
            statement.setString(1,"dbo."+quote(column.table())); statement.setString(2,column.name());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Column missing: " + column);
                return result.getBoolean(1);
            }
        }
    }

    private void hashLegacyPasswords(Connection connection) throws SQLException {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery("SELECT user_id,password FROM dbo.[User] WHERE password IS NOT NULL");
             PreparedStatement update = connection.prepareStatement("UPDATE dbo.[User] SET password=? WHERE user_id=?")) {
            while (rows.next()) {
                String password = rows.getString(2);
                if (!BCRYPT.matcher(password).matches()) {
                    update.setString(1,encoder.encode(password)); update.setInt(2,rows.getInt(1)); update.addBatch();
                }
            }
            update.executeBatch();
        }
    }

    private static String quote(String name) { return "[" + name.replace("]", "]]") + "]"; }
    private static String table(String name) { return "[dbo]." + quote(name); }
    private static void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) { statement.execute(sql); }
    }
}

package db.migration;

import java.sql.*;
import java.util.*;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Transactional conversion of business keys and their complete FK graph, including historical tables. */
public class V9__Business_string_ids extends BaseJavaMigration {
    private static final Map<String,String> ROOTS = Map.of("User","user_id","Horse","horse_id",
            "TRAINING_PACKAGE","package_id","Medical_Record","medical_record_id");
    private static final Map<String,String> PREFIXES = Map.of("Horse","HOR","TRAINING_PACKAGE","PKG","Medical_Record","MED");
    private static final String USER_PREFIX = "CASE role_id WHEN 1 THEN 'CM' WHEN 2 THEN 'HTR' WHEN 3 THEN 'VET' WHEN 4 THEN 'GRM' WHEN 5 THEN 'OWN' WHEN 7 THEN 'ADM' END";
    private List<String> TABLES;
    private final Map<Column,String> converted = new LinkedHashMap<>();
    private record Column(String table, String name) {}
    private record Edge(Column source, Column target) {}
    private record Definition(String table, String identity, String columns, String names,
            String selection, String expected, String actual, List<String> constraints, List<String> indexes) {}
    private record ForeignKey(String drop, String create, String disable) {}

    @Override public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        if (connection.getAutoCommit()) throw new SQLException("V9 requires a transaction");
        execute(connection, "SET XACT_ABORT ON; SET LOCK_TIMEOUT 30000");
        try {
            ROOTS.forEach((name,key) -> converted.put(new Column(name,key), name));
            List<Edge> edges = new ArrayList<>();
            try (Statement s = connection.createStatement(); ResultSet r = s.executeQuery("""
                    SELECT OBJECT_SCHEMA_NAME(parent_object_id),OBJECT_NAME(parent_object_id),COL_NAME(parent_object_id,parent_column_id),
                    OBJECT_SCHEMA_NAME(referenced_object_id),OBJECT_NAME(referenced_object_id),COL_NAME(referenced_object_id,referenced_column_id)
                    FROM sys.foreign_key_columns
                    """)) {
                while (r.next()) {
                    if (!"dbo".equals(r.getString(1)) || !"dbo".equals(r.getString(4)))
                        throw new SQLException("Cross-schema foreign keys require explicit review before V9");
                    edges.add(new Edge(new Column(r.getString(2),r.getString(3)),new Column(r.getString(5),r.getString(6))));
                }
            }
            boolean changed;
            do {
                changed = false;
                for (Edge edge : edges) if (converted.containsKey(edge.target())) {
                    String root = converted.get(edge.target());
                    String previous = converted.putIfAbsent(edge.source(),root);
                    if (previous != null && !previous.equals(root)) throw new SQLException("Ambiguous reference " + edge.source());
                    if (previous == null) changed = true;
                }
            } while (changed);
            converted.put(new Column("Audit_Log","user_id"),"User");
            converted.put(new Column("Audit_Log","horse_id"),"Horse");
            Set<String> names = new TreeSet<>();
            converted.keySet().forEach(c -> names.add(c.table()));
            TABLES = new ArrayList<>(names);
            for (String name : TABLES) scalar(connection,"SELECT COUNT_BIG(*) FROM " + table(name) + " WITH (TABLOCKX,HOLDLOCK)");
            requireZero(connection,"SELECT COUNT(*) FROM dbo.[User] WHERE " + USER_PREFIX + " IS NULL","unsupported user roles");
            for (String root : ROOTS.keySet()) {
                if (root.equals("User")) requireZero(connection,"SELECT COUNT(*) FROM (SELECT role_id FROM dbo.[User] GROUP BY role_id HAVING COUNT_BIG(*)>1000) x","user prefix capacity");
                else if (scalar(connection,"SELECT COUNT_BIG(*) FROM " + table(root)) > 1000) throw new SQLException("ID capacity exceeded: " + root);
            }
            for (String name : TABLES) inspectFeatures(connection,name);
            execute(connection,"CREATE TABLE dbo.String_Id_Mapping (entity_type nvarchar(128) NOT NULL, old_id int NOT NULL, new_id varchar(20) NOT NULL, CONSTRAINT PK_String_Id_Mapping PRIMARY KEY(entity_type,old_id), CONSTRAINT UQ_String_Id_Mapping UNIQUE(entity_type,new_id))");
            for (String root : new TreeSet<>(ROOTS.keySet())) {
                String prefix = root.equals("User") ? USER_PREFIX : literal(PREFIXES.get(root));
                String partition = root.equals("User") ? "PARTITION BY role_id " : "";
                execute(connection,"INSERT dbo.String_Id_Mapping SELECT " + literal(root) + "," + quote(ROOTS.get(root)) + ","
                        + prefix + "+'-'+RIGHT('000'+CONVERT(varchar(20),ROW_NUMBER() OVER (" + partition + "ORDER BY " + quote(ROOTS.get(root)) + ")-1),3) FROM " + table(root));
            }
            for (Map.Entry<Column,String> entry : converted.entrySet()) {
                Column c = entry.getKey();
                requireZero(connection,"SELECT COUNT_BIG(*) FROM " + table(c.table()) + " s WHERE s." + quote(c.name()) + " IS NOT NULL AND " + mapped(entry.getValue(),"s."+quote(c.name())) + " IS NULL",c.toString());
            }
            // Old bearer subjects and HMAC-bound OTPs cannot be reused after identifiers change.
            execute(connection,"UPDATE dbo.Refresh_Token SET revoked_at=SYSUTCDATETIME() WHERE revoked_at IS NULL");
            execute(connection,"UPDATE dbo.Password_Reset_Token SET used_at=SYSUTCDATETIME() WHERE used_at IS NULL");
            execute(connection,"UPDATE dbo.Email_Verification_OTP SET expires_at=SYSUTCDATETIME(),sent_at=CONVERT(datetime2,'1970-01-01')");
            List<Definition> definitions = new ArrayList<>();
            for (String name : TABLES) definitions.add(inspect(connection,name));
            List<ForeignKey> keys = foreignKeys(connection);
            for (ForeignKey key : keys) execute(connection,key.drop());
            for (Definition definition : definitions) rebuild(connection,definition);
            for (Definition definition : definitions) {
                for (String sql : definition.constraints()) execute(connection,sql);
                for (String sql : definition.indexes()) execute(connection,sql);
            }
            for (ForeignKey key : keys) {
                execute(connection,key.create());
                if (key.disable()!=null) execute(connection,key.disable());
            }
            for (String root : ROOTS.keySet()) {
                String key = quote(ROOTS.get(root));
                List<String> prefixes = root.equals("User") ? List.of("CM","HTR","VET","GRM","OWN","ADM") : List.of(PREFIXES.get(root));
                List<String> rules = new ArrayList<>();
                for (String prefix : prefixes) rules.add("("+key+" COLLATE Latin1_General_100_BIN2 LIKE '"+prefix+"-[0-9][0-9][0-9]' AND DATALENGTH("+key+")="+(prefix.length()+4)+")");
                execute(connection,"ALTER TABLE " + table(root) + " WITH CHECK ADD CONSTRAINT " + quote("CK_"+root+"_BusinessId") + " CHECK (" + String.join(" OR ",rules) + ")");
                requireZero(connection,"SELECT COUNT_BIG(*) FROM " + table(root)+" s LEFT JOIN dbo.String_Id_Mapping m ON m.entity_type="+literal(root)+" AND m.new_id=s."+key+" WHERE m.old_id IS NULL",root);
            }
            for (String prefix : List.of("HOR","OWN","VET","HTR","CM","PKG","MED","ADM","GRM")) {
                long count = scalar(connection,"SELECT COUNT_BIG(*) FROM dbo.String_Id_Mapping WHERE new_id LIKE " + literal(prefix+"-%"));
                execute(connection,"CREATE SEQUENCE " + table("seq_business_"+prefix) + " AS int START WITH " + Math.min(count,999) + " INCREMENT BY 1 MINVALUE 0 MAXVALUE 999 NO CYCLE NO CACHE");
                if (count == 1000) scalar(connection,"SELECT NEXT VALUE FOR " + table("seq_business_"+prefix));
            }
            try (Statement statement = connection.createStatement()) {
                boolean result = statement.execute("DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS, ALL_ERRORMSGS");
                while (true) {
                    if (result) { try (ResultSet rows=statement.getResultSet()) { if(rows.next()) throw new SQLException("Constraint violation after V9"); } }
                    else if (statement.getUpdateCount()==-1) break;
                    result=statement.getMoreResults();
                }
            }
        } finally { execute(connection,"SET LOCK_TIMEOUT -1"); }
    }

    private String mapped(String root, String value) {
        return "(SELECT m.new_id FROM dbo.String_Id_Mapping m WHERE m.entity_type=" + literal(root) + " AND m.old_id=" + value + ")";
    }

    private String selection(String name, String column) {
        String value="s."+quote(column);
        String root=converted.get(new Column(name,column));
        if(root!=null) return mapped(root,value);
        if(name.equals("Audit_Log") && column.equals("entity_id")) {
            String normalized="LOWER(REPLACE(s.entity_type,'_',''))";
            StringBuilder sql=new StringBuilder("CASE "+normalized);
            for(String target : ROOTS.keySet()) sql.append(" WHEN ").append(literal(target.replace("_","").toLowerCase(Locale.ROOT))).append(" THEN ").append(mapped(target,value));
            return sql.append(" ELSE CONVERT(varchar(20),").append(value).append(") END").toString();
        }
        return value;
    }

    private Definition inspect(Connection connection, String name) throws SQLException {
        String object="OBJECT_ID("+literal(table(name))+")";
        List<String> columns=new ArrayList<>(),names=new ArrayList<>(),select=new ArrayList<>(),expected=new ArrayList<>(),actual=new ArrayList<>(),constraints=new ArrayList<>();
        String identity=null;
        try(Statement s=connection.createStatement(); ResultSet r=s.executeQuery("SELECT c.name,t.name,c.max_length,c.precision,c.scale,c.is_nullable,c.collation_name,d.name,d.definition,t.is_user_defined,c.is_identity FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints d ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE c.object_id="+object+" ORDER BY c.column_id")) {
            while(r.next()) {
                String column=r.getString(1),type=r.getString(2);
                boolean convert=converted.containsKey(new Column(name,column)) || name.equals("Audit_Log")&&column.equals("entity_id");
                if(r.getBoolean(10)) throw new SQLException("User-defined type on "+name);
                String sqlType=convert ? "varchar(20)" : switch(type) {
                    case "varchar","char","varbinary","binary" -> type+"("+length(r.getInt(3))+")";
                    case "nvarchar","nchar" -> type+"("+(r.getInt(3)==-1?"max":r.getInt(3)/2)+")";
                    case "decimal","numeric" -> type+"("+r.getInt(4)+","+r.getInt(5)+")";
                    case "datetime2","datetimeoffset","time" -> type+"("+r.getInt(5)+")";
                    case "float" -> type+"("+r.getInt(4)+")";
                    case "int","bigint","smallint","tinyint","bit","date","datetime","smalldatetime","real","money","smallmoney","uniqueidentifier" -> type;
                    default -> throw new SQLException("Unsupported type "+type+" on "+name);
                };
                if(convert && !type.equals("int")) throw new SQLException("Expected integer ID on "+name+"."+column);
                boolean keepIdentity=r.getBoolean(11) && !ROOTS.containsKey(name);
                if(keepIdentity) identity=column;
                String collation=r.getString(7);
                if(collation!=null && !collation.matches("[A-Za-z0-9_]+")) throw new SQLException("Unsupported collation");
                columns.add(quote(column)+" "+sqlType+(keepIdentity?" IDENTITY(1,1)":"")+(collation==null?"":" COLLATE "+collation)+(r.getBoolean(6)?" NULL":" NOT NULL"));
                names.add(quote(column));
                String expression=selection(name,column);
                if(convert) requireZero(connection,"SELECT COUNT_BIG(*) FROM "+table(name)+" s WHERE s."+quote(column)+" IS NOT NULL AND "+expression+" IS NULL","unmapped "+name+"."+column);
                select.add(expression);
                expected.add("CONVERT(varbinary(max),"+expression+")");
                actual.add("CONVERT(varbinary(max),"+quote(column)+")");
                if(r.getString(9)!=null) {
                    if(convert) throw new SQLException("Unexpected default on converted ID "+name+"."+column);
                    constraints.add("ALTER TABLE "+table(name)+" ADD CONSTRAINT "+quote(r.getString(8))+" DEFAULT "+r.getString(9)+" FOR "+quote(column));
                }
            }
        }
        try(Statement s=connection.createStatement();ResultSet r=s.executeQuery("SELECT name,definition,is_not_trusted,is_disabled,is_not_for_replication FROM sys.check_constraints WHERE parent_object_id="+object)) {
            while(r.next()) {
                if(r.getBoolean(5)) throw new SQLException("Replication check on "+name);
                constraints.add("ALTER TABLE "+table(name)+(r.getBoolean(3)?" WITH NOCHECK":" WITH CHECK")+" ADD CONSTRAINT "+quote(r.getString(1))+" CHECK "+r.getString(2));
                if(r.getBoolean(4)) constraints.add("ALTER TABLE "+table(name)+" NOCHECK CONSTRAINT "+quote(r.getString(1)));
            }
        }
        return new Definition(name,identity,String.join(",",columns),String.join(",",names),String.join(",",select),String.join(",",expected),String.join(",",actual),constraints,indexes(connection,name));
    }

    private void rebuild(Connection connection, Definition d) throws SQLException {
        String source=table(d.table()),target=table(shadow(d.table()));
        execute(connection,"CREATE TABLE "+target+" ("+d.columns()+")");
        if(d.identity()!=null) execute(connection,"SET IDENTITY_INSERT "+target+" ON");
        try { execute(connection,"INSERT "+target+" ("+d.names()+") SELECT "+d.selection()+" FROM "+source+" s"); }
        finally { if(d.identity()!=null) execute(connection,"SET IDENTITY_INSERT "+target+" OFF"); }
        long count=scalar(connection,"SELECT COUNT_BIG(*) FROM "+source);
        if(count!=scalar(connection,"SELECT COUNT_BIG(*) FROM "+target)) throw new SQLException("Row count mismatch on "+source);
        requireZero(connection,"SELECT CASE WHEN EXISTS (SELECT "+d.expected()+" FROM "+source+" s EXCEPT SELECT "+d.actual()+" FROM "+target+") OR EXISTS (SELECT "+d.actual()+" FROM "+target+" EXCEPT SELECT "+d.expected()+" FROM "+source+" s) THEN 1 ELSE 0 END","data verification "+source);
        if(d.identity()!=null && scalar(connection,"SELECT COUNT(*) FROM sys.identity_columns WHERE object_id=OBJECT_ID("+literal(source)+") AND last_value IS NOT NULL")>0) {
            long oldIdentity=scalar(connection,"SELECT CONVERT(bigint,IDENT_CURRENT("+literal(source)+"))");
            // A newly created empty table uses the reseed value itself on its first insert.
            long reseed=count==0 ? Math.addExact(oldIdentity,1) : oldIdentity;
            execute(connection,"DBCC CHECKIDENT ("+literal(target)+", RESEED, "+reseed+") WITH NO_INFOMSGS");
        }
        execute(connection,"DROP TABLE "+source);
        execute(connection,"EXEC sys.sp_rename "+literal(target)+", "+literal(d.table())+", 'OBJECT'");
    }

    private void inspectFeatures(Connection connection, String name) throws SQLException {
        String object = "OBJECT_ID(" + literal(table(name)) + ")";
        requireZero(connection, "SELECT COUNT(*) FROM sys.tables WHERE object_id=" + object
                + " AND (temporal_type<>0 OR is_memory_optimized=1 OR is_filetable=1 OR is_replicated=1 OR is_tracked_by_cdc=1)", name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.columns WHERE object_id=" + object
                + " AND (is_computed=1 OR is_sparse=1 OR is_column_set=1 OR is_rowguidcol=1"
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

        requireZero(connection, "SELECT COUNT(*) FROM sys.identity_columns WHERE object_id=" + object + " AND (CONVERT(bigint,seed_value)<>1 OR CONVERT(bigint,increment_value)<>1)", name);
        requireZero(connection, "SELECT COUNT(*) FROM sys.tables WHERE object_id=OBJECT_ID(" + literal(table(shadow(name))) + ")", "existing shadow " + name);
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

    private static String shadow(String name) { return "__V9_String_" + name; }
    private static String length(int length) { return length == -1 ? "max" : Integer.toString(length); }
    private static String onOff(boolean value) { return value ? "ON" : "OFF"; }
    private static String quote(String name) { return "[" + name.replace("]", "]]") + "]"; }
    private static String table(String name) { return "[dbo]." + quote(name); }
    private static String literal(String value) { return "N'" + value.replace("'", "''") + "'"; }
    private static void requireZero(Connection connection, String sql, String name) throws SQLException {
        if (scalar(connection, sql) != 0) throw new SQLException("Unsupported schema dependency or table feature on " + name + "; V9 stopped before rebuilding");
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


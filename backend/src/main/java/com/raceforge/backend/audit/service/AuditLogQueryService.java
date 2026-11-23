package com.raceforge.backend.audit.service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only audit access. Uses JDBC because the legacy Audit_Log ID is VARCHAR,
 * while the existing write-side JPA entity still declares an Integer identity ID.
 * This does not change or migrate the write-side schema.
 */
@Service
public class AuditLogQueryService {
    private final NamedParameterJdbcTemplate jdbc;

    public AuditLogQueryService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record AuditRow(String auditId, String actorId, String horseId, String action,
                           String entityType, String entityId, String result, String reason,
                           LocalDateTime createdAt) { }

    public record AuditPage(List<AuditRow> content, int number, int size,
                            long totalElements, int totalPages) { }

    @Transactional(readOnly = true)
    public AuditPage search(String query, String actorId, String action, String entityType,
                            String entityId, String horseId, String result, LocalDate from,
                            LocalDate to, int page, int size) {
        // Bound parameters exclusively: never concatenate user-controlled SQL.
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        MapSqlParameterSource params = new MapSqlParameterSource();
        if (query != null && !query.isBlank()) {
            where.append(" AND (CHARINDEX(LOWER(:q), LOWER(COALESCE(user_id, ''))) > 0")
                 .append(" OR CHARINDEX(LOWER(:q), LOWER(COALESCE(action, ''))) > 0")
                 .append(" OR CHARINDEX(LOWER(:q), LOWER(COALESCE(entity_type, ''))) > 0")
                 .append(" OR CHARINDEX(LOWER(:q), LOWER(COALESCE(entity_id, ''))) > 0")
                 .append(" OR CHARINDEX(LOWER(:q), LOWER(COALESCE(horse_id, ''))) > 0)");
            params.addValue("q", query.trim());
        }
        addExact(where, params, "user_id", "actorId", actorId);
        addContains(where, params, "action", "action", action);
        addExact(where, params, "entity_type", "entityType", entityType);
        addExact(where, params, "entity_id", "entityId", entityId);
        addExact(where, params, "horse_id", "horseId", horseId);
        addExact(where, params, "result", "result", result);
        if (from != null) {
            where.append(" AND created_at >= :startDate");
            params.addValue("startDate", Timestamp.valueOf(from.atStartOfDay()));
        }
        if (to != null) {
            where.append(" AND created_at < :endExclusive");
            params.addValue("endExclusive", Timestamp.valueOf(to.plusDays(1).atStartOfDay()));
        }
        Long count = jdbc.queryForObject("SELECT COUNT_BIG(1) FROM dbo.Audit_Log" + where, params, Long.class);
        long total = count == null ? 0 : count;
        params.addValue("offset", (long) page * size);
        params.addValue("size", size);
        String sql = "SELECT CONVERT(NVARCHAR(40), audit_id) AS audit_id, user_id, horse_id, "
                + "action, entity_type, entity_id, result, reason, created_at "
                + "FROM dbo.Audit_Log" + where
                + " ORDER BY created_at DESC, audit_id DESC OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY";
        List<AuditRow> records = jdbc.query(sql, params, (rs, rowNum) -> {
            Timestamp at = rs.getTimestamp("created_at");
            return new AuditRow(rs.getString("audit_id"), rs.getString("user_id"),
                    rs.getString("horse_id"), rs.getString("action"),
                    rs.getString("entity_type"), rs.getString("entity_id"),
                    rs.getString("result"), rs.getString("reason"),
                    at == null ? null : at.toLocalDateTime());
        });
        int pages = total == 0 ? 0 : (int) ((total - 1) / size + 1);
        return new AuditPage(records, page, size, total, pages);
    }

    private static void addExact(StringBuilder where, MapSqlParameterSource params,
                                 String column, String param, String value) {
        if (value != null && !value.isBlank()) {
            where.append(" AND LOWER(").append(column).append(") = LOWER(:").append(param).append(")");
            params.addValue(param, value.trim());
        }
    }

    private static void addContains(StringBuilder where, MapSqlParameterSource params,
                                    String column, String param, String value) {
        if (value != null && !value.isBlank()) {
            where.append(" AND CHARINDEX(LOWER(:").append(param)
                 .append("), LOWER(COALESCE(").append(column).append(", ''))) > 0");
            params.addValue(param, value.trim());
        }
    }
}

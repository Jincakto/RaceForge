package com.raceforge.backend.report;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Confirmed gross collections (not profit/refund-adjusted net revenue). */
@Service
public class RevenueReportService {
    private static final ZoneId CLUB_TIMEZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");
    private final JdbcTemplate jdbc;

    public RevenueReportService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Transaction(long orderCode, String horsePackageId, String packageId,
                              String packageName, String packageType, long amount,
                              String paymentState, boolean applied, LocalDateTime confirmedAtUtc) {}
    public record Breakdown(String label, long orderCount, long amount) {}
    public record Overview(String currency, String metric, long totalCollected, long paidOrderCount,
                           long averagePayment, long notAppliedCount,
                           long historicalUndatedPaidCount,
                           List<Breakdown> byType, List<Breakdown> byMonth) {}

    private record Filter(String sql, List<Object> args) {}

    private static LocalDateTime toUtc(LocalDate day) {
        return LocalDateTime.ofInstant(day.atStartOfDay(CLUB_TIMEZONE).toInstant(), ZoneOffset.UTC);
    }
    private Filter filter(LocalDate from, LocalDate to, String packageType) {
        if (from != null && to != null && to.isBefore(from))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must not precede start date");
        StringBuilder sql = new StringBuilder(" WHERE o.payment_state='PAID'");
        List<Object> params = new ArrayList<>();
        if (from != null) { sql.append(" AND o.confirmed_at_utc >= ?"); params.add(toUtc(from)); }
        if (to != null) { sql.append(" AND o.confirmed_at_utc < ?"); params.add(toUtc(to.plusDays(1))); }
        if (packageType != null && !packageType.isBlank()) {
            if (!List.of("BASIC", "PERFORMANCE", "RACING").contains(packageType))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown package type");
            sql.append(" AND p.package_type = ?"); params.add(packageType);
        }
        return new Filter(sql.toString(), params);
    }

    public List<Transaction> transactions(LocalDate from, LocalDate to, String packageType) {
        Filter f = filter(from, to, packageType);
        String query = "SELECT o.order_code, o.horse_package_id, o.amount, o.payment_state, o.applied, "
                + "o.confirmed_at_utc, p.package_id, p.package_name, p.package_type "
                + "FROM dbo.PayOS_Order o "
                + "JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=o.horse_package_id "
                + "JOIN dbo.TRAINING_PACKAGE p ON p.package_id=hp.package_id"
                + f.sql() + " ORDER BY o.confirmed_at_utc DESC, o.order_code DESC";
        return jdbc.query(query, (rs, i) -> {
            var timestamp = rs.getTimestamp("confirmed_at_utc");
            return new Transaction(rs.getLong("order_code"), rs.getString("horse_package_id"),
                    rs.getString("package_id"), rs.getString("package_name"), rs.getString("package_type"),
                    rs.getLong("amount"), rs.getString("payment_state"), rs.getBoolean("applied"),
                    timestamp == null ? null : timestamp.toLocalDateTime());
        }, f.args().toArray());
    }

    private static String month(Transaction t) {
        return t.confirmedAtUtc() == null ? "Undated (legacy)" :
                t.confirmedAtUtc().atOffset(ZoneOffset.UTC).atZoneSameInstant(CLUB_TIMEZONE).format(MONTH);
    }
    private static List<Breakdown> summarize(Map<String, long[]> grouped) {
        return grouped.entrySet().stream()
                .map(e -> new Breakdown(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }
    public Overview overview(LocalDate from, LocalDate to, String packageType) {
        List<Transaction> rows = transactions(from, to, packageType);
        long total = 0;
        long notApplied = 0;
        Map<String, long[]> types = new LinkedHashMap<>();
        Map<String, long[]> months = new java.util.TreeMap<>();
        for (Transaction t : rows) {
            total += t.amount();
            if (!t.applied()) notApplied++;
            types.computeIfAbsent(t.packageType(), k -> new long[2]);
            types.get(t.packageType())[0]++; types.get(t.packageType())[1] += t.amount();
            String key = month(t);
            months.computeIfAbsent(key, k -> new long[2]);
            months.get(key)[0]++; months.get(key)[1] += t.amount();
        }
        // A legacy paid order has no reliable payment date; do not backfill with a guess.
        String undatedSql = "SELECT COUNT_BIG(*) FROM dbo.PayOS_Order o "
                + "JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=o.horse_package_id "
                + "JOIN dbo.TRAINING_PACKAGE p ON p.package_id=hp.package_id "
                + "WHERE o.payment_state='PAID' AND o.confirmed_at_utc IS NULL";
        Long undated = packageType == null || packageType.isBlank()
                ? jdbc.queryForObject(undatedSql, Long.class)
                : jdbc.queryForObject(undatedSql + " AND p.package_type=?", Long.class, packageType);
        return new Overview("VND", "GROSS_CONFIRMED_COLLECTIONS", total, rows.size(),
                rows.isEmpty() ? 0 : total / rows.size(), notApplied,
                undated == null ? 0 : undated, summarize(types), summarize(months));
    }

    /** Escapes formula-like strings so exported CSV is safe to open in a spreadsheet. */
    private static String cell(Object value) {
        String v = Objects.toString(value, "");
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }
    public byte[] csv(LocalDate from, LocalDate to, String packageType) {
        StringBuilder out = new StringBuilder("\uFEFForderCode,horsePackageId,packageId,packageName,packageType,amountVND,paymentState,applied,confirmedAtUTC\r\n");
        for (Transaction t : transactions(from, to, packageType)) {
            Object[] columns = { t.orderCode(), t.horsePackageId(), t.packageId(), t.packageName(),
                    t.packageType(), t.amount(), t.paymentState(), t.applied(), t.confirmedAtUtc() };
            for (int i=0; i<columns.length; i++) {
                if (i>0) out.append(','); out.append(cell(columns[i]));
            }
            out.append("\r\n");
        }
        return out.toString().getBytes(StandardCharsets.UTF_8);
    }
}

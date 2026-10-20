package com.raceforge.backend.horse.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;
import java.util.Set;

/**
 * Atomically reserves XXX-001..XXX-999 IDs using the existing dbo.Id_Counter.
 * Called before save on all VARCHAR primary keys belonging to these modules.
 * The SQL Server UPDLOCK + HOLDLOCK protects both an existing row and its
 * missing-key index range while the transaction inserts/increments it.
 */
@Service
public class ModuleIdAllocator {
    private static final Set<String> ALLOWED = Set.of(
            "ASN", "RAC", "HTR", "HLT", "MED", "VIT", "CLN", "LCK", "PKG", "HPG");
    private final JdbcTemplate jdbc;

    public ModuleIdAllocator(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public String next(String prefix) {
        if (!ALLOWED.contains(prefix)) {
            throw new IllegalArgumentException("Unsupported module ID prefix: " + prefix);
        }
        // SELECT's range lock is kept until transaction commit; safe if first use
        // for this prefix races between two application requests.
        java.util.List<Long> counters = jdbc.query(
                "SELECT next_value FROM dbo.Id_Counter WITH (UPDLOCK, HOLDLOCK) WHERE prefix = ?",
                (rs, rowNum) -> rs.getLong(1), prefix);
        long current;
        if (counters.isEmpty()) {
            jdbc.update("INSERT INTO dbo.Id_Counter (prefix, next_value) VALUES (?, 0)", prefix);
            current = 0L;
        } else {
            current = counters.get(0);
        }
        if (current < 0 || current >= 999) {
            throw new BusinessRuleException("No remaining IDs for prefix " + prefix);
        }
        long allocated = current + 1;
        jdbc.update("UPDATE dbo.Id_Counter SET next_value = ? WHERE prefix = ?", allocated, prefix);
        return prefix + "-" + String.format(Locale.ROOT, "%03d", allocated);
    }
}

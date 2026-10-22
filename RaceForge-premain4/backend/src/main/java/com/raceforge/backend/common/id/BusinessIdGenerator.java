package com.raceforge.backend.common.id;

import com.raceforge.backend.common.exception.ApiException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class BusinessIdGenerator {
    public static final Map<Integer, String> USER_PREFIXES = Map.of(1,"CM",2,"HTR",3,"VET",4,"GRM",5,"OWN",7,"ADM");
    private static final Set<String> PREFIXES = Set.of("HOR","OWN","VET","HTR","CM","PKG","MED","ADM","GRM");
    private final JdbcTemplate jdbc;
    public BusinessIdGenerator(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public String next(String prefix) {
        if (!PREFIXES.contains(prefix)) throw new IllegalArgumentException("Unsupported ID prefix");
        try {
            Integer number = jdbc.queryForObject("SELECT NEXT VALUE FOR dbo.seq_business_" + prefix, Integer.class);
            if (number == null || number < 0 || number > 999) throw exhausted(prefix);
            return prefix + "-" + String.format(java.util.Locale.ROOT, "%03d", number);
        } catch (org.springframework.dao.DataAccessException exception) {
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause instanceof SQLException sql && sql.getErrorCode() == 11728) throw exhausted(prefix);
            }
            throw exception;
        }
    }

    private ApiException exhausted(String prefix) {
        return new ApiException(HttpStatus.CONFLICT, "ID_CAPACITY_EXCEEDED", "All 1000 IDs have been allocated for " + prefix);
    }
}

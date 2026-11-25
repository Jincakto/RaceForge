package com.raceforge.backend.oversight;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only administrative projections. Never changes Horse, Payment or Training lifecycle. */
@Service
@Transactional(readOnly = true)
public class OversightQueryService {
    private final JdbcTemplate jdbc;

    public OversightQueryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Long> overview() {
        Map<String, Long> metrics = new LinkedHashMap<>();
        metrics.put("horses", count("SELECT COUNT_BIG(*) FROM dbo.Horse"));
        metrics.put("awaitingAdmission", count("SELECT COUNT_BIG(*) FROM dbo.Horse_Admission WHERE status NOT IN ('COMPLETED','REJECTED')"));
        metrics.put("lockedHorses", count("SELECT COUNT_BIG(*) FROM dbo.Horse WHERE training_locked=1"));
        metrics.put("activePackages", count("SELECT COUNT_BIG(*) FROM dbo.HORSE_PACKAGE WHERE status='ACTIVE' AND payment_status='PAID'"));
        metrics.put("completedPackages", count("SELECT COUNT_BIG(*) FROM dbo.HORSE_PACKAGE WHERE status='COMPLETED'"));
        metrics.put("pendingPayments", count("SELECT COUNT_BIG(*) FROM dbo.PayOS_Order WHERE payment_state='PENDING'"));
        metrics.put("paidNotApplied", count("SELECT COUNT_BIG(*) FROM dbo.PayOS_Order WHERE payment_state='PAID' AND applied=0"));
        return metrics;
    }

    private long count(String sql) {
        Long count = jdbc.queryForObject(sql, Long.class);
        return count == null ? 0L : count;
    }

    /** Full horse directory; available only to Admin. */
    public List<Map<String, Object>> horses() {
        return jdbc.queryForList("""
                SELECT h.horse_id AS [horseId], h.horse_name AS [horseName],
                  h.owner_id AS [ownerId], u.full_name AS [ownerName],
                  h.registration_number AS [registrationNumber], h.breed AS [breed],
                  h.gender AS [gender], h.date_of_birth AS [dateOfBirth],
                  h.health_status AS [healthStatus], h.training_locked AS [trainingLocked],
                  h.status AS [horseStatus], COALESCE(a.status,'NOT_SUBMITTED') AS [admissionStatus],
                  h.image_url AS [imageUrl]
                FROM dbo.Horse h
                JOIN dbo.[User] u ON u.user_id=h.owner_id
                LEFT JOIN dbo.Horse_Admission a ON a.horse_id=h.horse_id
                ORDER BY h.horse_id DESC
                """);
    }

    /** Full package catalogue, including inactive versions; never grants package editing. */
    public List<Map<String, Object>> packages() {
        return jdbc.queryForList("""
                SELECT p.package_id AS [packageId], p.package_name AS [packageName],
                  p.package_type AS [packageType], p.description AS [description],
                  p.duration_days AS [durationDays], p.price AS [price],
                  p.status AS [status], p.package_family_id AS [packageFamilyId],
                  p.version_number AS [versionNumber], p.previous_package_id AS [previousPackageId], p.superseded AS [superseded]
                FROM dbo.TRAINING_PACKAGE p
                ORDER BY p.created_at DESC, p.package_id DESC
                """);
    }

    /** Exact stored PayOS state, not an inferred or simulated payment result. */
    public List<Map<String, Object>> payments() {
        return jdbc.queryForList("""
                SELECT TOP (300) o.order_code AS [orderCode], o.horse_package_id AS [horsePackageId],
                  o.amount AS [amount], o.payment_state AS [paymentState],
                  o.applied AS [applied], o.confirmed_at_utc AS [confirmedAtUtc],
                  hp.status AS [registrationStatus], h.horse_name AS [horseName],
                  u.full_name AS [ownerName], p.package_name AS [packageName],
                  p.package_type AS [packageType]
                FROM dbo.PayOS_Order o
                JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=o.horse_package_id
                JOIN dbo.Horse h ON h.horse_id=hp.horse_id
                JOIN dbo.[User] u ON u.user_id=h.owner_id
                JOIN dbo.TRAINING_PACKAGE p ON p.package_id=hp.package_id
                ORDER BY o.order_code DESC
                """);
    }

    /** One row per registration, including historical versions and ended trainer assignments. */
    public List<Map<String, Object>> registrations() {
        return jdbc.queryForList("""
                SELECT hp.horse_package_id AS [horsePackageId],
                  hp.horse_id AS [horseId], h.horse_name AS [horseName],
                  h.owner_id AS [ownerId], owner.full_name AS [ownerName],
                  hp.package_id AS [packageId], p.package_name AS [packageName],
                  p.package_type AS [packageType], hp.status AS [status],
                  hp.payment_status AS [paymentStatus], hp.total_price AS [totalPrice],
                  hp.registered_at AS [registeredAt], hp.start_date AS [startDate],
                  hp.end_date AS [endDate], hp.remaining_days AS [remainingDays],
                  assignment.assignee_id AS [trainerUserId], trainer.full_name AS [trainerName],
                  assignment.status AS [trainerAssignmentStatus], assignment.ended_at AS [trainerEndedAt]
                FROM dbo.HORSE_PACKAGE hp
                JOIN dbo.Horse h ON h.horse_id=hp.horse_id
                JOIN dbo.[User] owner ON owner.user_id=h.owner_id
                JOIN dbo.TRAINING_PACKAGE p ON p.package_id=hp.package_id
                OUTER APPLY (
                  SELECT TOP (1) ha.assignee_id, ha.status, ta.ended_at
                  FROM dbo.Training_Assignment ta
                  JOIN dbo.Horse_Assignment ha ON ha.id=ta.assignment_id AND ha.kind='TRAINER'
                  WHERE ta.horse_package_id=hp.horse_package_id
                  ORDER BY ha.created_at DESC, ha.id DESC
                ) assignment
                LEFT JOIN dbo.[User] trainer ON trainer.user_id=assignment.assignee_id
                ORDER BY hp.registered_at DESC, hp.horse_package_id DESC
                """);
    }
}

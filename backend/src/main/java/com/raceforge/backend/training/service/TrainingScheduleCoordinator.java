package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.training.dto.TrainingSessionResponse;
import java.sql.Types;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Database-scoped serialization and authoritative trainer identity for training calendars. */
@Service
public class TrainingScheduleCoordinator {
    @org.springframework.beans.factory.annotation.Autowired private TrainingAssessmentService assessmentService;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public TrainingScheduleCoordinator(JdbcTemplate jdbc, @Qualifier("trainingClock") Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public void lockSchedule() {
        if (!TransactionSynchronizationManager.isActualTransactionActive())
            throw new IllegalStateException("Training schedule lock requires a transaction");
        Integer result = jdbc.execute((ConnectionCallback<Integer>) connection -> {
            if (connection.getAutoCommit())
                throw new IllegalStateException("Training schedule lock requires an enlisted JDBC transaction");
            // SQL Server may defer BEGIN TRANSACTION until the first table access.
            // This lock is deliberately acquired before any table/horse lock.
            try (var begin = connection.createStatement()) {
                begin.execute("IF @@TRANCOUNT = 0 BEGIN TRANSACTION");
            }
            try (var call = connection.prepareCall("{? = call sys.sp_getapplock(?, ?, ?, ?, ?)}")) {
                call.registerOutParameter(1, Types.INTEGER);
                call.setString(2, "RaceForge:TrainingSchedule");
                call.setString(3, "Exclusive");
                call.setString(4, "Transaction");
                call.setInt(5, 10000);
                call.setString(6, "public");
                call.execute();
                return call.getInt(1);
            }
        });
        if (result == null || result < 0)
            throw new BusinessRuleException("The training schedule is being updated (SQL lock result " + result + "). Refresh and retry.");
    }

    public record Trainer(String userId, String name) {}

    private static final String CURRENT =
        "SELECT ta.horse_package_id,a.assignee_id,u.full_name FROM dbo.Training_Assignment ta " +
        "JOIN dbo.Horse_Assignment a ON a.id=ta.assignment_id " +
        "JOIN dbo.[User] u ON u.user_id=a.assignee_id " +
        "WHERE a.kind='TRAINER' AND a.status='ACCEPTED' AND ta.ended_at IS NULL ";

    private Map<String, Trainer> currentTrainers(Collection<String> packageIds) {
        Map<String, Trainer> result = new HashMap<>();
        if (packageIds.isEmpty()) return result;
        String marks = String.join(",", Collections.nCopies(packageIds.size(), "?"));
        for (var row : jdbc.queryForList(CURRENT + "AND ta.horse_package_id IN (" + marks + ")", packageIds.toArray())) {
            String id = (String) row.get("horse_package_id");
            if (result.putIfAbsent(id, new Trainer((String) row.get("assignee_id"), (String) row.get("full_name"))) != null)
                throw new BusinessRuleException("Package " + id + " has multiple ACCEPTED trainers. Ask Club Manager to resolve the assignments.");
        }
        return result;
    }

    public Trainer requireTrainer(String packageId) {
        var trainer = currentTrainers(List.of(packageId)).get(packageId);
        if (trainer == null) throw new BusinessRuleException("An ACCEPTED trainer assignment is required for this package.");
        return trainer;
    }

    public void validateTrainerSlot(String trainerUserId, LocalDateTime start, LocalDateTime end,
                                    String excludeSessionId, String excludePackageId) {
        TrainingCalendarRules.requireWindow(start, end);
        var conflicts = jdbc.queryForList(
            "SELECT TOP(1) s.session_id,s.scheduled_start,s.scheduled_end FROM dbo.Training_Session s " +
            "JOIN dbo.Training_Plan p ON p.plan_id=s.plan_id " +
            "LEFT JOIN dbo.Horse_Assignment original ON original.id=p.trainer_assignment_id " +
            "WHERE s.session_id<>? AND p.horse_package_id<>? AND s.status IN ('SCHEDULED','COMPLETED') " +
            "AND ((s.scheduled_end IS NULL AND CAST(s.scheduled_start AS date)=CAST(? AS date)) " +
            "OR (s.scheduled_start<? AND s.scheduled_end>?)) AND (" +
            "(s.status='SCHEDULED' AND EXISTS (SELECT 1 FROM dbo.Training_Assignment ta " +
            "JOIN dbo.Horse_Assignment a ON a.id=ta.assignment_id WHERE ta.horse_package_id=p.horse_package_id " +
            "AND a.kind='TRAINER' AND a.status='ACCEPTED' AND ta.ended_at IS NULL AND a.assignee_id=?)) " +
            "OR (s.status='COMPLETED' AND COALESCE(s.recorded_by,original.assignee_id)=?)) " +
            "ORDER BY s.scheduled_start,s.session_id",
            excludeSessionId, excludePackageId, start, end, start, trainerUserId, trainerUserId);
        if (!conflicts.isEmpty()) {
            var conflict = conflicts.get(0);
            throw new BusinessRuleException("Trainer " + trainerUserId + " is busy: session " +
                conflict.get("session_id") + " at " + conflict.get("scheduled_start") + " - " +
                conflict.get("scheduled_end") + ". Choose another time or trainer.");
        }
    }

    public void validateAcceptance(String packageId, String trainerUserId) {
        // Resolve ambiguity even when the package already has a trainer.
        var current = currentTrainers(List.of(packageId)).get(packageId);
        if (current != null)
            throw new BusinessRuleException("This package already has an ACCEPTED trainer. Use replacement before accepting another trainer.");
        var rows = jdbc.queryForList(
            "SELECT s.session_id,s.scheduled_start,s.scheduled_end FROM dbo.Training_Session s " +
            "JOIN dbo.Training_Plan p ON p.plan_id=s.plan_id WHERE p.horse_package_id=? " +
            "AND s.status='SCHEDULED' AND s.actual_start IS NULL AND s.scheduled_start>? ORDER BY s.scheduled_start",
            packageId, LocalDateTime.now(clock));
        LocalDateTime previousEnd = null;
        for (var row : rows) {
            var start = ((java.sql.Timestamp) row.get("scheduled_start")).toLocalDateTime();
            if (row.get("scheduled_end") == null)
                throw new BusinessRuleException("Session " + row.get("session_id") + " has no end time. Review it before accepting the assignment.");
            var end = ((java.sql.Timestamp) row.get("scheduled_end")).toLocalDateTime();
            TrainingCalendarRules.requireWindow(start, end);
            if (previousEnd != null && start.isBefore(previousEnd))
                throw new BusinessRuleException("This package contains overlapping future sessions at " + start + ". Review its schedule first.");
            validateTrainerSlot(trainerUserId, start, end, "", packageId);
            previousEnd = end;
        }
    }

    public void requireNoUnfinishedWork(String packageId) {
        if (jdbc.queryForObject(
                "SELECT COUNT(*) FROM dbo.Training_Session s JOIN dbo.Training_Plan p ON p.plan_id=s.plan_id " +
                "WHERE p.horse_package_id=? AND s.status='SCHEDULED' AND s.actual_start IS NOT NULL",
                Integer.class, packageId) > 0)
            throw new BusinessRuleException("Finish started sessions, including recovery results, before ending or replacing the trainer.");
    }

    private record UnfinishedWork(String sessionId,String horseId,String trainerId,boolean stopped) {}

    private List<UnfinishedWork> unfinishedWork() {
        return jdbc.query(
            "SELECT s.session_id,s.horse_id,COALESCE(a.assignee_id,original.assignee_id) AS trainer_id,s.actual_end " +
            "FROM dbo.Training_Session s JOIN dbo.Training_Plan p ON p.plan_id=s.plan_id " +
            "LEFT JOIN dbo.Horse_Assignment original ON original.id=p.trainer_assignment_id " +
            "LEFT JOIN (SELECT ta.horse_package_id,a.assignee_id FROM dbo.Training_Assignment ta " +
            "JOIN dbo.Horse_Assignment a ON a.id=ta.assignment_id WHERE ta.ended_at IS NULL " +
            "AND a.kind='TRAINER' AND a.status='ACCEPTED') a ON a.horse_package_id=p.horse_package_id " +
            "WHERE s.status='SCHEDULED' AND s.actual_start IS NOT NULL ORDER BY s.actual_start,s.session_id",
            (rs,index)->new UnfinishedWork(rs.getString("session_id"),rs.getString("horse_id"),
                rs.getString("trainer_id"),rs.getTimestamp("actual_end")!=null));
    }

    private String unfinishedReason(List<UnfinishedWork> work,String horseId,String trainerId,String excludeId) {
        for(var item:work) {
            if(item.sessionId().equals(excludeId))continue;
            if(item.horseId().equals(horseId) || (trainerId!=null && trainerId.equals(item.trainerId())))
                return (item.horseId().equals(horseId)?"This horse":"Trainer "+trainerId) +
                    " has unfinished session "+item.sessionId()+" (horse "+item.horseId()+"). " +
                    (item.stopped()?"Save its recovery results before starting another session.":
                        "Stop it and save its recovery results before starting another session.");
        }
        return null;
    }

    public void requireStartAvailable(String packageId,String horseId,String excludeId) {
        assessmentService.requireNoPendingReview(horseId);
        var trainer=requireTrainer(packageId);
        String reason=unfinishedReason(unfinishedWork(),horseId,trainer.userId(),excludeId);
        if(reason!=null)throw new BusinessRuleException(reason);
    }

    /** Batch enrichment: keep completed work with its recorder, current work with the current assignment. */
    public void decorate(List<TrainingSessionResponse> responses) {
        if (responses.isEmpty()) return;
        Set<String> packages = new HashSet<>(), plans = new HashSet<>(), recorders = new HashSet<>();
        for (var response : responses) {
            if (response.getHorsePackageId() != null) packages.add(response.getHorsePackageId());
            if (response.getPlanId() != null) plans.add(response.getPlanId());
            if (response.getRecordedBy() != null) recorders.add(response.getRecordedBy());
        }
        var current = currentTrainers(packages);
        Map<String, Trainer> original = new HashMap<>();
        Map<String, Boolean> validPlans = new HashMap<>();
        var today=LocalDate.now(clock);
        if (!plans.isEmpty()) {
            String marks = String.join(",", Collections.nCopies(plans.size(), "?"));
            for (var row : jdbc.queryForList(
                    "SELECT p.plan_id,a.assignee_id,u.full_name,p.status AS plan_status,hp.status AS package_status,hp.payment_status,hp.start_date,hp.end_date FROM dbo.Training_Plan p " +
                    "LEFT JOIN dbo.Horse_Assignment a ON a.id=p.trainer_assignment_id " +
                                        "LEFT JOIN dbo.[User] u ON u.user_id=a.assignee_id " +
                    "LEFT JOIN dbo.HORSE_PACKAGE hp ON hp.horse_package_id=p.horse_package_id WHERE p.plan_id IN (" + marks + ")", plans.toArray())) {
                var start=(java.sql.Date)row.get("start_date");var end=(java.sql.Date)row.get("end_date");
                validPlans.put((String)row.get("plan_id"),"ACTIVE".equals(row.get("plan_status")) &&
                    "ACTIVE".equals(row.get("package_status")) && "PAID".equals(row.get("payment_status")) &&
                    start!=null && end!=null && !today.isBefore(start.toLocalDate()) && !today.isAfter(end.toLocalDate()));
                original.put((String) row.get("plan_id"), new Trainer((String) row.get("assignee_id"), (String) row.get("full_name")));
            }
        }
        Map<String, Trainer> recorded = new HashMap<>();
        if (!recorders.isEmpty()) {
            String marks = String.join(",", Collections.nCopies(recorders.size(), "?"));
            for (var row : jdbc.queryForList("SELECT user_id,full_name FROM dbo.[User] WHERE user_id IN (" + marks + ")", recorders.toArray()))
                recorded.put((String) row.get("user_id"), new Trainer((String) row.get("user_id"), (String) row.get("full_name")));
        }
        var work=unfinishedWork();
        Set<String> horseIds = new HashSet<>();
        for (var response : responses) if (response.getHorseId() != null) horseIds.add(response.getHorseId());
        Set<String> pendingHorses = assessmentService.pendingHorseIds(horseIds);
        for (var response : responses) {
            boolean currentWork = "SCHEDULED".equals(response.getStatus());
            Trainer trainer = currentWork ? current.get(response.getHorsePackageId()) :
                recorded.getOrDefault(response.getRecordedBy(), original.get(response.getPlanId()));
            response.setTrainerUserId(trainer == null ? null : trainer.userId());
            response.setTrainerName(trainer == null ? null : trainer.name());
            boolean pendingReview = pendingHorses.contains(response.getHorseId());
            response.setPendingPostTrainingReview(pendingReview);
            response.setStartBlockedCode(null);
            String reason=null;
            if(!"SCHEDULED".equals(response.getStatus()))reason="Only a scheduled session can be started.";
            else if(response.getActualStart()!=null)reason=response.getActualEnd()==null?
                "Exercise is in progress. Stop it and record recovery results.":"Exercise stopped; recovery results are pending.";
            else if(pendingReview) {
                reason="Training is paused until a vet review is completed for this horse.";
                response.setStartBlockedCode("PENDING_POST_TRAINING_REVIEW");
            }
            else if(Boolean.TRUE.equals(response.getTrainingLocked()))reason="Horse is training-locked.";
            else if(trainer==null)reason="An ACCEPTED trainer assignment is required.";
            else if(!Boolean.TRUE.equals(validPlans.get(response.getPlanId())))reason="The plan and paid package must be active and valid today.";
            else reason=unfinishedReason(work,response.getHorseId(),trainer.userId(),response.getSessionId());
            response.setCanStart(reason==null);
            response.setStartBlockedReason(reason);
        }
    }
}
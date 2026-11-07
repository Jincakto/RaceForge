package com.raceforge.backend.training.service;

import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.training.entity.TrainingSession;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/** Read scope only. Never use these predicates to authorize training mutations. */
@Service
public class TrainingReadAccess {
    @org.springframework.beans.factory.annotation.Autowired
    private com.raceforge.backend.permission.service.PermissionService permissions;
    private final JdbcTemplate jdbc;
    public TrainingReadAccess(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean activeProfile(String userId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Trainer t JOIN dbo.Trainer_Detail d ON d.trainer_id=t.trainer_id WHERE t.user_id=? AND d.status='ACTIVE'", Integer.class, userId) > 0;
    }

    public Set<String> currentPackages(String userId, String horseId) {
        return new HashSet<>(jdbc.queryForList(
            "SELECT ta.horse_package_id FROM dbo.Training_Assignment ta JOIN dbo.Horse_Assignment a ON a.id=ta.assignment_id WHERE a.kind='TRAINER' AND a.status='ACCEPTED' AND ta.ended_at IS NULL AND a.assignee_id=? AND a.horse_id=?",
            String.class, userId, horseId));
    }

    public boolean canReadHorse(String userId, String horseId) {
        if (!activeProfile(userId)) return false;
        if (!currentPackages(userId, horseId).isEmpty()) return true;
        return jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Session WHERE horse_id=? AND recorded_by=? AND status IN ('COMPLETED','MISSED')",
            Integer.class, horseId, userId) > 0;
    }

    public void requireSession(AuthenticatedUser actor, TrainingSession session) {
        if(!"HEAD_TRAINER".equals(actor.roleName()) || !permissions.hasPermission(actor.roleName(),"VIEW_TRAINING"))
            throw new AccessDeniedException("VIEW_TRAINING is required");
        if(filter(actor,session.getHorse().getHorseId(),List.of(session)).isEmpty())
            throw new AccessDeniedException("This session is outside your training read scope");
    }

    public List<TrainingSession> filter(AuthenticatedUser actor, String horseId, List<TrainingSession> sessions) {
        if (!"HEAD_TRAINER".equals(actor.roleName())) return sessions;
        if (!activeProfile(actor.userId())) throw new AccessDeniedException("An active trainer profile is required");
        var packages = currentPackages(actor.userId(), horseId);
        var allowed=sessions.stream().filter(s -> packages.contains(s.getPlan().getHorsePackageId())
            || (Set.of("COMPLETED", "MISSED").contains(s.getStatus()) && actor.userId().equals(s.getRecordedBy()))).toList();
        if(packages.isEmpty() && allowed.isEmpty())throw new AccessDeniedException("No readable training assignments or recorded results");
        return allowed;
    }
}
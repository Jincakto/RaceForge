package com.raceforge.backend.training.service;

import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import org.springframework.stereotype.Service;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
public class TrainingReadinessService {
    public static final List<String> LEVELS = List.of("LOW", "MODERATE", "HIGH");
    public record Profile(String observedStableIntensity, int completedSessions,
            int lifetimeCompletedSessions, LocalDateTime lastCompletedAt, boolean starter,
            boolean durationComplete, double weeklySessions, double weeklyMinutes,
            double longestSession, List<String> reasonCodes) {}

    private final TrainingSessionRepository sessions;
    public TrainingReadinessService(TrainingSessionRepository sessions) { this.sessions = sessions; }

    public Profile read(String horseId, LocalDateTime now) {
        return analyze(sessions.findByHorse_HorseIdAndStatusOrderByActualEndAsc(horseId, "COMPLETED"), now);
    }

    public static Profile analyze(List<TrainingSession> rows, LocalDateTime now) {
        var reasons = new LinkedHashSet<String>();
        var completed = rows.stream().filter(s -> "COMPLETED".equals(s.getStatus())).toList();
        var valid = completed.stream().filter(s -> s.getIntensity() != null && LEVELS.contains(s.getIntensity())
                && s.getActualEnd() != null && !s.getActualEnd().isAfter(now))
                .sorted(Comparator.comparing(TrainingSession::getActualEnd)).toList();
        if (valid.size() != completed.size()) reasons.add("INCOMPLETE_HISTORY");
        LocalDate today = now.toLocalDate();
        var recent = valid.stream().filter(s -> !s.getActualEnd().toLocalDate().isBefore(today.minusDays(29))).toList();
        LocalDateTime last = valid.isEmpty() ? null : valid.get(valid.size() - 1).getActualEnd();
        if (last != null && ChronoUnit.DAYS.between(last.toLocalDate(), today) > 30)
            reasons.add("REASSESSMENT_NEEDED");

        String stable = "UNKNOWN";
        for (String level : List.of("HIGH", "MODERATE", "LOW")) {
            var levelRows = valid.stream().filter(s -> level.equals(s.getIntensity())).toList();
            if (levelRows.isEmpty()) continue;
            int cycleStart = 0;
            for (int i = 1; i < levelRows.size(); i++) {
                if (ChronoUnit.DAYS.between(levelRows.get(i - 1).getActualEnd().toLocalDate(),
                        levelRows.get(i).getActualEnd().toLocalDate()) > 30) cycleStart = i;
            }
            var cycle = levelRows.subList(cycleStart, levelRows.size());
            var current = cycle.stream().filter(s -> !s.getActualEnd().toLocalDate().isBefore(today.minusDays(29))).toList();
            long weeks = current.stream().map(s -> s.getActualEnd().toLocalDate()
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))).distinct().count();
            long span = ChronoUnit.DAYS.between(cycle.get(0).getActualEnd().toLocalDate(),
                    cycle.get(cycle.size() - 1).getActualEnd().toLocalDate());
            if (current.size() >= 6 && weeks >= 3 && span >= 30) { stable = level; break; }
        }
        if ("UNKNOWN".equals(stable)) reasons.add("INSUFFICIENT_STABLE_HISTORY");

        // Three complete rolling 7-day blocks; today is not a complete day.
        double[] counts = new double[3], minutes = new double[3], longest = new double[3];
        boolean durationComplete = true;
        for (var session : valid) {
            long age = ChronoUnit.DAYS.between(session.getActualEnd().toLocalDate(), today);
            if (age < 1 || age > 21) continue;
            int bucket = (int) ((age - 1) / 7);
            counts[bucket]++;
            if (session.getActualStart() == null || !session.getActualStart().isBefore(session.getActualEnd())) {
                durationComplete = false;
                continue;
            }
            double duration = Duration.between(session.getActualStart(), session.getActualEnd()).toSeconds() / 60.0;
            minutes[bucket] += duration;
            longest[bucket] = Math.max(longest[bucket], duration);
        }
        if (!durationComplete) reasons.add("ACTUAL_DURATION_MISSING");
        // Existing malformed COMPLETED rows do not make the horse a no-history starter.
        return new Profile(stable, recent.size(), valid.size(), last, completed.isEmpty(), durationComplete,
                median(counts), median(minutes), median(longest), List.copyOf(reasons));
    }

    private static double median(double[] values) { Arrays.sort(values); return values[1]; }
}
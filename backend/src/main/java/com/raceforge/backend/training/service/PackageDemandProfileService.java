package com.raceforge.backend.training.service;

import com.raceforge.backend.training.dto.PackageRoadmapDto;
import com.raceforge.backend.training.dto.TrainingWorkflowDtos.Stage;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;

/** Hypothetical schedules only; this analyzer never persists sessions. */
@Service
public class PackageDemandProfileService {
    public record Week(int week, int sessions, double minutes, double longestSession) {}
    public record Scenario(String startWeekday, List<Week> weeks, String entryIntensity) {}
    public record Profile(String entryIntensity, String peakIntensity,
            int firstWeekSessionsMin, int firstWeekSessionsMax,
            double firstWeekMinutesMin, double firstWeekMinutesMax,
            double firstWeekLongestSession, boolean starter,
            List<String> reasonCodes, List<Scenario> scenarios) {}

    public static int rank(String intensity) {
        return intensity == null ? -1 : TrainingReadinessService.LEVELS.indexOf(intensity);
    }

    public Profile analyze(PackageRoadmapDto roadmap, int days, String type) {
        var stages = roadmap.stages().stream().sorted(Comparator.comparingInt(Stage::startDay)).toList();
        var reasons = new LinkedHashSet<String>();
        String peak = stages.stream().map(Stage::intensity)
                .max(Comparator.comparingInt(PackageDemandProfileService::rank)).orElse("UNKNOWN");
        int runStart = stages.isEmpty() ? 1 : stages.get(0).startDay();
        for (int i = 1; i < stages.size(); i++) {
            var before = stages.get(i - 1);
            var after = stages.get(i);
            if (rank(after.intensity()) - rank(before.intensity()) > 1) reasons.add("INTENSITY_JUMP");
            int increases = (rank(after.intensity()) > rank(before.intensity()) ? 1 : 0)
                    + (after.daysOfWeek().size() > before.daysOfWeek().size() ? 1 : 0)
                    + (duration(after) > duration(before) ? 1 : 0);
            if (increases > 1) reasons.add("MULTIPLE_LOAD_INCREASES");
            if (!after.intensity().equals(before.intensity())) {
                if (rank(after.intensity()) > rank(before.intensity()) && before.endDay() - runStart + 1 < 30)
                    reasons.add("INTENSITY_PERIOD_TOO_SHORT");
                runStart = after.startDay();
            } else if (after.startDay() > before.endDay() + 1) {
                runStart = after.startDay();
            }
        }

        List<Scenario> scenarios = new ArrayList<>();
        int minCount = Integer.MAX_VALUE, maxCount = 0;
        double minMinutes = Double.MAX_VALUE, maxMinutes = 0, longest = 0;
        String entry = null;
        for (int offset = 0; offset < 7; offset++) {
            LocalDate start = LocalDate.of(2026, 1, 5).plusDays(offset);
            int blocks = (days + 6) / 7;
            int[] counts = new int[blocks];
            double[] minutes = new double[blocks], maxDuration = new double[blocks];
            String first = null;
            for (var stage : stages) {
                int generated = 0;
                double duration = duration(stage);
                if (duration <= 0) reasons.add("INVALID_STAGE_DURATION");
                for (int day = stage.startDay(); day <= stage.endDay(); day++) {
                    if (!stage.daysOfWeek().contains(start.plusDays(day - 1L).getDayOfWeek())) continue;
                    if (day < 1 || day > days) { reasons.add("STAGE_OUTSIDE_PACKAGE"); continue; }
                    int bucket = (day - 1) / 7;
                    counts[bucket]++;
                    minutes[bucket] += duration;
                    maxDuration[bucket] = Math.max(maxDuration[bucket], duration);
                    generated++;
                    if (first == null) first = stage.intensity();
                }
                if (generated == 0) reasons.add("STAGE_WITHOUT_SESSIONS");
            }
            if (first == null) reasons.add("NO_PLANNED_SESSIONS");
            if (offset == 0) entry = first;
            else if (!Objects.equals(entry, first)) reasons.add("VARIABLE_ENTRY_INTENSITY");
            var weeks = new ArrayList<Week>();
            for (int i = 0; i < blocks; i++) weeks.add(new Week(i + 1, counts[i], minutes[i], maxDuration[i]));
            scenarios.add(new Scenario(start.getDayOfWeek().name(), List.copyOf(weeks), first));
            minCount = Math.min(minCount, counts[0]); maxCount = Math.max(maxCount, counts[0]);
            minMinutes = Math.min(minMinutes, minutes[0]); maxMinutes = Math.max(maxMinutes, minutes[0]);
            longest = Math.max(longest, maxDuration[0]);
        }
        boolean starter = "BASIC".equals(type) && "LOW".equals(entry)
                && maxCount <= 2 && longest <= 30 && reasons.isEmpty();
        return new Profile(entry, peak, minCount, maxCount, minMinutes, maxMinutes, longest,
                starter, List.copyOf(reasons), List.copyOf(scenarios));
    }

    private static double duration(Stage stage) {
        if (stage.sessionTime() == null || stage.sessionEndTime() == null) return -1;
        return Duration.between(stage.sessionTime(), stage.sessionEndTime()).toSeconds() / 60.0;
    }
}
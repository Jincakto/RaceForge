package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;

@Service
public class TrainingPackageSuggestionService {
    public record Suggestion(String packageId, String packageName, String packageType,
            int durationDays, BigDecimal price, String goal, PackageDemandProfileService.Profile workload,
            String recommendationStatus, boolean canRegister, List<String> reasonCodes,
            List<TrainingPackageEligibilityService.Reason> blockReasons) {}
    public record Response(String horseId, String goal, String ruleVersion, LocalDateTime evaluatedAt,
            int historyWindowDays, TrainingReadinessService.Profile readiness,
            List<String> implementationLimits, List<Suggestion> packages) {}

    private static final List<String> STATUS_ORDER = List.of("RECOMMENDED", "AVAILABLE", "REVIEW_REQUIRED", "NOT_ELIGIBLE");
    private final HorseRepository horses;
    private final TrainingPackageRepository packages;
    private final TrainingPackageEligibilityService eligibility;
    private final TrainingReadinessService readiness;
    private final PackageRoadmapTemplateService roadmaps;
    private final PackageDemandProfileService demand;
    private final Clock clock;

    public TrainingPackageSuggestionService(HorseRepository horses, TrainingPackageRepository packages,
            TrainingPackageEligibilityService eligibility, TrainingReadinessService readiness,
            PackageRoadmapTemplateService roadmaps, PackageDemandProfileService demand,
            @Qualifier("trainingClock") Clock clock) {
        this.horses = horses; this.packages = packages; this.eligibility = eligibility;
        this.readiness = readiness; this.roadmaps = roadmaps; this.demand = demand; this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Response suggest(String horseId, String ownerId, String goal) {
        if (goal != null && !Set.of("FOUNDATION", "IMPROVE_PERFORMANCE", "PREPARE_FOR_RACING").contains(goal))
            throw new BusinessRuleException("Unsupported training goal");
        var horse = horses.findById(horseId).orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        if (ownerId == null || horse.getOwner() == null || !ownerId.equals(horse.getOwner().getUserId()))
            throw new AccessDeniedException("You are not the owner of this horse");
        var now = LocalDateTime.now(clock);
        var history = readiness.read(horseId, now);
        List<Suggestion> result = new ArrayList<>();
        for (var pack : packages.findByStatusOrderByPackageNameAsc("ACTIVE")) {
            if (!Set.of("BASIC", "RACING", "PERFORMANCE").contains(pack.getPackageType())) continue;
            var eligible = eligibility.evaluate(horse, pack, now.toLocalDate());
            PackageDemandProfileService.Profile profile = null;
            String roadmapGoal = null;
            if (eligible.reasons().stream().noneMatch(r -> "ROADMAP_CONFIGURATION".equals(r.code()))) {
                var roadmap = roadmaps.read(pack.getPackageId());
                roadmapGoal = roadmap.goal();
                profile = demand.analyze(roadmap, pack.getDurationDays(), pack.getPackageType());
            }
            Set<String> codes = new LinkedHashSet<>();
            eligible.reasons().forEach(r -> codes.add(r.code()));
            String status;
            if (!eligible.canRegister()) status = "NOT_ELIGIBLE";
            else {
                codes.addAll(history.reasonCodes());
                if (profile != null) codes.addAll(profile.reasonCodes());
                status = match(history, profile, codes);
            }
            result.add(new Suggestion(pack.getPackageId(), pack.getPackageName(), pack.getPackageType(),
                    pack.getDurationDays(), pack.getPrice(), roadmapGoal, profile, status,
                    eligible.canRegister(), List.copyOf(codes), eligible.reasons()));
        }
        String preferred = goal == null ? null : switch (goal) {
            case "FOUNDATION" -> "BASIC";
            case "IMPROVE_PERFORMANCE" -> "PERFORMANCE";
            default -> "RACING";
        };
        result.sort(Comparator.comparingInt((Suggestion s) -> STATUS_ORDER.indexOf(s.recommendationStatus()))
                .thenComparingInt(s -> Objects.equals(s.packageType(), preferred) ? 0 : 1)
                .thenComparingInt(Suggestion::durationDays).thenComparing(Suggestion::packageName)
                .thenComparing(Suggestion::packageId));
        return new Response(horseId, goal, "2.2", now, 30, history,
                List.of("R01_DURATION_FORMULA_NOT_APPLIED", "COMPLETED_IS_RECORDED_HISTORY_NOT_FITNESS_CERTIFICATION",
                        "SEVEN_START_WEEKDAYS_ANALYZED"), List.copyOf(result));
    }

    public static String match(TrainingReadinessService.Profile history,
            PackageDemandProfileService.Profile profile, Set<String> codes) {
        if (profile == null) { codes.add("ROADMAP_CONFIGURATION"); return "REVIEW_REQUIRED"; }
        if (!profile.reasonCodes().isEmpty()) return "REVIEW_REQUIRED";
        if (history.starter()) {
            if (profile.starter()) { codes.add("STARTER_OPTION"); return "RECOMMENDED"; }
            codes.add("NO_TRAINING_HISTORY"); return "REVIEW_REQUIRED";
        }
        if ("UNKNOWN".equals(history.observedStableIntensity()) || history.reasonCodes().contains("REASSESSMENT_NEEDED")) {
            codes.add("INSUFFICIENT_STABLE_HISTORY"); return "REVIEW_REQUIRED";
        }
        if (history.reasonCodes().contains("INCOMPLETE_HISTORY")) return "REVIEW_REQUIRED";
        if (!history.durationComplete()) { codes.add("ACTUAL_DURATION_MISSING"); return "REVIEW_REQUIRED"; }
        if (PackageDemandProfileService.rank(profile.entryIntensity()) > PackageDemandProfileService.rank(history.observedStableIntensity())) {
            codes.add("ENTRY_INTENSITY_EXCEEDS_HISTORY"); return "REVIEW_REQUIRED";
        }
        if (profile.firstWeekSessionsMax() > history.weeklySessions()
                || profile.firstWeekMinutesMax() > history.weeklyMinutes()
                || profile.firstWeekLongestSession() > history.longestSession()) {
            codes.add("ENTRY_WORKLOAD_EXCEEDS_HISTORY"); return "REVIEW_REQUIRED";
        }
        codes.add("HISTORY_AND_WORKLOAD_MATCH"); return "RECOMMENDED";
    }
}
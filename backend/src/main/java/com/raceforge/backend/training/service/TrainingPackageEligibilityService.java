package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Read-only eligibility shared by suggestions and the locked registration transaction. */
@Service
public class TrainingPackageEligibilityService {
    public record Reason(String code, String message) {}
    public record Result(boolean canRegister, List<Reason> reasons) {}

    private final TrainingWorkflowGuard guard;
    private final HorsePackageRepository registrations;
    private final HealthProfileRepository profiles;
    private final MedicalRecordRepository records;
    private final TrainingLockRepository locks;
    private final PackageRoadmapTemplateService roadmaps;

    public TrainingPackageEligibilityService(TrainingWorkflowGuard guard,
            HorsePackageRepository registrations, HealthProfileRepository profiles,
            MedicalRecordRepository records, TrainingLockRepository locks,
            PackageRoadmapTemplateService roadmaps) {
        this.guard = guard;
        this.registrations = registrations;
        this.profiles = profiles;
        this.records = records;
        this.locks = locks;
        this.roadmaps = roadmaps;
    }

    public Result evaluate(Horse horse, TrainingPackage pack, LocalDate today) {
        List<Reason> reasons = new ArrayList<>();
        if (!"APPROVED".equalsIgnoreCase(horse.getAdmissionStatus()))
            reasons.add(new Reason("ADMISSION_REQUIRED", "Horse admission must be APPROVED"));
        if (!"ACTIVE".equals(horse.getStatus()))
            reasons.add(new Reason("HORSE_INACTIVE", "Horse must be active"));
        if (!"ACTIVE".equals(pack.getStatus()))
            reasons.add(new Reason("PACKAGE_INACTIVE", "Package is not active"));
        check(reasons, "ROADMAP_CONFIGURATION", () -> {
            if (pack.getDurationDays() == null || pack.getDurationDays() < 1)
                throw new BusinessRuleException("Package duration is not configured");
            roadmaps.validate(roadmaps.read(pack.getPackageId()), pack.getDurationDays());
        });

        var profile = profiles.findByHorse_HorseId(horse.getHorseId());
        boolean initial = profile.isPresent() && records
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.get().getProfileId())
                .stream().anyMatch(r -> "INITIAL".equalsIgnoreCase(r.getExamType())
                        && "CONFIRMED".equalsIgnoreCase(r.getStatus()));
        if (!initial) reasons.add(new Reason("INITIAL_EXAM_REQUIRED", "A confirmed INITIAL examination is required"));

        var history = registrations.findByHorseIdOrderByRegisteredAtDesc(horse.getHorseId());
        // GET does not run expiry or write registration state. POST runs expiry under its horse lock.
        if (history.stream().anyMatch(p -> Set.of("PENDING", "ACTIVE", "PAUSED").contains(p.getStatus())
                && !("ACTIVE".equals(p.getStatus()) && p.getEndDate() != null && p.getEndDate().isBefore(today))))
            reasons.add(new Reason("EXISTING_PACKAGE", "Horse already has a pending or ongoing package"));

        if ("RECOVERY".equalsIgnoreCase(pack.getPackageType())) {
            reasons.add(new Reason("RECOVERY_RETIRED", "Recovery registration is no longer offered"));
        } else {
            check(reasons, "MEDICAL_NOT_AUTHORIZED", () -> guard.requireHealthy(horse));
            if ("RACING".equals(pack.getPackageType()))
                check(reasons, "RACING_REQUIREMENTS", () -> guard.requireRacingEligible(horse));
        }
        return new Result(reasons.isEmpty(), List.copyOf(reasons));
    }

    public void requireEligible(Horse horse, TrainingPackage pack, LocalDate today) {
        var result = evaluate(horse, pack, today);
        if (!result.canRegister()) throw new BusinessRuleException(result.reasons().get(0).message());
    }

    private void check(List<Reason> reasons, String code, Runnable check) {
        try { check.run(); }
        catch (BusinessRuleException ex) { reasons.add(new Reason(code, ex.getMessage())); }
        // Database and other technical errors intentionally propagate.
    }
}
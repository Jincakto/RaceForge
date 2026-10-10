package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;

import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PackageResumptionService {

    private final HorseRepository horseRepository;
    private final HorsePackageRepository horsePackageRepository;
    private final HorsePackageMapper mapper;
    private final EntityManager entityManager;  
    private final PackageEventService packageEventService;

    public PackageResumptionService(
            HorseRepository horseRepository,
            HorsePackageRepository horsePackageRepository,
            HorsePackageMapper mapper,
            EntityManager entityManager,
            PackageEventService packageEventService
    ) {
        this.horseRepository = horseRepository;
        this.horsePackageRepository = horsePackageRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;    
        this.packageEventService = packageEventService;
    }


    @Transactional
    public HorsePackageResponse resumeOriginalPackage(String recoveryRegistrationId, String reason) {
        HorsePackage recovery = horsePackageRepository.findById(recoveryRegistrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Recovery registration not found"));

        Horse horse = horseRepository.findById(recovery.getHorse().getHorseId())
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        entityManager.lock(recovery, LockModeType.PESSIMISTIC_WRITE);

        if (Boolean.TRUE.equals(horse.getTrainingLocked())) {
            throw new BusinessRuleException("Veterinarian must unlock training before resumption");
        }
        if (!"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException("Horse health status must be READY");
        }
        if (!"RECOVERY".equalsIgnoreCase(recovery.getTrainingPackage().getPackageType())
                || !"ACTIVE".equals(recovery.getStatus())
                || !"PAID".equals(recovery.getPaymentStatus())) {
            throw new BusinessRuleException("Recovery registration must be active and paid");
        }

        HorsePackage original = recovery.getReplacedHorsePackage();
        if (original == null) {
            throw new BusinessRuleException("This is a first-time recovery package; no original package to resume");
        }
        entityManager.lock(original, LockModeType.PESSIMISTIC_WRITE);
        if (!horse.getHorseId().equals(original.getHorse().getHorseId())) {
            throw new BusinessRuleException("Original package belongs to another horse");
        }
        if (!"PAUSED".equals(original.getStatus())
                || !"PAID".equals(original.getPaymentStatus())) {
            throw new BusinessRuleException("Original package is not a paid, paused package");
        }
        if ("RECOVERY".equalsIgnoreCase(original.getTrainingPackage().getPackageType())) {
            throw new BusinessRuleException("Original package cannot be a recovery package");
        }
        Integer remaining = original.getRemainingDays();
        if (remaining == null || remaining <= 0) {
            throw new BusinessRuleException("Original package has no preserved days to resume");
        }

        List<HorsePackage> active = horsePackageRepository.findByHorse_HorseIdAndStatus(
                horse.getHorseId(), "ACTIVE");
        if (active.size() != 1 || !active.get(0).getHorsePackageId()
                .equals(recovery.getHorsePackageId())) {
            throw new BusinessRuleException("Unexpected active package; cannot safely resume");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException("CM confirmation reason is required");
        }

        LocalDate today = LocalDate.now();

        original.setStartDate(today);
        original.setEndDate(today.plusDays(remaining - 1L));
        original.setStatus("ACTIVE");
        original.setPausedAt(null);
        original.setPauseReason(null);

        recovery.setStatus("COMPLETED");

        horsePackageRepository.save(recovery);
        HorsePackage saved = horsePackageRepository.saveAndFlush(original);
        packageEventService.record(null, horse.getHorseId(), saved.getHorsePackageId(),
                "ORIGINAL_PACKAGE_RESUMED", reason);
        packageEventService.notifyOwner(horse.getOwner().getUserId(), horse.getHorseId(),
                "PACKAGE_RESUMED", "Original training package resumed with "
                        + remaining + " preserved days.");
        return mapper.toResponse(saved);
    }
}

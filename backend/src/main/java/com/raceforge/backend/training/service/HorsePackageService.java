package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.training.dto.HorsePackageRegisterRequest;
import com.raceforge.backend.training.dto.HorsePackageResponse;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class HorsePackageService {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator;

    private final HorseRepository horseRepository;
    private final TrainingPackageRepository trainingPackageRepository;
    private final HorsePackageRepository horsePackageRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final HorsePackageMapper mapper;
    private final EntityManager entityManager;
    private final PackageEventService packageEventService;
    private final TrainingPackageExpirationService expirationService;

    public HorsePackageService(
            HorseRepository horseRepository,
            TrainingPackageRepository trainingPackageRepository,
            HorsePackageRepository horsePackageRepository,
            HealthProfileRepository healthProfileRepository,
            MedicalRecordRepository medicalRecordRepository,
            HorsePackageMapper mapper,
            EntityManager entityManager,
            PackageEventService packageEventService,
            TrainingPackageExpirationService expirationService,
            com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator) {
        this.idAllocator = idAllocator;
        this.horseRepository = horseRepository;
        this.trainingPackageRepository = trainingPackageRepository;
        this.horsePackageRepository = horsePackageRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.mapper = mapper;
        this.entityManager = entityManager;
        this.packageEventService = packageEventService;
        this.expirationService = expirationService;
    }

    @Transactional
    public HorsePackageResponse register(HorsePackageRegisterRequest request, String ownerId) {
        requireOwnerId(ownerId);

      Horse horse = horseRepository.findById(request.horseId())
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + request.horseId()));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        checkOwnership(horse, ownerId);
        requireApprovedAdmission(horse);
        expirationService.expireForLockedHorse(horse, LocalDate.now());

        TrainingPackage trainingPackage = trainingPackageRepository.findById(request.packageId())
                .orElseThrow(() -> new ResourceNotFoundException("Training package not found: " + request.packageId()));
        if (!"ACTIVE".equals(trainingPackage.getStatus())) {
            throw new BusinessRuleException("This training package is not available");
        }

        HealthProfile profile = healthProfileRepository.findByHorse_HorseId(horse.getHorseId())
                .orElseThrow(() -> new BusinessRuleException("Initial medical examination is required"));
        boolean initialConfirmed = medicalRecordRepository
                .findByHealthProfile_ProfileIdOrderByExaminedAtDesc(profile.getProfileId())
                .stream().anyMatch(this::isConfirmedInitial);
        if (!initialConfirmed) {
            throw new BusinessRuleException("A confirmed INITIAL examination is required before registration");
        }

        boolean recovery = "RECOVERY".equals(trainingPackage.getPackageType());
        boolean locked = Boolean.TRUE.equals(horse.getTrainingLocked());
        if (locked && !recovery) {
            throw new BusinessRuleException("Training is locked: only a veterinarian-authorized recovery package is allowed");
        }
        if (horsePackageRepository.existsByHorse_HorseIdAndStatusIn(
                horse.getHorseId(), List.of("PENDING", "ACTIVE", "PAUSED"))) {
            throw new BusinessRuleException("Horse already has a pending or ongoing package");
        }
        if (recovery) {
            // First-time injury before ordinary training: Owner buys Recovery.
            // CM's center-funded route is ONLY used if an ordinary package was
            // ACTIVE when Training Lock began and is now PAUSED.
            if (!locked || !"NOT_FIT".equalsIgnoreCase(horse.getHealthStatus())) {
                throw new BusinessRuleException(
                        "Owner-paid Recovery requires a confirmed NOT_FIT Training Lock");
            }
            boolean hasOrdinaryHistory = horsePackageRepository
                    .findByHorseIdOrderByRegisteredAtDesc(horse.getHorseId())
                    .stream()
                    .anyMatch(p -> !"RECOVERY".equalsIgnoreCase(
                            p.getTrainingPackage().getPackageType()));
            if (hasOrdinaryHistory) {
                throw new BusinessRuleException(
                        "Owner-paid Recovery is only available before the first ordinary training package; "
                        + "contact Club Manager for an in-training injury");
            }
        } else if (!"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException(
                    "Horse must have READY health status to register a normal package");
        }

        HorsePackage registration = new HorsePackage();
        registration.setHorsePackageId(idAllocator.next("HPG"));
        registration.setHorse(horse);
        registration.setTrainingPackage(trainingPackage);
        registration.setTotalPrice(trainingPackage.getPrice());
        registration.setStatus("PENDING");
        registration.setPaymentStatus("PENDING");
        HorsePackage saved = horsePackageRepository.saveAndFlush(registration);
        packageEventService.record(ownerId, horse.getHorseId(), saved.getHorsePackageId(),
                recovery ? "RECOVERY_OWNER_REGISTERED" : "NORMAL_PACKAGE_REGISTERED",
                recovery ? "First-time Owner-paid Recovery awaiting payment"
                        : "Normal training package registration pending payment");
        packageEventService.notifyOwner(ownerId, horse.getHorseId(),
                recovery ? "RECOVERY_OWNER_REGISTERED" : "NORMAL_PACKAGE_REGISTERED",
                recovery ? "Your Recovery package is awaiting simulated payment."
                        : "Training package registration is awaiting payment.");
        return mapper.toResponse(saved);
    }

    @Transactional
    public HorsePackageResponse simulatePayment(String registrationId, boolean successful, String ownerId) {
        requireOwnerId(ownerId);

        HorsePackage registration = horsePackageRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found: " + registrationId));
        Horse horse = horseRepository.findById(registration.getHorse().getHorseId())
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found"));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        entityManager.lock(registration, LockModeType.PESSIMISTIC_WRITE);
        checkOwnership(horse, ownerId);
        requireApprovedAdmission(horse);
        expirationService.expireForLockedHorse(horse, LocalDate.now());
        if ("RECOVERY".equalsIgnoreCase(registration.getTrainingPackage().getPackageType())) {
            throw new BusinessRuleException("Use /simulate-recovery-payment for Owner-paid Recovery; center-funded Recovery needs no payment");
        }

        if (!"PENDING".equals(registration.getStatus()) || !"PENDING".equals(registration.getPaymentStatus())) {
            throw new BusinessRuleException("This registration is not awaiting payment");
        }
        if (!successful) {
            registration.setPaymentStatus("FAILED");
            registration.setStatus("CANCELLED");
            HorsePackage failed = horsePackageRepository.saveAndFlush(registration);
            packageEventService.record(ownerId, horse.getHorseId(), failed.getHorsePackageId(),
                    "NORMAL_PACKAGE_PAYMENT_FAILED", "Simulated payment failed");
            packageEventService.notifyOwner(ownerId, horse.getHorseId(),
                    "NORMAL_PACKAGE_PAYMENT_FAILED", "Training package payment failed.");
            return mapper.toResponse(failed);
        }

        if (Boolean.TRUE.equals(horse.getTrainingLocked()) || !"READY".equalsIgnoreCase(horse.getHealthStatus())) {
            throw new BusinessRuleException("Horse is no longer eligible for normal training");
        }
        if (!"ACTIVE".equals(registration.getTrainingPackage().getStatus())) {
            throw new BusinessRuleException("Training package is no longer available");
        }
        if (horsePackageRepository.existsByHorse_HorseIdAndStatusIn(
                horse.getHorseId(), List.of("ACTIVE", "PAUSED"))) {
            throw new BusinessRuleException("Horse already has an active or paused package");
        }

        LocalDate today = LocalDate.now();
        int days = registration.getTrainingPackage().getDurationDays();
        registration.setPaymentStatus("PAID");
        registration.setPaidAt(LocalDateTime.now());
        registration.setStatus("ACTIVE");
        registration.setStartDate(today);
        registration.setEndDate(today.plusDays(days - 1L));
        registration.setRemainingDays(days);
        HorsePackage saved = horsePackageRepository.saveAndFlush(registration);
        packageEventService.record(ownerId, horse.getHorseId(), saved.getHorsePackageId(),
                "NORMAL_PACKAGE_ACTIVATED", "Simulated payment successful");
        packageEventService.notifyOwner(ownerId, horse.getHorseId(),
                "NORMAL_PACKAGE_ACTIVATED", "Training package payment successful; package is active.");
        return mapper.toResponse(saved);
    }

    @Transactional
    public List<HorsePackageResponse> history(String horseId, String ownerId) {
        requireOwnerId(ownerId);
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));
        checkOwnership(horse, ownerId);
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        expirationService.expireForLockedHorse(horse, LocalDate.now());
        return horsePackageRepository.findByHorse_HorseIdOrderByRegisteredAtDesc(horseId)
                .stream().map(mapper::toResponse).toList();
    }

    /** CM needs the full package history to review PAUSED, Recovery and resumption. */
    @Transactional
    public List<HorsePackageResponse> historyForManager(String horseId) {
        Horse horse = horseRepository.findById(horseId)
                .orElseThrow(() -> new ResourceNotFoundException("Horse not found: " + horseId));
        entityManager.lock(horse, LockModeType.PESSIMISTIC_WRITE);
        expirationService.expireForLockedHorse(horse, LocalDate.now());
        return horsePackageRepository.findByHorse_HorseIdOrderByRegisteredAtDesc(horseId)
                .stream().map(mapper::toResponse).toList();
    }

    private void requireApprovedAdmission(Horse horse) {
        if (!"APPROVED".equalsIgnoreCase(horse.getAdmissionStatus())) {
            throw new BusinessRuleException("Horse admission must be APPROVED before training package registration");
        }
    }

    private boolean isConfirmedInitial(MedicalRecord record) {
        return "INITIAL".equalsIgnoreCase(record.getExamType())
                && "CONFIRMED".equalsIgnoreCase(record.getStatus());
    }

    private void checkOwnership(Horse horse, String ownerId) {
        if (horse.getOwner() == null || !ownerId.equals(horse.getOwner().getUserId())) {
            throw new BusinessRuleException("You are not the owner of this horse");
        }
    }

    private void requireOwnerId(String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new BusinessRuleException("Authenticated Horse Owner is required");
        }
    }


}
